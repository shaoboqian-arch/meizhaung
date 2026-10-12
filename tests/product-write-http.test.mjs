// Actual Express entrypoint over local HTTP. Provider calls and the unrelated
// NoSQL collection are isolated; no cloud or paid requests are made.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import Module from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const root=process.env.BEAUTY_BACKEND_ROOT||path.resolve('cloudfunctions/meizhaung-sync');
const {issueProcessingIdentity}=require(path.join(root,'processingIdentity.js'));
const {verifyProductReceipt}=require(path.join(root,'productReceipt.js'));
const {USER_URL}=require(path.join(root,'productReview.js'));
test('HTTP entrypoint enforces the registered review route, identity and CORS without touching NoSQL',async()=>{
  const variables={WECHAT_APPSECRET:'synthetic-wechat-secret-00000000001',BEAUTY_PRODUCT_RECEIPT_SECRET:'synthetic-separate-receipt-secret-00001',BEAUTY_WORKBUDDY_PUBLISHABLE_KEY:'wbpk_t1U4NdF6I0IZdm8LzoMLq6_synthetic'};
  const before=Object.fromEntries(Object.keys(variables).map(k=>[k,process.env[k]]));
  const realFetch=globalThis.fetch,realLoad=Module._load;
  const own='wx:o'+'x'.repeat(27),calls=[];
  let http;
  try {
    Object.assign(process.env,variables);
    globalThis.fetch=async(url)=>{
      calls.push(String(url));
      let data;
      if(url===USER_URL)data={sub:own};
      else if(String(url).includes('/cgi-bin/stable_token'))data={access_token:'synthetic-token',expires_in:7200};
      else if(String(url).includes('/wxa/msg_sec_check'))data={errcode:0,result:{suggest:'pass'}};
      else throw Error('Unexpected provider call');
      return new Response(JSON.stringify(data),{status:200});
    };
    Module._load=function(name,...args){
      if(name==='@cloudbase/node-sdk')return {init:()=>({database:()=>({collection:()=>new Proxy({},{get(){throw Error('NoSQL access outside this acceptance scope');}})})})};
      return realLoad.call(this,name,...args);
    };
    const app=require(path.join(root,'index.js')).main;
    Module._load=realLoad;globalThis.fetch=realFetch;
    http=await new Promise(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
    const url='http://127.0.0.1:'+http.address().port;
    const options=await realFetch(url+'/owned-products/review',{method:'OPTIONS',headers:{Origin:'https://shaoboqian-arch.github.io'},signal:AbortSignal.timeout(10000)});
    assert.equal(options.status,204);assert.match(options.headers.get('access-control-allow-headers'),/X-WB-Platform-Session/);
    const rows=[{product_id:'synthetic-http',brand:'合成',model:'合成',category:'精华',ingredient_ids:[],notes:null}];
    const send=headers=>realFetch(url+'/owned-products/review',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({rows,expectedVersions:[0]}),signal:AbortSignal.timeout(10000)});
    assert.equal((await send({})).status,401);assert.equal(calls.length,0);
    const now=Date.now();
    const processing=issueProcessingIdentity(own.slice(3),variables.WECHAT_APPSECRET,now).processingToken;
    const response=await send({Authorization:'Bearer '+processing,'X-WB-Platform-Session':'synthetic-platform'});
    assert.equal(response.status,200);
    const body=await response.json();assert.equal(body.ruleVersion,'beauty-owned-write-v1');
    const packet=verifyProductReceipt({receipt:body.receipt,receiptSecret:variables.BEAUTY_PRODUCT_RECEIPT_SECRET,owner:own,now:Date.now()});
    assert.ok(packet);
    assert.deepEqual(packet.rows,rows);assert.equal(calls.length,3);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(JSON.stringify(body).includes(variables.WECHAT_APPSECRET),false);
  } finally {
    Module._load=realLoad;globalThis.fetch=realFetch;
    for(const [key,value] of Object.entries(before)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
    if(http)await new Promise(resolve=>http.close(resolve));
  }
});
