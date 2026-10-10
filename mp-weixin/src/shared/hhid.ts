import Taro from '@tarojs/taro';
import { createHhidClient } from './hhid-client-core';
// Same public key as cloud.ts; SDK storage is checked, never treated as a trusted server identity.
const sdkKey='workbuddy-cloud.session.wbpk_t1U4NdF6I0IZdm8LzoMLq6_ZgDedK2i111Xzj6vrW9uZKtgBLTsjCje';
type Stored = {accessToken:string;refreshToken:string;expiresAt:number;user:{id:string;isAnonymous?:boolean}};
function storedSession(): Stored | null {
  let value: unknown;
  try {
    value=Taro.getStorageSync(sdkKey);
    if(value==='' || value===undefined || value===null) return null;
    if(typeof value==='string') value=JSON.parse(value);
  } catch { throw new Error('微信登录状态读取失败，请保留原稿并重试'); }
  const session=value as Stored;
  if(!session || typeof session!=='object' || Array.isArray(session) || !session.user ||
    typeof session.user.id!=='string' || !session.user.id || typeof session.accessToken!=='string' || !session.accessToken ||
    typeof session.refreshToken!=='string' || !Number.isFinite(session.expiresAt)) throw new Error('微信登录状态格式异常，原内容已保留');
  return session;
}
export function hhidOwner(): string {
  const session=storedSession();
  return session && !session.user.isAnonymous ? session.user.id : '';
}
export const hhid=createHhidClient({
  appId:'meizhaung',
  storage:{get:key=>Taro.getStorageSync(key),set:(key,value)=>Taro.setStorageSync(key,value),remove:key=>Taro.removeStorageSync(key)},
  request:options=>Taro.request(options),
  getProviderOwner:hhidOwner,
  async getProviderProof() {
    storedSession(); // A failed/invalid read stops before the SDK can silently replace it.
    const {cloud}=await import('./cloud');
    const result=await cloud.auth.getSession(), session=result.data;
    if(result.error || !session || session.user.isAnonymous) throw new Error('请先微信登录，再连接 HHID');
    const saved=storedSession();
    if(!saved || saved.user.id!==session.user.id || saved.accessToken!==session.accessToken ||
      saved.refreshToken!==session.refreshToken || saved.expiresAt!==session.expiresAt || saved.expiresAt<=Date.now()) {
      throw new Error('微信登录状态尚未保存，请重试；本机原稿保留');
    }
    return {owner:session.user.id,token:session.accessToken};
  }
});
