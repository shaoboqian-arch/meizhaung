import type { ProductDraft } from './product-draft';
import type { LocalStoragePort } from './sync-model';
export const MAX_REFERENCE_BYTES = 2 * 1024 * 1024;
export const MAX_SAVED_BYTES = 8 * 1024 * 1024;
type Photo = { path: string; bytes: number; draftId: string; state: 'retained' | 'attached' | 'removing' };
type Ledger = { schemaVersion: 1; scope: string; photos: Photo[] };
export type PhotoInventory = { scope: string; totalBytes: number; ownedBytes: number; photos: (Photo & { present: boolean; referenced: boolean })[] };
export type PhotoRemovalProposal = { token: string; scope: string; path: string; bytes: number; present: boolean };
function validateSavedFiles(list:{filePath:string;size:number}[]) {
  if (!Array.isArray(list) || list.some(p=>!p || typeof p.filePath!=='string' || !p.filePath || !Number.isSafeInteger(p.size) || p.size<0) || new Set(list.map(p=>p.filePath)).size!==list.length || !Number.isSafeInteger(list.reduce((n,p)=>n+p.size,0))) throw new Error('本机照片空间暂不可读取，已暂停新增和清理，已有照片保留。');
  return list;
}
export type PhotoPort = {
  fileInfo(path: string): Promise<{ size: number }>;
  imageInfo(path: string): Promise<{ width: number; height: number }>;
  compress(path: string, width: number, height: number): Promise<string>;
  savedFiles(): Promise<{ filePath: string; size: number }[]>;
  save(path: string): Promise<string>;
  remove?(path: string): Promise<void>;
};
export function assertDraftCurrent(current: ProductDraft | null, expected: Pick<ProductDraft, 'id' | 'scope'>) {
  if (!current || current.id !== expected.id || current.scope !== expected.scope) throw new Error('账号或草稿已变化，原有填写与照片已保留，请重新打开。');
}
export function assertRecognitionCurrent(current: ProductDraft | null, expected: ProductDraft) {
  assertDraftCurrent(current,expected);
  if (current!.ingredientText !== expected.ingredientText) throw new Error('识别期间你已修改成分，新填写内容已保留；请核对后再识别。');
}
export const createReferencePhotoStore = (storage: LocalStoragePort, currentScope: () => string, files: PhotoPort, readReferences?: () => string[]) => {
  let preparing = false;
  const proposals = new Map<string, PhotoRemovalProposal>();
  const key = (scope: string) => 'beauty-reference-photos-v1:' + encodeURIComponent(scope);
  const sameScope = (scope: string) => { if (currentScope() !== scope) throw new Error('账号已变化，照片留在原账号，当前草稿未修改。'); };
  const read = (scope: string): Ledger => {
    const raw = storage.get(key(scope));
    if (raw === '' || raw === undefined) return { schemaVersion: 1, scope, photos: [] };
    const value = raw as Ledger;
    if (!value || value.schemaVersion !== 1 || value.scope !== scope || !Array.isArray(value.photos) || value.photos.length > 1024 || value.photos.some(p => !p || typeof p.path !== 'string' || !p.path || !Number.isSafeInteger(p.bytes) || p.bytes <= 0 || typeof p.draftId !== 'string' || !p.draftId.startsWith('manual-') || !['retained', 'attached', 'removing'].includes(p.state))) throw new Error('参考照片记录暂不可读取，已有照片保留，已暂停新增。');
    if (new Set(value.photos.map(p => p.path)).size !== value.photos.length) throw new Error('参考照片记录有冲突，已有照片保留。');
    return { ...value, photos: value.photos.map(p => ({ ...p })) };
  };
  const persist = (value: Ledger) => {
    read(value.scope); // A failed read cannot authorize overwriting an unknown ledger.
    storage.set(key(value.scope), value);
    if (JSON.stringify(read(value.scope)) !== JSON.stringify(value)) throw new Error('参考照片状态未能保存，照片仍在本机，请保留当前页面。');
  };
  async function prepare(source: string, draft: ProductDraft) {
    if (preparing) throw new Error('照片正在保存，请稍后重试。');
    preparing = true;
    try {
      sameScope(draft.scope); read(draft.scope);
      let path = source, info = await files.fileInfo(path); sameScope(draft.scope);
      if (!Number.isSafeInteger(info.size) || info.size <= 0) throw new Error('照片大小暂不可读取，填写内容与原有照片已保留。');
      if (info.size > MAX_REFERENCE_BYTES) {
        const image = await files.imageInfo(path); sameScope(draft.scope);
        if (![image.width, image.height].every(v => Number.isSafeInteger(v) && v > 0)) throw new Error('照片尺寸暂不可读取，填写内容与原有照片已保留。');
        const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
        path = await files.compress(path, Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
        sameScope(draft.scope); info = await files.fileInfo(path);
      }
      if (!Number.isSafeInteger(info.size) || info.size <= 0 || info.size > MAX_REFERENCE_BYTES) throw new Error('照片偏大，请换一张更小的照片；填写内容与原有照片已保留。');
      const list = validateSavedFiles(await files.savedFiles()); sameScope(draft.scope);
      if (list.reduce((total, p) => total + p.size, 0) + info.size > MAX_SAVED_BYTES) throw new Error('本机参考照片空间已满，已有照片保留；仍可手动填写成分。');
      sameScope(draft.scope);
      const saved = await files.save(path);
      if (!saved || typeof saved !== 'string') throw new Error('照片保存未确认，填写内容与原有照片已保留。');
      const ledger = read(draft.scope);
      const existing = ledger.photos.find(p => p.path === saved);
      if (existing && (existing.draftId !== draft.id || existing.bytes !== info.size)) throw new Error('照片归属存在冲突，当前草稿未修改。');
      if (!existing) ledger.photos.push({ path: saved, bytes: info.size, draftId: draft.id, state: 'retained' });
      persist(ledger); // A late receipt belongs to the initiating owner, never the later owner.
      sameScope(draft.scope);
      return saved;
    } finally { preparing = false; }
  }
  function attach(draft: ProductDraft, path: string, previous: string) {
    if (preparing) throw new Error('照片正在保存或清理，请稍后重试。');
    sameScope(draft.scope); const ledger = read(draft.scope);
    const target = ledger.photos.find(p => p.path === path && p.draftId === draft.id);
    if (!target || target.state==='removing') throw new Error('参考照片归属未确认，填写内容与照片已保留。');
    for (const p of ledger.photos) {
      if (p.path === path) p.state = 'attached';
      else if (p.path === previous) p.state = 'retained';
    }
    persist(ledger);
  }
  const references = () => {
    if (!readReferences) throw new Error('照片引用暂不可核对，已有照片保留。');
    const result=readReferences();
    if (!Array.isArray(result) || result.some(p=>typeof p!=='string')) throw new Error('照片引用暂不可核对，已有照片保留。');
    return new Set(result.filter(Boolean));
  };
  async function inventory(scope=currentScope()): Promise<PhotoInventory> {
    sameScope(scope);const ledger=read(scope), list=validateSavedFiles(await files.savedFiles());sameScope(scope);
    const refs=references();sameScope(scope);
    const photos=ledger.photos.map(photo=>{
      const file=list.find(p=>p.filePath===photo.path);
      if(file && file.size!==photo.bytes)throw new Error('照片大小与登记不一致，已有照片保留。');
      return {...photo,present:!!file,referenced:refs.has(photo.path)};
    });
    return {scope,totalBytes:list.reduce((n,p)=>n+p.size,0),ownedBytes:photos.reduce((n,p)=>n+(p.present?p.bytes:0),0),photos};
  }
  async function proposeRemoval(path:string): Promise<PhotoRemovalProposal> {
    const state=await inventory(), photo=state.photos.find(p=>p.path===path);
    if(!photo)throw new Error('照片归属未确认，未执行清理。');
    if(photo.referenced)throw new Error('照片仍被产品或草稿使用，未执行清理。');
    proposals.clear();const token='photo-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    const proposal={token,scope:state.scope,path:photo.path,bytes:photo.bytes,present:photo.present};
    proposals.set(token,proposal);return {...proposal};
  }
  async function removeConfirmed(token:string) {
    const proposal=proposals.get(token);proposals.delete(token);
    if(!proposal)throw new Error('请重新核对并确认这张照片。');
    if(preparing)throw new Error('照片正在保存或清理，请稍后重试。');
    preparing=true;
    try {
      const state=await inventory(proposal.scope),photo=state.photos.find(p=>p.path===proposal.path);
      if(!photo || photo.bytes!==proposal.bytes || photo.present!==proposal.present || photo.referenced)throw new Error('照片状态已变化，请重新核对；已有照片保留。');
      if(photo.present && !files.remove)throw new Error('照片清理暂不可用，已有照片保留。');
      const ledger=read(proposal.scope), target=ledger.photos.find(p=>p.path===proposal.path)!;
      target.state='removing';persist(ledger); // Recoverable intent before the irreversible file operation.
      sameScope(proposal.scope);
      if(references().has(proposal.path))throw new Error('照片已被重新使用，未执行清理。');
      let failure:unknown;
      if(photo.present)try {await files.remove!(proposal.path);}catch(error){failure=error;}
      const list=validateSavedFiles(await files.savedFiles());
      if(list.some(p=>p.filePath===proposal.path))throw (failure instanceof Error?failure:new Error('照片清理未确认，登记保留，可稍后重试。'));
      const latest=read(proposal.scope);
      const pending=latest.photos.find(p=>p.path===proposal.path);
      if(!pending || pending.state!=='removing' || pending.bytes!==proposal.bytes)throw new Error('清理登记状态已变化，请重新核对。');
      latest.photos=latest.photos.filter(p=>p.path!==proposal.path);persist(latest);
      sameScope(proposal.scope);return {removed:true,path:proposal.path};
    } finally {preparing=false;}
  }
  return { prepare, attach, read, inventory, proposeRemoval, removeConfirmed };
};
