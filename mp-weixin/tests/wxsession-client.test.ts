import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { checkContentBeforeSave, parseSecCheckResponse, parseSessionResponse, ensureProcessingSession, invalidateRejectedProcessingSession, PROCESSING_SESSION_KEY, SESSION_ENDPOINT } from "../src/shared/wxsession";
const session = () => ({ openid: 'o' + 'x'.repeat(27), processingToken: 'wxc_synthetic.' + 'a'.repeat(64), expiresAt: Date.now() + 60_000 });
test('微信身份解析必须有完整 openid，错误和损坏回执拒绝', () => {
 assert.equal(parseSessionResponse(200,{openid:'o'.repeat(28)}),'o'.repeat(28));
 for (const data of [{},null,{openid:''},{openid:'short'}]) assert.throws(()=>parseSessionResponse(200,data));
 assert.throws(()=>parseSessionResponse(503,{error:'服务未配置'}),/未配置/);
});
test('内容预检只接受明确通过，旧 unchecked、待处理、空回执和故障均拒绝', () => {
 assert.equal(parseSecCheckResponse(200,{ok:true}),'');
 for (const data of [{ok:true,unchecked:true},{ok:true,pending:true},{},null,[],{ok:false}]) assert.ok(parseSecCheckResponse(200,data));
 for (const status of [401,429,500,502,503]) assert.ok(parseSecCheckResponse(status,{error:'待处理'}));
 assert.match(parseSecCheckResponse(400,{error:'内容违规'}),/违规/);
});
test('内容为空不发请求；有内容时限流、网络故障和异常回执不能放行', async () => {
 const original=Taro.request; let calls=0;Taro.setStorageSync(PROCESSING_SESSION_KEY,session());
 try {
  Taro.request=(async()=>{calls++;throw new Error('network down');}) as never;
  await checkContentBeforeSave(['',null]);assert.equal(calls,0);
  await assert.rejects(checkContentBeforeSave(['合成产品']),/草稿已保留/);
  for (const reply of [{statusCode:429,data:{error:'请求过频'}},{statusCode:503,data:{}},{statusCode:200,data:{ok:true,unchecked:true}},{statusCode:400,data:{error:'内容违规'}}]) {
   Taro.request=(async()=>reply) as never;await assert.rejects(checkContentBeforeSave(['合成产品']));
  }
 } finally {Taro.request=original;}
});
test('缓存处理凭证发 Authorization，不相信前端自行填写 openid', async () => {
 const original=Taro.request;const identity=session();Taro.setStorageSync(PROCESSING_SESSION_KEY,identity);const requests:any[]=[];
 Taro.request=(async options=>{requests.push(options);return {statusCode:200,data:{ok:true}};}) as never;
 try {await checkContentBeforeSave(['品牌','型号']);assert.equal(requests.length,1);assert.equal(requests[0].header.Authorization,'Bearer '+identity.processingToken);assert.equal(requests[0].header['X-WX-Openid'],undefined);}
 finally {Taro.request=original;}
});
test('坏缓存自愈：非法格式凭证清除后重新登录成功，不再永久卡读取异常', async () => {
  const request=Taro.request;const get=Taro.getStorageSync;const set=Taro.setStorageSync;const remove=Taro.removeStorageSync;
  const store=new Map<string, unknown>();
  const issued=session();
  Taro.getStorageSync=((k: string)=>store.get(k)??'') as never;
  Taro.setStorageSync=((k: string,v: unknown)=>{store.set(k,v)}) as never;
  Taro.removeStorageSync=((k: string)=>{store.delete(k)}) as never;
  Taro.request=(async()=>({statusCode:200,data:issued})) as never;
  try {
    store.set(PROCESSING_SESSION_KEY,{broken:'legacy-format'});
    const result=await ensureProcessingSession();
    assert.match(result.processingToken,/^wxc_/);
    assert.deepEqual(store.get(PROCESSING_SESSION_KEY),issued);
  } finally {Taro.request=request;Taro.getStorageSync=get;Taro.setStorageSync=set;Taro.removeStorageSync=remove;}
});
test('处理凭证读取失败不得触发登录或覆盖未知缓存', async () => {
 const original=Taro.getStorageSync;const request=Taro.request;let requests=0;
 Taro.getStorageSync=(()=>{throw new Error('storage unavailable');}) as never;Taro.request=(async()=>{requests++;return {} as never;}) as never;
 try {await assert.rejects(ensureProcessingSession(),/storage unavailable/);assert.equal(requests,0);}
 finally {Taro.getStorageSync=original;Taro.request=request;}
});
test('旧服务只返回 openid 时拒绝；存储写入失败也不假装获得身份', async () => {
 const request=Taro.request;const set=Taro.setStorageSync;Taro.setStorageSync(PROCESSING_SESSION_KEY,'');
 try {
  Taro.request=(async()=>({statusCode:200,data:{openid:'o'.repeat(28)}})) as never;
  await assert.rejects(ensureProcessingSession(),/有效处理凭证/);
  Taro.request=(async()=>({statusCode:200,data:session()})) as never;
  Taro.setStorageSync=(()=>{throw new Error('write failed');}) as never;
  await assert.rejects(ensureProcessingSession(),/write failed/);
 } finally {Taro.request=request;Taro.setStorageSync=set;}
});

test('401 只停止本次预检，下次明确操作才重新获取身份；原稿缓存不动', async () => {
 const request=Taro.request, login=Taro.login; const old=session(), next={...session(),processingToken:'wxc_renewed.'+'b'.repeat(64)};
 Taro.setStorageSync(PROCESSING_SESSION_KEY,old);Taro.setStorageSync('synthetic-draft',{notes:'保留原稿'});
 let calls=0, logins=0;
 Taro.login=(async()=>{logins++;return {code:'fresh-synthetic-code'};}) as never;
 Taro.request=(async(options:any)=>{calls++;return options.url===SESSION_ENDPOINT?{statusCode:200,data:next}:{statusCode:401,data:{error:'rejected'}};}) as never;
 try {
  await assert.rejects(checkContentBeforeSave(['合成产品']),/身份已失效.*保留/);
  assert.equal(calls,1);assert.equal(logins,0);assert.equal(Taro.getStorageSync(PROCESSING_SESSION_KEY),'');
  assert.deepEqual(Taro.getStorageSync('synthetic-draft'),{notes:'保留原稿'});
  assert.equal((await ensureProcessingSession()).processingToken,next.processingToken);assert.equal(calls,2);assert.equal(logins,1);
 } finally {Taro.request=request;Taro.login=login;}
});

test('较早请求返回401时不清除期间新登录的凭证', async () => {
 const request=Taro.request, old=session(), next={...session(),processingToken:'wxc_newowner.'+'b'.repeat(64)};
 Taro.setStorageSync(PROCESSING_SESSION_KEY,old);let calls=0;
 Taro.request=(async()=>{calls++;Taro.setStorageSync(PROCESSING_SESSION_KEY,next);return {statusCode:401,data:{}};}) as never;
 try {await assert.rejects(checkContentBeforeSave(['合成产品']),/身份已失效/);assert.equal(calls,1);assert.deepEqual(Taro.getStorageSync(PROCESSING_SESSION_KEY),next);}
 finally {Taro.request=request;}
});

test('凭证缓存读取失败不执行删除，删除未生效也不假报重置成功', () => {
 const get=Taro.getStorageSync, remove=Taro.removeStorageSync, old=session();let deletes=0;
 Taro.setStorageSync(PROCESSING_SESSION_KEY,old);
 try {
  Taro.removeStorageSync=(()=>{deletes++;}) as never;
  Taro.getStorageSync=(()=>{throw Error('storage read failed');}) as never;
  assert.throws(()=>invalidateRejectedProcessingSession('Bearer '+old.processingToken),/storage read failed/);assert.equal(deletes,0);
  Taro.getStorageSync=get;
  assert.throws(()=>invalidateRejectedProcessingSession('Bearer '+old.processingToken),/重置失败.*保留/);assert.equal(deletes,1);
 } finally {Taro.getStorageSync=get;Taro.removeStorageSync=remove;}
});
