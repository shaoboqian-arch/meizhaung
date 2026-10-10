import {Button,Image,Text,View} from '@tarojs/components';
import Taro,{useDidShow} from '@tarojs/taro';
import {useEffect,useRef,useState} from 'react';
import {getLocalScope,getReferencePhotoInventory,proposeReferencePhotoRemoval,removeConfirmedReferencePhoto} from '../shared/storage';
import {MAX_SAVED_BYTES,type PhotoInventory} from '../shared/reference-photo';
import './ReferencePhotos.css';
const space=(bytes:number)=>bytes<1024*1024?Math.ceil(bytes/1024)+' KB':(bytes/1024/1024).toFixed(1)+' MB';
export default function ReferencePhotos(){
  const [open,setOpen]=useState(false),[state,setState]=useState<PhotoInventory|null>(null),[message,setMessage]=useState('参考照片留在本机'),[busy,setBusy]=useState(false);
  const [visible,setVisible]=useState(12);
  const alive=useRef(true),epoch=useRef(0),lock=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;};},[]);
  useDidShow(()=>{epoch.current++;setState(null);setOpen(false);setVisible(12);setMessage('参考照片留在本机');});
  const current=(generation:number,scope:string)=>{try{return alive.current && generation===epoch.current && getLocalScope()===scope;}catch{return false;}};
  async function refresh(){
    if(lock.current)return;lock.current=true;setBusy(true);const generation=epoch.current;let scope='';
    try{scope=getLocalScope();const next=await getReferencePhotoInventory();if(current(generation,scope)){setState(next);setMessage(next.photos.length?'使用中的照片受保护；其余照片逐张确认后清理':'这里还没有参考照片');}}
    catch(error){if(alive.current && generation===epoch.current){setState(null);setMessage(error instanceof Error?error.message:'照片暂不可读取，请重试');}}
    finally{lock.current=false;if(alive.current){if(!current(generation,scope))setState(null);setBusy(false);}}
  }
  async function remove(path:string){
    if(lock.current || !state)return;lock.current=true;setBusy(true);const generation=epoch.current,scope=state.scope;
    try{
      if(!current(generation,scope))throw new Error('账号已变化，请重新核对照片。');
      const proposal=await proposeReferencePhotoRemoval(path);if(!current(generation,scope))return;
      const answer=await Taro.showModal({title:proposal.present?'清理这张参考照片？':'移除这条失效登记？',content:(proposal.present?'这张照片未被产品或草稿使用。删除后无法恢复。':'已确认照片不在本机且没有引用，仅移除它的登记。')+'\n大小：'+space(proposal.bytes)+'\n路径：'+proposal.path,confirmText:proposal.present?'确认清理':'移除登记',cancelText:'保留'});
      if(!answer.confirm || !current(generation,scope))return;
      await removeConfirmedReferencePhoto(proposal.token);
      if(current(generation,scope)){
        const next=await getReferencePhotoInventory();
        if(current(generation,scope)){setState(next);setMessage('清理结果已核对，其他照片保留');}
      }
    }catch(error){if(alive.current && generation===epoch.current){setState(null);setMessage(error instanceof Error?error.message:'清理未确认，登记保留，请重新核对');}}
    finally{lock.current=false;if(alive.current){if(!current(generation,scope))setState(null);setBusy(false);}}
  }
  return <View className="reference-photos">
    <View className="reference-heading"><Text className="reference-title">本机参考照片</Text><Button className="reference-link" disabled={busy} onClick={()=>{setOpen(!open);if(!open)void refresh();}}>{open?'收起':'管理'}</Button></View>
    <Text className="reference-note">{message}</Text>
    {open && <View>
      {state && <Text className="reference-note">本机已保存 {space(state.totalBytes)} / {space(MAX_SAVED_BYTES)} · {state.scope==='guest'?'本机草稿':'当前账号'} {space(state.ownedBytes)}</Text>}
      {state?.photos.slice(0,visible).map((photo,index)=><View className="reference-photo" key={photo.path}>
        {photo.present?<Image className="reference-image" src={photo.path} mode="aspectFill" onClick={()=>Taro.previewImage({current:photo.path,urls:[photo.path]}).catch(()=>setMessage('预览暂不可用，请重试'))}/>:<View className="reference-image reference-missing"><Text>已缺失</Text></View>}
        <View className="reference-copy"><Text className="reference-title">照片 {index+1} · {space(photo.bytes)}</Text><Text className="reference-note">{photo.referenced?'使用中，已保护':photo.state==='removing'?'清理待核对':photo.present?'未引用，已保留':'本机文件已缺失'}</Text></View>
        <Button className="reference-link" disabled={busy || photo.referenced} onClick={()=>remove(photo.path)}>{photo.present?'清理':'移除登记'}</Button>
      </View>)}
      {state && visible<state.photos.length && <Button className="reference-link" disabled={busy} onClick={()=>setVisible(visible+12)}>更多照片（还有 {state.photos.length-visible} 张）</Button>}
      <Button className="reference-link" disabled={busy} onClick={()=>refresh()}>{busy?'核对中…':'重新核对'}</Button>
    </View>}
  </View>;
}
