import type { Product } from '@shared/types';
import { defaultSelectedIds } from './constants';
import { validSnapshot, type Outcome, type Snapshot, type SyncTransport } from './sync-model';
import { cloudFailure } from './cloud-errors';

export const OWNED_WRITE_RULE='beauty-owned-write-v1';
type Reply={data:unknown;error?:unknown;status?:number};
type Receipt={payload:string;signature:string};
export interface ReviewedPorts {
  identity():Promise<Outcome<string>>;
  rpc(name:string,args:Record<string,unknown>):PromiseLike<Reply>;
  review(rows:Record<string,unknown>[],versions:number[],owner:string):Promise<Outcome<Receipt>>;
}
type Baseline={products:Map<string,number>;profile:number};
const fail=(kind:string,message:string):Outcome<never>=>({ok:false,kind,message});
const invalid=()=>fail('invalid-request','云端回执格式有误，本机原稿保留。');
const integer=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rpcFailure=(reply:Reply):Outcome<never>=>cloudFailure(reply.error,reply.status);
export function createReviewedTransport(ports:ReviewedPorts):SyncTransport {
 const baselines=new Map<string,Baseline>(),reads=new Map<string,number>();
 const guard=async(owner:string):Promise<Outcome<null>>=>{
  const i=await ports.identity();return !i.ok?i:i.data===owner?{ok:true,data:null}:fail('account-changed','账号已变化，本机原稿保留且未继续提交。');
 };
 const base=(owner:string):Outcome<Baseline>=>{
  const b=baselines.get(owner);return b?{ok:true,data:b}:fail('read-required','请先读取云端状态，本机原稿保留。');
 };
 const run=async(name:string,args:Record<string,unknown>):Promise<Reply>=>{
  try{return await ports.rpc(name,args);}catch{return {data:null,error:{kind:'network'},status:0};}
 };
 return {
  identity:ports.identity,
  async read(owner,extraIds=[]) {
   const access=await guard(owner);if(!access.ok)return access;
   const generation=(reads.get(owner)??0)+1;reads.set(owner,generation);
   const reply=await run('beauty_read_owned_snapshot_v1',{p_owner:owner,p_extra_ids:[...new Set(extraIds)]});
   if(reply.error)return rpcFailure(reply);
   const r=reply.data;if(!object(r)||r.ruleVersion!==OWNED_WRITE_RULE||!Array.isArray(r.products)||!object(r.versions)||!Array.isArray(r.versions.products)||!integer(r.versions.profile))return invalid();
   if(r.profile!==null&&(!object(r.profile)||r.versions.profile<1))return invalid();
   const versionMap=new Map<string,number>();
   for(const v of r.versions.products){if(!object(v)||typeof v.product_id!=='string'||!v.product_id||!integer(v.version)||versionMap.has(v.product_id))return invalid();versionMap.set(v.product_id,v.version);}
   const snapshot:Snapshot={localProducts:r.products.map((p:any)=>({id:p?.product_id,brand:p?.brand,model:p?.model,category:p?.category,ingredientIds:p?.ingredient_ids,...(p?.notes==null?{}:{notes:p.notes})})),
    selectedIds:r.profile?r.profile.selected_ids:[...defaultSelectedIds],skinConcerns:r.profile?r.profile.skin_concerns:[]};
   if(!validSnapshot(snapshot)||snapshot.localProducts.some(p=>(versionMap.get(p.id)??0)<1)||extraIds.some(id=>!versionMap.has(id)))return invalid();
   const checked=await guard(owner);if(!checked.ok)return checked;
   if(reads.get(owner)!==generation)return fail('stale-read','较早读取已失效，本机原稿保留。');
   baselines.set(owner,{products:versionMap,profile:r.versions.profile});return {ok:true,data:snapshot};
  },
  async putProducts(owner,products:Product[]) {
   if(!products.length)return {ok:true,data:null};
   if(products.length>50||!validSnapshot({localProducts:products,selectedIds:[],skinConcerns:[]}))return invalid();
   // Freeze before the first await: imports, draft edits and delayed reviews share this intent.
   const rows=products.map(p=>({product_id:p.id,brand:p.brand,model:p.model,category:p.category,ingredient_ids:[...p.ingredientIds],notes:p.notes??null}));
   for(const row of rows){Object.freeze(row.ingredient_ids);Object.freeze(row);}Object.freeze(rows);
   if(rows.some(r=>[r.product_id,r.brand,r.model,r.category,...r.ingredient_ids,r.notes??''].join('\n').length>8000))return fail('content-blocked','产品文本过长，本机原稿保留，请精简后重试。');
   const observed=base(owner);if(!observed.ok)return observed;
   const versions=rows.map(r=>observed.data.products.get(r.product_id));
   Object.freeze(versions);
   if(versions.some(v=>v===undefined))return fail('read-required','本次产品缺少云端版本，本机原稿保留，请重新读取。');
   const access=await guard(owner);if(!access.ok)return access;
   let issued:Outcome<Receipt>;try{issued=await ports.review(rows,versions as number[],owner);}catch{return fail('content-pending','内容校验暂未完成，本机原稿保留。');}
   if(!issued.ok)return issued;
   let packet:any;try{packet=JSON.parse(issued.data.payload);}catch{return invalid();}
   if(!object(packet)||packet.owner!==owner||packet.ruleVersion!=='beauty-product-receipt-v1'||packet.applicationId!=='wbapp_t1U4NdF6I0IZdm8LzoMLq6'||packet.database!=='postgres-lgjvhh7s'
    ||packet.action!=='owned.products.upsert'||JSON.stringify(packet.rows)!==JSON.stringify(rows)||JSON.stringify(packet.expectedVersions)!==JSON.stringify(versions)
    ||typeof packet.nonce!=='string'||!/^[0-9a-f]{32}$/.test(packet.nonce)||typeof issued.data.signature!=='string'||!/^[0-9a-f]{64}$/.test(issued.data.signature))return invalid();
   const rechecked=await guard(owner);if(!rechecked.ok)return rechecked;
   const reply=await run('beauty_commit_products_v1',{p_payload:issued.data.payload,p_signature:issued.data.signature});
   if(reply.error)return rpcFailure(reply);
   const r=reply.data;if(!object(r)||r.ruleVersion!==OWNED_WRITE_RULE||r.nonce!==packet.nonce||!Array.isArray(r.versions)||r.versions.length!==rows.length)return invalid();
   const next=new Map(observed.data.products),seen=new Set<string>();
   for(const v of r.versions){if(!object(v)||typeof v.product_id!=='string'||seen.has(v.product_id)||!rows.some(row=>row.product_id===v.product_id)||v.version!==(observed.data.products.get(v.product_id)??-1)+1)return invalid();seen.add(v.product_id);next.set(v.product_id,v.version);}
   const final=await guard(owner);if(!final.ok)return final;
   if(baselines.get(owner)===observed.data)baselines.set(owner,{...observed.data,products:next});return {ok:true,data:null};
  },
  async removeProduct(owner,id) {
   const observed=base(owner);if(!observed.ok)return observed;
   const version=observed.data.products.get(id);if(!integer(version)||version<1)return fail('read-required','缺少待删除产品的云端版本，本机原稿保留。');
   const access=await guard(owner);if(!access.ok)return access;
   const reply=await run('beauty_remove_product_v1',{p_owner:owner,p_product_id:id,p_expected_version:version});if(reply.error)return rpcFailure(reply);
   const r=reply.data;if(!object(r)||r.ruleVersion!==OWNED_WRITE_RULE||r.product_id!==id||r.version!==version+1)return invalid();
   const checked=await guard(owner);if(!checked.ok)return checked;
   if(baselines.get(owner)===observed.data){const products=new Map(observed.data.products);products.set(id,r.version);baselines.set(owner,{...observed.data,products});}return {ok:true,data:null};
  },
  async putProfile(owner,snapshot) {
   if(!validSnapshot(snapshot))return invalid();const selected=[...snapshot.selectedIds],concerns=[...snapshot.skinConcerns];
   const observed=base(owner);if(!observed.ok)return observed;const access=await guard(owner);if(!access.ok)return access;
   const reply=await run('beauty_put_profile_v1',{p_owner:owner,p_selected_ids:selected,p_skin_concerns:concerns,p_expected_version:observed.data.profile});if(reply.error)return rpcFailure(reply);
   const r=reply.data;if(!object(r)||r.ruleVersion!==OWNED_WRITE_RULE||r.version!==observed.data.profile+1)return invalid();
   const checked=await guard(owner);if(!checked.ok)return checked;
   if(baselines.get(owner)===observed.data)baselines.set(owner,{...observed.data,profile:r.version});return {ok:true,data:null};
  }
 };
}
