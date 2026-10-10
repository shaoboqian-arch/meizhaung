import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../cloudfunctions/meizhaung-sync');
const { issueProcessingIdentity, verifyProcessingIdentity, TTL_MS } = require(path.join(root, 'processingIdentity.js'));
const wxsec = require(path.join(root, 'wxsec.js'));
const SECRET = 'synthetic-processing-secret-123456789';
const OPENID = 'o' + 'x'.repeat(27);
const IMAGE='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1kAAAAASUVORK5CYII=';
const envKeys=['PROCESSING_BUDGET_RULE','OCR_PROJECT_DAILY_LIMIT','OCR_PROJECT_MONTHLY_LIMIT'];
const envBefore=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
Object.assign(process.env,{PROCESSING_BUDGET_RULE:'processing-budget-v1',OCR_PROJECT_DAILY_LIMIT:'200',OCR_PROJECT_MONTHLY_LIMIT:'300'});
after(()=>{for(const k of envKeys){if(envBefore[k]===undefined)delete process.env[k];else process.env[k]=envBefore[k];}});
function databaseFixture(){
 let docs=new Map(),tail=Promise.resolve(),fault=null;
 return {collection:()=>({}),rows:()=>structuredClone([...docs.values()]),fail:e=>{fault=e;},runTransaction(callback){const result=tail.then(async()=>{const next=new Map([...docs].map(([k,v])=>[k,structuredClone(v)]));
 const tx={collection:()=>({doc:id=>({get:async()=>{if(fault)throw fault;return {data:next.get(id)||null};},set:async value=>{next.set(id,structuredClone(value));}})})};
 const result=await callback(tx);docs=next;return result;});tail=result.catch(()=>{});return result;}};
}


test('处理凭证有到期和用途约束：伪造、损坏、错密钥和超期均拒绝', () => {
  const now = 1_700_000_000_000;
  const issued = issueProcessingIdentity(OPENID, SECRET, now);
  assert.deepEqual(verifyProcessingIdentity(issued.processingToken, SECRET, now), { openid: OPENID, expiresAt: now + TTL_MS });
  for (const token of ['', OPENID, issued.processingToken.replace('wxc_', 'qsb_'), issued.processingToken + 'x', 'wxc_x.' + 'a'.repeat(64)]) assert.equal(verifyProcessingIdentity(token, SECRET, now), null);
  assert.equal(verifyProcessingIdentity(issued.processingToken, 'another-private-key', now), null);
  assert.equal(verifyProcessingIdentity(issued.processingToken, SECRET, now + TTL_MS), null);
  assert.equal(verifyProcessingIdentity(issued.processingToken, SECRET, now - 1), null);
  assert.ok(!issued.processingToken.includes(SECRET));
  assert.throws(() => issueProcessingIdentity('fake-openid', SECRET, now));
});

function loadServer(db=databaseFixture()) {
  let providerCalls = 0, ocrCalls = 0, ocrError=null;
  let verdict = { errcode: 0, result: { suggest: 'pass' } };
  const filename = path.join(root, 'index.js');
  const local = createRequire(filename);
  const module = new Module(filename); module.filename = filename; module.paths = Module._nodeModulePaths(root);
  module.require = name => {
    if (name === '@cloudbase/node-sdk') return { init: () => ({ database: () => db }) };
    if (name === 'express' && process.env.BEAUTY_HTTP_TEST_DEPS) return createRequire(path.join(process.env.BEAUTY_HTTP_TEST_DEPS, 'package.json'))('express');
    if (name === './wxsec') return { ...wxsec, resolveWxSecret: () => SECRET, codeToSession: async () => ({ openid: OPENID }), msgSecCheck: async () => { providerCalls++; if (verdict instanceof Error) throw verdict; return verdict; } };
    if (name === './ocr') return { resolveOcrCredentials: () => ({}), friendlyOcrError: () => 'OCR unavailable', callGeneralBasicOcr: async () => { ocrCalls++; if(ocrError)throw ocrError; return { text: '合成识别结果', itemCount: 1 }; } };
    return local(name);
  };
  module._compile(fs.readFileSync(filename, 'utf8'), filename);
  return { app: module.exports.main, get calls() { return { providerCalls, ocrCalls }; }, setVerdict: value => { verdict = value; }, setOcrError:value=>{ocrError=value;} };
}
test('实际 HTTP 路由：客户端自报 openid 无权调用；审核故障为待处理；OCR 按真实调用者限流', async () => {
  const fixture = loadServer(); const server = fixture.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const post = (route, data, headers = {}) => fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await post('/sec-check', { content: '合成产品' }, { 'X-WX-Openid': OPENID })).status, 401);
    assert.equal((await post('/ocr', { imageBase64: IMAGE })).status, 401);
    assert.deepEqual(fixture.calls, { providerCalls: 0, ocrCalls: 0 });
    const exchange = await post('/wechat/session', { code: 'synthetic-wechat-code' });
    const identity = await exchange.json(); assert.equal(exchange.status, 200); assert.ok(identity.processingToken); assert.equal(identity.session_key, undefined);
    const header = { Authorization: 'Bearer ' + identity.processingToken };
    assert.equal((await post('/sec-check', { content: '合成产品' }, header)).status, 200);
    for (const value of [{ errcode: -1 }, { errcode: 0 }, { errcode: 0, result: { suggest: 'review' } }, new Error('provider unavailable')]) {
      fixture.setVerdict(value); const response = await post('/sec-check', { content: '合成产品' }, header);
      assert.equal(response.status, 503); assert.deepEqual(await response.json(), { ok: false, pending: true, error: '内容校验暂未完成，草稿已保留，请稍后重试。' });
    }
    fixture.setVerdict({ errcode: 0, result: { suggest: 'risky' } }); assert.equal((await post('/sec-check', { content: '合成产品' }, header)).status, 400);
    for (let i = 0; i < 12; i++) assert.equal((await post('/ocr', { imageBase64: IMAGE }, { ...header, 'X-Forwarded-For': '192.0.2.' + i })).status, 200);
    const renewed = await (await post('/wechat/session', { code: 'synthetic-another-code' })).json();
    assert.equal((await post('/ocr', { imageBase64: IMAGE }, { Authorization: 'Bearer ' + renewed.processingToken, 'X-Forwarded-For': '192.0.2.99' })).status, 429);
    assert.equal(fixture.calls.ocrCalls, 12);
  } finally { await new Promise(resolve => server.close(resolve)); }
});


test('two OCR instances share project quota; invalid images, read failures and missing limits make no paid call',async()=>{
 const db=databaseFixture(),one=loadServer(db),two=loadServer(db),servers=[];
 const daily=process.env.OCR_PROJECT_DAILY_LIMIT,monthly=process.env.OCR_PROJECT_MONTHLY_LIMIT;
 process.env.OCR_PROJECT_DAILY_LIMIT='2';process.env.OCR_PROJECT_MONTHLY_LIMIT='2';
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+issueProcessingIdentity(OPENID,SECRET).processingToken};
 const start=async app=>{const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));servers.push(server);return 'http://127.0.0.1:'+server.address().port;};
 const post=(url,imageBase64=IMAGE)=>fetch(url+'/ocr',{method:'POST',headers,body:JSON.stringify({imageBase64})});
 try{
  const a=await start(one.app),b=await start(two.app);
  for(const invalid of ['*'.repeat(100),'a'.repeat(100)]) assert.ok([400,415].includes((await post(a,invalid)).status));
  assert.equal(db.rows().length,0);assert.equal(one.calls.ocrCalls,0);
  const replies=await Promise.all([post(a),post(b),post(a),post(b)]);
  assert.equal(replies.filter(r=>r.status===200).length,2);assert.equal(replies.filter(r=>r.status===429).length,2);
  assert.equal(one.calls.ocrCalls+two.calls.ocrCalls,2);assert.equal(db.rows().find(r=>r.month).monthlyCount,2);
  const restarted=loadServer(db);const url=await start(restarted.app);assert.equal((await post(url)).status,429);assert.equal(restarted.calls.ocrCalls,0);
  const frozen=db.rows();db.fail(new Error('network down'));assert.equal((await post(url)).status,503);db.fail(null);assert.deepEqual(db.rows(),frozen);
  delete process.env.OCR_PROJECT_DAILY_LIMIT;assert.equal((await post(url)).status,503);assert.equal(restarted.calls.ocrCalls,0);
 }finally{process.env.OCR_PROJECT_DAILY_LIMIT=daily;process.env.OCR_PROJECT_MONTHLY_LIMIT=monthly;await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
});
test('an OCR timeout retains the charged reservation; an explicit retry cannot exceed the cap',async()=>{
 const db=databaseFixture(),fixture=loadServer(db);fixture.setOcrError(new Error('OCR_TIMEOUT'));
 const daily=process.env.OCR_PROJECT_DAILY_LIMIT,monthly=process.env.OCR_PROJECT_MONTHLY_LIMIT;process.env.OCR_PROJECT_DAILY_LIMIT='1';process.env.OCR_PROJECT_MONTHLY_LIMIT='1';
 const server=fixture.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const post=()=>fetch('http://127.0.0.1:'+server.address().port+'/ocr',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+issueProcessingIdentity(OPENID,SECRET).processingToken},body:JSON.stringify({imageBase64:IMAGE})});
 try{assert.equal((await post()).status,504);assert.equal(db.rows().find(r=>r.month).monthlyCount,1);assert.equal((await post()).status,429);assert.equal(fixture.calls.ocrCalls,1);}
 finally{process.env.OCR_PROJECT_DAILY_LIMIT=daily;process.env.OCR_PROJECT_MONTHLY_LIMIT=monthly;await new Promise(r=>server.close(r));}
});
