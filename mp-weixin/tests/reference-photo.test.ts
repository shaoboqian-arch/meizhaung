import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createReferencePhotoStore,assertRecognitionCurrent,MAX_REFERENCE_BYTES,MAX_SAVED_BYTES} from '../src/shared/reference-photo';
import {createProductDraftStore,type ProductDraft} from '../src/shared/product-draft';
import {readReferencePaths} from '../src/shared/reference-paths';
import {createLocalRepository} from '../src/shared/sync-model';
const draft=(scope='guest',id='manual-fixture'):ProductDraft=>({schemaVersion:1,scope,id,brand:'合成品牌',model:'合成产品',category:'精华',ingredientText:'原成分',image:''});
function fixture(){
 const disk=new Map<string,unknown>(),events:string[]=[];let scope='guest',ignore=false,readError=false,amount=1000,list:{filePath:string;size:number}[]=[],refs:string[]=[],saveHook=()=>{},fileHook=()=>{},removeHook=()=>{};
 const storage={get:(key:string)=>{if(readError)throw new Error('read unavailable');return disk.has(key)?structuredClone(disk.get(key)):'';},set:(key:string,v:unknown)=>{events.push('write:'+key);if(!ignore)disk.set(key,structuredClone(v));}};
 const port={fileInfo:async(path:string)=>{fileHook();return {size:path==='compressed'?1000:amount};},imageInfo:async()=>({width:4000,height:3000}),compress:async(_path:string,w:number,h:number)=>{assert.equal(w,1800);assert.equal(h,1350);events.push('compress');return 'compressed';},savedFiles:async()=>structuredClone(list),save:async(source:string)=>{events.push('save');saveHook();const path='/saved/'+events.filter(e=>e==='save').length;list.push({filePath:path,size:source==='compressed'?1000:amount});return path;},remove:async(path:string)=>{events.push('remove:'+path);removeHook();list=list.filter(p=>p.filePath!==path);}};
 return {disk,events,storage,port,photos:createReferencePhotoStore(storage,()=>scope,port,()=>refs),setScope:(v:string)=>{scope=v;},setBytes:(v:number)=>{amount=v;},setList:(v:typeof list)=>{list=v;},setRefs:(v:string[])=>{refs=v;},setRemoveHook:(v:()=>void)=>{removeHook=v;},setSaveHook:(v:()=>void)=>{saveHook=v;},setFileHook:(v:()=>void)=>{fileHook=v;},ignoreWrites:()=>{ignore=true;},failRead:()=>{readError=true;}};
}
test('new photo is reserved for the originating draft; replacement retains the earlier reference',async()=>{
 const f=fixture(),d=draft();const one=await f.photos.prepare('source',d);f.photos.attach(d,one,'');
 const two=await f.photos.prepare('another',d);f.photos.attach(d,two,one);
 assert.deepEqual(f.photos.read('guest').photos.map(p=>({path:p.path,state:p.state})),[{path:one,state:'retained'},{path:two,state:'attached'}]);
 assert.equal(f.events.filter(e=>e==='save').length,2);assert.ok(f.photos.read('guest').photos.every(p=>p.draftId===d.id));
});
test('large reference is compressed proportionally before persistent saving; small originals retain their bytes',async()=>{
 const f=fixture();f.setBytes(MAX_REFERENCE_BYTES+1);await f.photos.prepare('source',draft());
 assert.equal(f.events[0],'compress');assert.equal(f.photos.read('guest').photos[0].bytes,1000);
 const small=fixture();await small.photos.prepare('source',draft());assert.equal(small.events.includes('compress'),false);
});
test('unknown file size and unreadable saved-file inventory never become zero or authorize saving',async()=>{
 for(const invalid of [0,NaN,Infinity]){const f=fixture();f.setBytes(invalid);await assert.rejects(f.photos.prepare('source',draft()),/大小暂不可读取/);assert.equal(f.events.includes('save'),false);}
 const f=fixture();f.port.savedFiles=async()=>{throw new Error('inventory unavailable');};await assert.rejects(f.photos.prepare('source',draft()),/inventory unavailable/);assert.equal(f.events.includes('save'),false);
});
test('full space retains legacy files and blocks adding a new photo without cleanup',async()=>{
 const f=fixture();f.setList([{filePath:'/legacy',size:MAX_SAVED_BYTES}]);await assert.rejects(f.photos.prepare('source',draft()),/空间已满/);assert.equal(f.events.length,0);
});
test('identity changes before saving stop the action; a late save is recorded only under the original owner',async()=>{
 const before=fixture();before.setFileHook(()=>before.setScope('owner-b'));await assert.rejects(before.photos.prepare('source',draft()),/账号已变化/);assert.equal(before.events.length,0);
 const late=fixture();late.setSaveHook(()=>late.setScope('owner-b'));await assert.rejects(late.photos.prepare('source',draft()),/账号已变化/);
 assert.equal(late.photos.read('guest').photos.length,1);assert.equal(late.photos.read('guest').photos[0].state,'retained');assert.equal(late.photos.read('owner-b').photos.length,0);
});
test('ignored metadata writes and corrupted/failed reads remain visible; no false attached receipt',async()=>{
 const ignored=fixture();ignored.ignoreWrites();await assert.rejects(ignored.photos.prepare('source',draft()),/状态未能保存/);assert.equal(ignored.photos.read('guest').photos.length,0);
 const bad=fixture();bad.disk.set('beauty-reference-photos-v1:guest',{schemaVersion:1,scope:'someone-else',photos:[]});await assert.rejects(bad.photos.prepare('source',draft()),/暂不可读取/);assert.equal(bad.events.length,0);
 const down=fixture();down.failRead();await assert.rejects(down.photos.prepare('source',draft()),/read unavailable/);assert.equal(down.events.length,0);
});
test('a simultaneous second photo selection is refused rather than bypassing the local space check',async()=>{
 const f=fixture();let release:()=>void=()=>{};f.port.fileInfo=()=>new Promise(resolve=>{release=()=>resolve({size:1000});});
 const first=f.photos.prepare('source',draft());await assert.rejects(f.photos.prepare('other',draft()),/正在保存/);release();await first;assert.equal(f.events.filter(e=>e==='save').length,1);
});
test('draft saves require matching stored identity and a persistence readback',()=>{
 const f=fixture(),forms=createProductDraftStore(f.storage);const d=forms.read('guest');
 f.ignoreWrites();assert.throws(()=>forms.save({...d,brand:'新填写'},'guest'),/保存未确认/);assert.equal(forms.read('guest').brand,'');
 const down=fixture(),store=createProductDraftStore(down.storage),before=store.read('guest');const writes=down.events.length;down.failRead();assert.throws(()=>store.save({...before,brand:'新填写'},'guest'),/read unavailable/);assert.equal(down.events.length,writes);
});
test('a finished draft cannot be revived by a late save',()=>{
 const f=fixture(),forms=createProductDraftStore(f.storage),old=forms.read('guest');forms.finish(old,'guest');const next=forms.read('guest');assert.notEqual(next.id,old.id);
 assert.throws(()=>forms.save({...old,brand:'迟到内容'},'guest'),/原草稿已结束/);assert.deepEqual(forms.read('guest'),next);
});
test('late OCR cannot overwrite another draft, another owner, or text edited while recognition was pending',()=>{
 const old=draft();assert.throws(()=>assertRecognitionCurrent({...old,scope:'owner-b'},old),/账号或草稿已变化/);
 assert.throws(()=>assertRecognitionCurrent({...old,id:'manual-next'},old),/账号或草稿已变化/);
 assert.throws(()=>assertRecognitionCurrent({...old,ingredientText:'后来手写内容'},old),/新填写内容已保留/);
 assert.doesNotThrow(()=>assertRecognitionCurrent({...old,brand:'后来改品牌'},old));
});
test('photo inventory exposes only the active owner and protects actual references regardless of old attachment state',async()=>{
 const f=fixture(),path=await f.photos.prepare('source',draft());f.setRefs([path]);
 assert.equal((await f.photos.inventory()).photos[0].referenced,true);
 await assert.rejects(f.photos.proposeRemoval(path),/仍被/);assert.ok(!f.events.some(e=>e.startsWith('remove:')));
 f.setScope('owner-b');assert.equal((await f.photos.inventory()).photos.length,0);assert.equal((await f.photos.inventory()).totalBytes,1000);
 await assert.rejects(f.photos.proposeRemoval(path),/归属未确认/);
});
test('single exact proposal is rechecked after confirmation; changed owner, references or file size block deletion',async()=>{
 for(const change of ['owner','reference','size']){
  const f=fixture(),path=await f.photos.prepare('source',draft()),proposal=await f.photos.proposeRemoval(path);
  if(change==='owner')f.setScope('other');if(change==='reference')f.setRefs([path]);if(change==='size')f.setList([{filePath:path,size:999}]);
  await assert.rejects(f.photos.removeConfirmed(proposal.token));assert.ok(!f.events.some(e=>e.startsWith('remove:')));assert.equal(f.photos.read('guest').photos.length,1);
 }
});
test('removal is journaled before the exact file call and requires an absence receipt; unrelated files stay intact',async()=>{
 const f=fixture(),path=await f.photos.prepare('source',draft());f.setList([{filePath:path,size:1000},{filePath:'/untracked',size:2000}]);
 f.setRemoveHook(()=>assert.equal(f.photos.read('guest').photos[0].state,'removing'));
 const proposal=await f.photos.proposeRemoval(path);assert.equal(f.events.some(e=>e.startsWith('remove:')),false);
 await f.photos.removeConfirmed(proposal.token);assert.equal(f.photos.read('guest').photos.length,0);
 assert.deepEqual(await f.port.savedFiles(),[{filePath:'/untracked',size:2000}]);await assert.rejects(f.photos.removeConfirmed(proposal.token),/重新核对/);
});
test('failed delete or unknown absence receipt retains an editable cleanup intent for a later exact retry',async()=>{
 const f=fixture(),path=await f.photos.prepare('source',draft()),remove=f.port.remove;
 f.port.remove=async()=>{throw new Error('file busy');};let proposal=await f.photos.proposeRemoval(path);
 await assert.rejects(f.photos.removeConfirmed(proposal.token),/file busy/);assert.equal(f.photos.read('guest').photos[0].state,'removing');
 f.port.remove=remove;proposal=await f.photos.proposeRemoval(path);await f.photos.removeConfirmed(proposal.token);assert.equal(f.photos.read('guest').photos.length,0);
 const unknown=fixture(),p=await unknown.photos.prepare('source',draft()),token=await unknown.photos.proposeRemoval(p),inventory=unknown.port.savedFiles;
 unknown.setRemoveHook(()=>{unknown.port.savedFiles=async()=>{throw new Error('inventory down');};});
 await assert.rejects(unknown.photos.removeConfirmed(token.token),/inventory down/);assert.equal(unknown.photos.read('guest').photos[0].state,'removing');
 unknown.port.savedFiles=inventory;const retry=await unknown.photos.proposeRemoval(p);assert.equal(retry.present,false);await unknown.photos.removeConfirmed(retry.token);assert.equal(unknown.photos.read('guest').photos.length,0);
});
test('ignored journal writes and unreadable references never permit removal',async()=>{
 const f=fixture(),path=await f.photos.prepare('source',draft()),proposal=await f.photos.proposeRemoval(path);f.ignoreWrites();
 await assert.rejects(f.photos.removeConfirmed(proposal.token),/状态未能保存/);assert.ok(!f.events.some(e=>e.startsWith('remove:')));
 const store=createReferencePhotoStore(f.storage,()=> 'guest',f.port,()=>{throw new Error('references unavailable');});
 await assert.rejects(store.proposeRemoval(path),/references unavailable/);assert.ok(!f.events.some(e=>e.startsWith('remove:')));
});
test('cross-owner imported images and pending drafts are protected by a strictly read-only reference scan',()=>{
 const f=fixture(),initial={localProducts:[],selectedIds:[],skinConcerns:[]},repo=createLocalRepository(f.storage,initial),forms=createProductDraftStore(f.storage);
 repo.activate('other');repo.change(s=>({...s,localProducts:[{id:'manual-shared',brand:'合成',model:'合成',category:'精华',ingredientIds:[],image:'/saved/shared'}]}));
 const form=forms.read('guest');forms.save({...form,image:'/saved/draft'},'guest');const count=f.events.length;
 assert.deepEqual(new Set(readReferencePaths(f.storage,[...f.disk.keys()])),new Set(['/saved/shared','/saved/draft']));assert.equal(f.events.length,count);
 f.disk.set('beauty-mp-product-form-v1:guest',{...form,scope:'other'});assert.throws(()=>readReferencePaths(f.storage,[...f.disk.keys()]),/草稿格式异常/);assert.equal(f.events.length,count);
});
test('malformed final file inventory never confirms removal or erases the recovery journal',async()=>{
 const f=fixture(),path=await f.photos.prepare('source',draft()),proposal=await f.photos.proposeRemoval(path);
 f.setRemoveHook(()=>{f.port.savedFiles=async()=>[{filePath:'',size:0}];});
 await assert.rejects(f.photos.removeConfirmed(proposal.token),/空间暂不可读取/);assert.equal(f.photos.read('guest').photos[0].state,'removing');
});
