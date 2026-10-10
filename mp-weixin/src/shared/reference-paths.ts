import {createLocalRepository,validSnapshot,type LocalStoragePort} from './sync-model';
import {createProductDraftStore} from './product-draft';
// Reads only path references for retention. Other owners' content is never exposed by the photo UI.
export function readReferencePaths(storage:LocalStoragePort, keys:string[]):string[] {
  if(!Array.isArray(keys) || keys.some(key=>typeof key!=='string') || new Set(keys).size!==keys.length)throw new Error('本机引用目录暂不可读取，已暂停清理。');
  const initial={localProducts:[],selectedIds:[],skinConcerns:[]};
  const repo=createLocalRepository(storage,initial),forms=createProductDraftStore(storage),refs:string[]=[];
  for(const key of keys){
    const prefix=key.startsWith('beauty-mp-state-v1:')?'beauty-mp-state-v1:':key.startsWith('beauty-mp-product-form-v1:')?'beauty-mp-product-form-v1:':null;
    if(!prefix)continue;
    const encoded=key.slice(prefix.length),scope=decodeURIComponent(encoded);
    if(!scope || encodeURIComponent(scope)!==encoded)throw new Error('本机引用分区异常，已暂停清理。');
    if(prefix==='beauty-mp-state-v1:'){
      const state=repo.peek(scope);if(!state)throw new Error('本机引用记录暂不可读取，已暂停清理。');
      refs.push(...state.desiredSnapshot.localProducts.map(p=>p.image || ''),...(state.baseSnapshot?.localProducts.map(p=>p.image || '') || []));
    }else{
      const draft=forms.peek(scope);if(!draft)throw new Error('本机草稿引用暂不可读取，已暂停清理。');refs.push(draft.image);
    }
  }
  if(keys.includes('beauty-products')){
    const legacy={...initial,localProducts:storage.get('beauty-products')};
    if(!validSnapshot(legacy))throw new Error('旧照片引用暂不可读取，已暂停清理。');
    refs.push(...legacy.localProducts.map(p=>p.image || ''));
  }
  return [...new Set(refs.filter(Boolean))];
}
