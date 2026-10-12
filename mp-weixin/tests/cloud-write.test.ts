import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { cloud, getIdentity, syncTransport } from "../src/shared/cloud";
import { createReviewedTransport } from "../src/shared/reviewed-transport";
import { PROCESSING_SESSION_KEY } from "../src/shared/wxsession";
import type { Product } from "@shared/types";
const product=():Product=>({id:"manual-1",brand:"合成品牌",model:"合成型号",category:"洁面",ingredientIds:["synthetic-ingredient"],notes:"待校验备注"});
// SDK/Taro import boundaries are offline; SQL/HMAC correctness is tested in PostgreSQL separately.
function fixture(){
 const sdk=cloud as any,original={rpc:sdk.database.rpc,from:sdk.database.from,session:sdk.auth.getSession,request:Taro.request};
 let owner="synthetic-owner",token="synthetic-platform",reply:any=null,readFailure=false;const writes:any[]=[],reviews:any[]=[];
 Taro.setStorageSync(PROCESSING_SESSION_KEY,{openid:"o".repeat(28),processingToken:"wxc_synthetic."+"a".repeat(64),expiresAt:Date.now()+60000});
 sdk.auth.getSession=async()=>({data:{user:{id:owner,isAnonymous:false},accessToken:token},error:null});
 sdk.database.from=()=>{throw Error("Direct table writes are forbidden in candidate tests");};
 sdk.database.rpc=async(name:string,args:any)=>{
  if(name==="beauty_read_owned_snapshot_v1")return readFailure?{data:null,error:{code:"42501"},status:403}:{data:{ruleVersion:"beauty-owned-write-v1",products:[],profile:null,versions:{profile:0,products:args.p_extra_ids.map((id:string)=>({product_id:id,version:0}))}},error:null};
  if(name==="beauty_commit_products_v1"){const packet=JSON.parse(args.p_payload);writes.push({name,rows:packet.rows,versions:packet.expectedVersions});return {error:null,data:{ruleVersion:"beauty-owned-write-v1",nonce:packet.nonce,versions:packet.rows.map((r:any,i:number)=>({product_id:r.product_id,version:packet.expectedVersions[i]+1}))}};}
  throw Error("Unexpected RPC "+name);
 };
 Taro.request=(async(options:any)=>{reviews.push(options);if(reply instanceof Error)throw reply;if(reply!==null)return typeof reply==="function"?reply(options):reply;
  return {statusCode:200,data:{ok:true,ruleVersion:"beauty-owned-write-v1",receipt:{payload:JSON.stringify({owner:"synthetic-owner",ruleVersion:"beauty-product-receipt-v1",applicationId:"wbapp_t1U4NdF6I0IZdm8LzoMLq6",database:"postgres-lgjvhh7s",action:"owned.products.upsert",nonce:"a".repeat(32),rows:options.data.rows,expectedVersions:options.data.expectedVersions}),signature:"b".repeat(64)}}};
 }) as never;
 return {writes,reviews,seed:(ids=["manual-1"])=>syncTransport.read("synthetic-owner",ids),setOwner:(v:string)=>{owner=v;},setToken:(v:string)=>{token=v;},setReply:(v:any)=>{reply=v;},setReadFailure:()=>{readFailure=true;},close:()=>{sdk.database.rpc=original.rpc;sdk.database.from=original.from;sdk.auth.getSession=original.session;Taro.request=original.request;}};
}
test("同步产品全部持久化文本冻结在服务器审核批次中，通过后才调用事务RPC",async()=>{
 const f=fixture();try{assert.equal((await f.seed()).ok,true);assert.equal((await syncTransport.putProducts("synthetic-owner",[product()])).ok,true);assert.equal(f.reviews.length,1);assert.deepEqual(f.reviews[0].data.rows,[{product_id:"manual-1",brand:"合成品牌",model:"合成型号",category:"洁面",ingredient_ids:["synthetic-ingredient"],notes:"待校验备注"}]);assert.equal(f.reviews[0].header["X-WB-Platform-Session"],"synthetic-platform");assert.equal(f.writes[0].name,"beauty_commit_products_v1");assert.deepEqual(f.writes[0].versions,[0]);}finally{f.close();}
});
test("导入成分引用超长时零审核请求、零事务写入",async()=>{
 const f=fixture();try{await f.seed();const p=product();p.ingredientIds=["甲".repeat(8001)];assert.equal((await syncTransport.putProducts("synthetic-owner",[p])).ok,false);assert.equal(f.reviews.length,0);assert.equal(f.writes.length,0);}finally{f.close();}
});
test("审核待处理、旧故障放行、违规和网络故障均零云写入",async()=>{
 const f=fixture();try{await f.seed();for(const response of [{statusCode:200,data:{ok:true,pending:true}},{statusCode:200,data:{ok:true,unchecked:true}},{statusCode:400,data:{code:"CONTENT_REJECTED",error:"拒绝"}},new Error("offline")]){f.setReply(response);assert.equal((await syncTransport.putProducts("synthetic-owner",[product()])).ok,false);}assert.equal(f.writes.length,0);}finally{f.close();}
});
test("校验等待期间改账号拒绝旧请求，原产品仍保留",async()=>{
 const f=fixture(),p=product(),before=JSON.stringify(p);try{await f.seed();f.setReply((options:any)=>{f.setOwner("another-owner");return {statusCode:200,data:{ok:true,ruleVersion:'beauty-owned-write-v1',receipt:{payload:JSON.stringify({owner:'synthetic-owner',ruleVersion:'beauty-product-receipt-v1',applicationId:'wbapp_t1U4NdF6I0IZdm8LzoMLq6',database:'postgres-lgjvhh7s',action:'owned.products.upsert',nonce:'f'.repeat(32),rows:options.data.rows,expectedVersions:options.data.expectedVersions}),signature:'a'.repeat(64)}}};});assert.equal((await syncTransport.putProducts("synthetic-owner",[p])).ok,false);assert.equal(f.writes.length,0);assert.equal(JSON.stringify(p),before);}finally{f.close();}
});
test("外部对象在审核等待期间改变不会进入已冻结的提交",async()=>{
 const f=fixture(),p=product();try{await f.seed();f.setReply((options:any)=>{p.brand="未审核修改";p.ingredientIds.push("unreviewed");return {statusCode:200,data:{ok:true,ruleVersion:"beauty-owned-write-v1",receipt:{payload:JSON.stringify({owner:"synthetic-owner",ruleVersion:"beauty-product-receipt-v1",applicationId:"wbapp_t1U4NdF6I0IZdm8LzoMLq6",database:"postgres-lgjvhh7s",action:"owned.products.upsert",nonce:"c".repeat(32),rows:options.data.rows,expectedVersions:options.data.expectedVersions}),signature:"a".repeat(64)}}};});assert.equal((await syncTransport.putProducts("synthetic-owner",[p])).ok,true);assert.equal(f.writes[0].rows[0].brand,"合成品牌");assert.deepEqual(f.writes[0].rows[0].ingredient_ids,["synthetic-ingredient"]);}finally{f.close();}
});
test("非法产品和空批次不发审核请求或云写入",async()=>{
 const f=fixture();try{await f.seed();assert.equal((await syncTransport.putProducts("synthetic-owner",[])).ok,true);const p=product();(p as any).brand=null;assert.equal((await syncTransport.putProducts("synthetic-owner",[p])).ok,false);assert.equal(f.reviews.length,0);assert.equal(f.writes.length,0);}finally{f.close();}
});
test("批量导入后项待审时整批不提前写入",async()=>{
 const f=fixture();try{await f.seed(["manual-1","manual-2"]);f.setReply({statusCode:503,data:{pending:true}});assert.equal((await syncTransport.putProducts("synthetic-owner",[product(),{...product(),id:"manual-2"}])).ok,false);assert.equal(f.reviews.length,1);assert.equal(f.writes.length,0);f.setReply(null);assert.equal((await syncTransport.putProducts("synthetic-owner",[product(),{...product(),id:"manual-2"}])).ok,true);assert.equal(f.writes.length,1);assert.equal(f.writes[0].rows.length,2);}finally{f.close();}
});
test("读取失败不合成零版本，也不自动执行保存或重试",async()=>{
 let calls=0;const transport=createReviewedTransport({identity:async()=>({ok:true,data:"synthetic-owner"}),rpc:async()=>{calls++;return {data:null,error:{code:"42501"},status:403};},review:async()=>{throw Error("review must not run");}});assert.equal((await transport.read("synthetic-owner",["manual-1"])).ok,false);assert.equal((await transport.putProducts("synthetic-owner",[product()])).ok,false);assert.equal(calls,1);
});
test("数据库版本冲突保留意图且不会重新取版本覆盖",async()=>{
 let calls=0;const transport=createReviewedTransport({identity:async()=>({ok:true,data:"synthetic-owner"}),rpc:async()=>{calls++;return calls===1?{data:{ruleVersion:"beauty-owned-write-v1",products:[],profile:null,versions:{profile:0,products:[{product_id:"manual-1",version:0}]}}}:{data:null,error:{code:"40001"}};},review:async(rows,versions)=>({ok:true,data:{payload:JSON.stringify({owner:"synthetic-owner",ruleVersion:"beauty-product-receipt-v1",applicationId:"wbapp_t1U4NdF6I0IZdm8LzoMLq6",database:"postgres-lgjvhh7s",action:"owned.products.upsert",nonce:"d".repeat(32),rows,expectedVersions:versions}),signature:"a".repeat(64)}})});await transport.read("synthetic-owner",["manual-1"]);const p=product(),before=JSON.stringify(p);const result=await transport.putProducts("synthetic-owner",[p]);assert.equal(result.ok,false);if(!result.ok)assert.equal(result.kind,"conflict");assert.equal(calls,2);assert.equal(JSON.stringify(p),before);
});
test('被拒的平台凭证在下一次操作要求重登，新凭证可以正常继续',async()=>{
 const f=fixture();try{await f.seed();f.setReply({statusCode:401,data:{code:'PLATFORM_SESSION_REJECTED',error:'expired'}});assert.equal((await syncTransport.putProducts('synthetic-owner',[product()])).ok,false);assert.equal((await getIdentity()).ok,false);assert.equal(f.writes.length,0);f.setToken('synthetic-fresh-platform');assert.equal((await getIdentity()).ok,true);}finally{f.close();}
});
test('迟到的旧平台401不使新的会话失效，也不继续旧事务',async()=>{
 const f=fixture();try{f.setToken('synthetic-late-platform');await f.seed();f.setReply(()=>{f.setToken('synthetic-newer-platform');return {statusCode:401,data:{code:'PLATFORM_SESSION_REJECTED'}};});assert.equal((await syncTransport.putProducts('synthetic-owner',[product()])).ok,false);assert.equal((await getIdentity()).ok,true);assert.equal(f.writes.length,0);}finally{f.close();}
});
test('不匹配的两个微信身份只重置本次凭证，原稿和照片不受影响',async()=>{
 const f=fixture();try{f.setToken('synthetic-mismatched-platform');await f.seed();const p={...product(),image:'local-photo'};f.setReply({statusCode:403,data:{code:'IDENTITY_MISMATCH'}});assert.equal((await syncTransport.putProducts('synthetic-owner',[p])).ok,false);assert.equal((await getIdentity()).ok,false);assert.equal(Taro.getStorageSync(PROCESSING_SESSION_KEY),'');assert.equal(p.image,'local-photo');assert.equal(f.writes.length,0);}finally{f.close();}
});
