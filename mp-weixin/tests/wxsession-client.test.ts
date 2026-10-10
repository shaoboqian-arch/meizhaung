import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { checkContentBeforeSave, parseSecCheckResponse, parseSessionResponse, ensureProcessingSession, PROCESSING_SESSION_KEY } from "../src/shared/wxsession";
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
  Taro.getStorageSync=((k: string)=>store.get(k)??'') as never;
  Taro.setStorageSync=((k: string,v: unknown)=>{store.set(k,v)}) as never;
  Taro.removeStorageSync=((k: string)=>{store.delete(k)}) as never;
  Taro.request=(async()=>({statusCode:200,data:session()})) as never;
  try {
    store.set(PROCESSING_SESSION_KEY,{broken:'legacy-format'});
    const result=await ensureProcessingSession();
    assert.match(result.processingToken,/^wxc_/);
    assert.deepEqual(store.get(PROCESSING_SESSION_KEY),session());
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
