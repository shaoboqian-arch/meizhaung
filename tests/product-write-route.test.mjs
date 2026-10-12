import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createProductReceiptHandler}=require('../cloudfunctions/meizhaung-sync/productWriteRoute');
const {issueProcessingIdentity}=require('../cloudfunctions/meizhaung-sync/processingIdentity');
const {verifyProductReceipt}=require('../cloudfunctions/meizhaung-sync/productReceipt');
const {reviewAndIssueProductReceipt}=require('../cloudfunctions/meizhaung-sync/productReceipt');
const {USER_URL}=require('../cloudfunctions/meizhaung-sync/productReview');
const {resetTokenCache}=require('../cloudfunctions/meizhaung-sync/wxsec');
const now=Date.now(),wxSecret='synthetic-wechat-server-secret-00001',receiptSecret='synthetic-independent-review-secret-0001',openid='o'+'x'.repeat(27),owner='wx:'+openid;
const row={product_id:'synthetic',brand:'测试',model:'合成',category:'精华',ingredient_ids:[],notes:null};
function fixture({decision={errcode:0,result:{suggest:'pass'}},identity={sub:owner},config={wxSecret,receiptSecret,publishableKey:'wbpk_t1U4NdF6I0IZdm8LzoMLq6_synthetic'}}={}){
 resetTokenCache();const requests=[];
 const handle=createProductReceiptHandler({configuration:()=>config,clock:()=>now,fetchImpl:async(url,opts)=>{requests.push({url,opts});return {ok:true,status:200,json:async()=>url===USER_URL?identity:String(url).includes('stable_token')?{access_token:'synthetic',expires_in:7200}:decision};}});
 const req={body:{rows:[row],expectedVersions:[0]},get:name=>name==='authorization'?'Bearer '+issueProcessingIdentity(openid,wxSecret,now).processingToken:name==='x-wb-platform-session'?'synthetic-platform-token':''};
 const res={statusCode:200,body:null,status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
 return {handle,req,res,requests};
}
test('server endpoint signs reviewed exact fields only after both identities pass',async()=>{
 const f=fixture();await f.handle(f.req,f.res);assert.equal(f.res.statusCode,200);const verified=verifyProductReceipt({receipt:f.res.body.receipt,receiptSecret,owner,now});assert.deepEqual(verified.rows,[row]);
 assert.equal(JSON.stringify(f.res.body).includes('synthetic-platform-token'),false);assert.equal(JSON.stringify(f.res.body).includes(wxSecret),false);
});
test('mismatched platform owner and missing configuration never issue a receipt',async()=>{
 for(const options of [{identity:{sub:'wx:o'+'y'.repeat(27)}},{config:{}}]){const f=fixture(options);await f.handle(f.req,f.res);assert.ok([403,503].includes(f.res.statusCode));assert.equal(f.res.body.receipt,undefined);}
});
test('pending, risky, malformed and provider failures cannot return signed approval',async()=>{
 for(const decision of [{errcode:0,result:{suggest:'review'}},{errcode:0,result:{suggest:'risky'}},{errcode:-1},{errcode:0}]){const f=fixture({decision});await f.handle(f.req,f.res);assert.ok(f.res.statusCode>=400);assert.equal(f.res.body.receipt,undefined);}
});
test('caller owner/unknown body fields and invalid categories are rejected before any identity calls',async()=>{
 for(const altered of [{rows:[row],expectedVersions:[0],owner},{rows:[{...row,category:'任意字段'}],expectedVersions:[0]}]){const f=fixture();f.req.body=altered;await f.handle(f.req,f.res);assert.equal(f.res.statusCode,400);assert.equal(f.requests.length,0);}
});
test('a batch exceeding the review deadline cannot issue a late approval',async()=>{
 resetTokenCache();let time=now;
 await assert.rejects(()=>reviewAndIssueProductReceipt({rows:[row],expectedVersions:[0],platformToken:'synthetic-platform',processingToken:issueProcessingIdentity(openid,wxSecret,now).processingToken,publishableKey:'wbpk_t1U4NdF6I0IZdm8LzoMLq6_synthetic',secret:wxSecret,receiptSecret,now,clock:()=>time,
  fetchImpl:async url=>{const data=url===USER_URL?{sub:owner}:String(url).includes('stable_token')?{access_token:'synthetic',expires_in:7200}:{errcode:0,result:{suggest:'pass'}};if(url!==USER_URL&&!String(url).includes('stable_token'))time=now+45000;return {ok:true,status:200,json:async()=>data};}}),e=>e.status===503);
});
