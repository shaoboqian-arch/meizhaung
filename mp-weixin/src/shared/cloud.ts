import Taro from "@tarojs/taro";
import { createMiniProgramWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk/miniprogram";
import { createDiagnosticWx } from "./workbuddy-cloud-diagnostics";
import { cloudFailure } from "./cloud-errors";
import { validSnapshot, type Outcome, type Snapshot, type SyncTransport } from "./sync-model";
import { processingHeaders, invalidateRejectedProcessingSession } from "./wxsession";
import { createReviewedTransport, type ReviewedPorts } from "./reviewed-transport";
import type { Product } from "@shared/types";

/** The existing public application key is not an edit credential. */
const publicConfig = {
  endpoint: "https://mp-api.app.workbuddy.host",
  publishableKey: "wbpk_t1U4NdF6I0IZdm8LzoMLq6_ZgDedK2i111Xzj6vrW9uZKtgBLTsjCje"
};
type ProductRow = {
  product_id: string; brand: string; model: string; category: Product["category"];
  ingredient_ids: string[]; notes?: string | null;
};
type ProfileRow = { selected_ids: string[]; skin_concerns: Snapshot["skinConcerns"] };
type Database = { public: { Tables: {
  user_products: { Row: ProductRow & { owner_id: string; created_at: string }; Insert: ProductRow; Update: Partial<ProductRow>; Relationships: [] };
  user_profiles: { Row: ProfileRow & { owner_id: string }; Insert: ProfileRow; Update: Partial<ProfileRow>; Relationships: [] };
}; Views: {}; Functions: {} } };
export const cloud = createMiniProgramWorkBuddyCloud<Database>({
  endpoint: publicConfig.endpoint, publishableKey: publicConfig.publishableKey,
  wx: createDiagnosticWx(Taro)
});
const failure=cloudFailure;
const ok = <T,>(data: T): Outcome<T> => ({ ok: true, data });
const rejectedPlatformTokens=new Set<string>();
function rejectPlatformToken(token:string){
  rejectedPlatformTokens.add(token);
  if(rejectedPlatformTokens.size>32)rejectedPlatformTokens.delete(rejectedPlatformTokens.values().next().value!);
}

export const getIdentity = async (): Promise<Outcome<string>> => {
  try {
    const { data, error } = await cloud.auth.getSession();
    if (error) return failure(error);
    if (!data?.user?.id || data.user.isAnonymous || !data.accessToken || rejectedPlatformTokens.has(data.accessToken)) return failure({ kind: "unauthenticated" });
    return ok(data.user.id);
  } catch (error) { return failure(error); }
};

export const signInWithWechat = async () => {
  try {
    const appid = Taro.getAccountInfoSync().miniProgram?.appId;
    if (!appid) return { ok: false, message: "运行环境缺少小程序标识，无法登录" };
    const { code } = await Taro.login();
    if (!code) return { ok: false, message: "微信登录未完成，请重试" };
    const { error } = await cloud.auth.signInWithWechat(code, appid);
    if (error) return failure(error);
    return { ok: true, message: "已登录，尚未上传本机数据" };
  } catch (error) { return failure(error); }
};

// Candidate rollout uses the fixed app SDK session and PostgreSQL RPCs only.
const databaseRpc=cloud.database as unknown as {rpc:ReviewedPorts["rpc"]};
export const syncTransport:SyncTransport=createReviewedTransport({
  identity:getIdentity,
  async rpc(name,args){
    const {data,error}=await cloud.auth.getSession();
    if(error)return {data:null,error};
    if(!data?.accessToken||data.user?.isAnonymous||rejectedPlatformTokens.has(data.accessToken))return {data:null,error:{kind:'unauthenticated'},status:401};
    const reply=await databaseRpc.rpc(name,args);
    if(reply.status===401)rejectPlatformToken(data.accessToken);
    return reply;
  },
  async review(rows,versions,owner) {
    const {data,error}=await cloud.auth.getSession();
    if(error)return failure(error);
    if(!data||data.user?.isAnonymous||data.user?.id!==owner||!data.accessToken)return {ok:false,kind:"unauthenticated",message:"请重新微信登录，本机原稿保留。"};
    const header=await processingHeaders();
    let reply;
    try {
      reply=await Taro.request({url:"https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/owned-products/review",
        method:"POST",timeout:60000,header:{...header,"X-WB-Platform-Session":data.accessToken},data:{rows,expectedVersions:versions}});
    } catch {return {ok:false,kind:"content-pending",message:"云端内容校验暂未完成，本机原稿保留。"};}
    const body=reply.data as any;
    if(reply.statusCode===401&&['PLATFORM_SESSION_REQUIRED','PLATFORM_SESSION_REJECTED'].includes(body?.code)||reply.statusCode===403&&body?.code==='IDENTITY_MISMATCH')rejectPlatformToken(data.accessToken);
    if(reply.statusCode===401&&body?.code==="WECHAT_SESSION_REQUIRED"||reply.statusCode===403&&body?.code==='IDENTITY_MISMATCH')invalidateRejectedProcessingSession(header.Authorization);
    if(reply.statusCode!==200||body?.ok!==true||body.ruleVersion!=="beauty-owned-write-v1"||typeof body.receipt?.payload!=="string"||typeof body.receipt?.signature!=="string") {
      return {ok:false,kind:reply.statusCode===401||body?.code==='IDENTITY_MISMATCH'?"unauthenticated":body?.code==="CONTENT_REJECTED"?"content-blocked":"content-pending",
        message:typeof body?.error==="string"?body.error:"云端内容校验暂未完成，本机原稿保留。"};
    }
    return {ok:true,data:{payload:body.receipt.payload,signature:body.receipt.signature}};
  }
});
