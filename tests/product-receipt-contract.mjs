import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { reviewAndIssueProductReceipt, verifyProductReceipt, RECEIPT_RULE, TTL_MS, MAX_BYTES } = require('../cloudfunctions/meizhaung-sync/productReceipt');
const { issueProcessingIdentity, TTL_MS: SESSION_TTL } = require('../cloudfunctions/meizhaung-sync/processingIdentity');
const { resetTokenCache } = require('../cloudfunctions/meizhaung-sync/wxsec');
const { USER_URL } = require('../cloudfunctions/meizhaung-sync/productReview');
const secret = 'synthetic-processing-secret-0000000001', receiptSecret = 'synthetic-independent-receipt-key-0001';
const now = 1800000000000, openid = 'o'+'x'.repeat(27), owner = 'wx:'+openid;
const row = () => ({product_id:'synthetic-one',brand:'合成品牌',model:'合成型号',category:'精华',ingredient_ids:['synthetic-reference'],notes:'合成备注'});
const response = (data,status=200) => ({ok:status===200,status,json:async()=>data});
function fixture() {
  resetTokenCache(); const calls=[];
  const fetchImpl = async (url,options) => {
    calls.push({url:String(url),options});
    if(url===USER_URL)return response({sub:owner});
    if(String(url).includes('stable_token'))return response({access_token:'synthetic-provider',expires_in:7200});
    return response({errcode:0,result:{suggest:'pass'}});
  };
  const params={rows:[row()],expectedVersions:[0],platformToken:'synthetic-platform-token',processingToken:issueProcessingIdentity(openid,secret,now).processingToken,
    publishableKey:'wbpk_t1U4NdF6I0IZdm8LzoMLq6_synthetic',secret,receiptSecret,now,clock:()=>now,fetchImpl};
  return {calls,params};
}
const verify = receipt => verifyProductReceipt({receipt,receiptSecret,owner,now});
const signedPacket = packet => {const payload=JSON.stringify(packet);return {payload,signature:crypto.createHmac('sha256',receiptSecret).update(RECEIPT_RULE+'|','utf8').update(payload,'utf8').digest('hex')};};

test('issued receipt binds exact reviewed content, owner, app, database and expected versions; no secrets leave service',async()=>{
 const f=fixture(), receipt=await reviewAndIssueProductReceipt(f.params), packet=verify(receipt);
 assert.ok(packet);assert.equal(packet.owner,owner);assert.equal(packet.applicationId,'wbapp_t1U4NdF6I0IZdm8LzoMLq6');assert.equal(packet.database,'postgres-lgjvhh7s');assert.equal(packet.action,'owned.products.upsert');
 assert.deepEqual(packet.rows,[row()]);assert.deepEqual(packet.expectedVersions,[0]);assert.equal(packet.expiresAt,now+TTL_MS);
 assert.ok(Object.isFrozen(receipt)&&Object.isFrozen(packet.rows[0].ingredient_ids)&&Object.isFrozen(packet.expectedVersions));
 const review=f.calls.find(c=>c.url.includes('msg_sec_check'));assert.equal(JSON.parse(review.options.body).content,'synthetic-one\n合成品牌\n合成型号\n精华\nsynthetic-reference\n合成备注');
 for(const value of [secret,receiptSecret,f.params.platformToken,f.params.processingToken,'synthetic-provider'])assert.equal(JSON.stringify(receipt).includes(value),false);
 assert.equal(receipt.signature,crypto.createHmac('sha256',receiptSecret).update(RECEIPT_RULE+'|'+receipt.payload,'utf8').digest('hex'));
});

test('input changed during remote identity verification cannot change receipt or version',async()=>{
 const f=fixture(), original=f.params.fetchImpl;
 f.params.fetchImpl=async(url,opts)=>{if(url===USER_URL){f.params.rows[0].notes='后来未审核备注';f.params.rows[0].ingredient_ids.push('injected');f.params.expectedVersions[0]=99;}return original(url,opts);};
 const packet=verify(await reviewAndIssueProductReceipt(f.params));assert.deepEqual(packet.rows,[row()]);assert.deepEqual(packet.expectedVersions,[0]);
});

test('missing/reused receipt key and invalid expected versions make zero remote calls',async()=>{
 for(const patch of [{receiptSecret:''},{receiptSecret:secret},{expectedVersions:[]},{expectedVersions:[-1]},{expectedVersions:[0.5]},{expectedVersions:[Number.MAX_SAFE_INTEGER+1]},{rows:[],expectedVersions:[]},{now:NaN}]) {
  const f=fixture();await assert.rejects(reviewAndIssueProductReceipt({...f.params,...patch}));assert.equal(f.calls.length,0);
 }
});

test('aggregate receipt size rejected before spending any identity or review requests',async()=>{
 const f=fixture(), rows=Array.from({length:50},(_,i)=>({...row(),product_id:'row-'+i,notes:'甲'.repeat(7500)}));
 await assert.rejects(reviewAndIssueProductReceipt({...f.params,rows,expectedVersions:rows.map(()=>0)}),e=>e.code==='PRODUCT_PAYLOAD_TOO_LARGE');assert.equal(f.calls.length,0);
});

test('different owner, anonymous or revoked platform identity never yields receipt or content call',async()=>{
 for(const body of [{sub:'wx:'+'y'.repeat(28)},{sub:owner,is_anonymous:true},null]){
  const f=fixture();let calls=0;
  await assert.rejects(reviewAndIssueProductReceipt({...f.params,fetchImpl:async()=>{calls++;return body===null?response({},401):response(body);}}));assert.equal(calls,1);
 }
});

test('risky, pending or review outage never yields receipt; no automatic retry',async()=>{
 for(const body of [{errcode:0,result:{suggest:'risky'}},{errcode:0,result:{suggest:'review'}},{errcode:45011}]){
  const f=fixture(), original=f.params.fetchImpl;let reviews=0;
  await assert.rejects(reviewAndIssueProductReceipt({...f.params,fetchImpl:async(url,opts)=>{if(String(url).includes('msg_sec_check')){reviews++;return response(body);}return original(url,opts);}}));assert.equal(reviews,1);
 }
});

test('changing content or versions, even just payload whitespace, invalidates signature',async()=>{
 const f=fixture(), receipt=await reviewAndIssueProductReceipt(f.params);
 for(const payload of [receipt.payload.replace('合成备注','未审核修改'),receipt.payload.replace('"expectedVersions":[0]','"expectedVersions":[9]'),receipt.payload+' '])assert.equal(verify({...receipt,payload}),null);
 assert.equal(verify({...receipt,signature:'0'.repeat(64)}),null);assert.equal(verify({...receipt,signature:'short'}),null);
 assert.equal(verify({...receipt,extra:'not allowed'}),null);
 assert.equal(verifyProductReceipt({receipt,receiptSecret,owner:'wx:'+'y'.repeat(28),now}),null);
 assert.equal(verifyProductReceipt({receipt,receiptSecret:'wrong-secret-00000000000000000000',owner,now}),null);
});

test('correctly signed wrong context or malformed version still rejected by recipient',async()=>{
 const packet=JSON.parse((await reviewAndIssueProductReceipt(fixture().params)).payload);
 for(const patch of [{applicationId:'other-app'},{database:'other-db'},{action:'delete'},{reviewRule:'old-rule'},{v:2},{expectedVersions:[-1]},{rows:[]},{extra:'bad'},{nonce:'short'},{expiresAt:now+TTL_MS+1}])assert.equal(verify(signedPacket({...packet,...patch})),null);
});

test('expiry bounded by processing session; expired/future/noninteger clocks cannot authorize',async()=>{
 const f=fixture(), issuedAt=now;
 // Session is already near expiry; the review itself stays within its new 45s deadline.
 f.params.processingToken=issueProcessingIdentity(openid,secret,now-SESSION_TTL+1000).processingToken;
 const receipt=await reviewAndIssueProductReceipt({...f.params,clock:()=>issuedAt});
 assert.equal(verifyProductReceipt({receipt,receiptSecret,owner,now:issuedAt}).expiresAt,now+1000);
 assert.equal(verifyProductReceipt({receipt,receiptSecret,owner,now:now+1000}),null);
 assert.equal(verifyProductReceipt({receipt,receiptSecret,owner,now:now-1}),null);
 assert.equal(verifyProductReceipt({receipt,receiptSecret,owner,now:NaN}),null);
 for(const clock of [()=>now+SESSION_TTL,()=>now-1,()=>Infinity])await assert.rejects(reviewAndIssueProductReceipt({...fixture().params,clock}));
});

test('verification bounds attacker payload before parsing and tolerates malformed envelopes without crash',()=>{
 for(const receipt of [null,[],{}, {payload:'x'.repeat(MAX_BYTES+1),signature:'a'.repeat(64)}, {payload:'{',signature:'a'.repeat(64)}, {payload:3,signature:'a'.repeat(64)}])assert.equal(verify(receipt),null);
});

test('separate reviewed operations have distinct nonces; verification alone explicitly does not consume writes',async()=>{
 const one=await reviewAndIssueProductReceipt(fixture().params), two=await reviewAndIssueProductReceipt(fixture().params);
 assert.notEqual(verify(one).nonce,verify(two).nonce);assert.ok(verify(one));assert.ok(verify(one));
 // PostgreSQL consumes and persists operations; this local verifier only checks signatures.
});
