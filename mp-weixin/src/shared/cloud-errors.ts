import type { Outcome } from './sync-model';
const messages:Record<string,string>={
 unauthenticated:'请重新微信登录，本机原稿保留。',
 'permission-denied':'当前账号没有权限，原稿保留且未覆盖。',
 'not-found':'读取目标不存在，已停止覆盖。',
 'invalid-request':'请求格式有误，已停止同步。',
 'rate-limited':'操作太频繁，请稍后重试；本机原稿保留。',
 'credits-exhausted':'云服务额度已用尽，本机原稿保留。',
 'backend-unavailable':'同步服务暂不可用，本机改动保留。',
 network:'网络不通，本机改动及待同步记录保留。',
 conflict:'云端版本已变化，本机原稿保留，请重新读取并核对。'
};
/** One classifier for SDK sessions and RPCs; never infer absence from a failed read. */
export function cloudFailure(error:unknown,status?:number):Outcome<never>{
 const e=error&&typeof error==='object'?error as Record<string,unknown>:{};
 const code=String(e.code??'');
 const kind=typeof e.kind==='string'?e.kind:code==='40001'||code==='40P01'?'conflict':
  code==='42501'||status===403?'permission-denied':status===401?'unauthenticated':status===404?'not-found':
  status===429?'rate-limited':status!==undefined&&status>=500?'backend-unavailable':
  status===400||code.startsWith('22')||code.startsWith('23')?'invalid-request':status===0?'network':'unknown';
 return {ok:false,kind,message:messages[kind]??'同步服务调用失败，本机原稿保留，请重试。'};
}
