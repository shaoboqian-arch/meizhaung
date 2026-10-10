import { Button, Input, Text, View } from '@tarojs/components';
import Taro, {useDidShow} from '@tarojs/taro';
import {useEffect,useRef,useState} from 'react';
import {hhid,hhidOwner} from '../shared/hhid';
import './HhidAccount.css';
export default function HhidAccount() {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState<'login'|'create'|'recover'>('login');
  const [phase,setPhase]=useState('unbound'),[uid,setUid]=useState(''),[input,setInput]=useState(''),[password,setPassword]=useState('');
  const [recoveryInput,setRecoveryInput]=useState(''),[code,setCode]=useState(''),[message,setMessage]=useState('连接三小程序共用的 HHID，现有记录不搬迁');
  const [logged,setLogged]=useState(false),lock=useRef(false),alive=useRef(true),owner=useRef(''),generation=useRef(0);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;hhid.invalidate();};},[]);
  function currentOwner() {
    const current=hhidOwner();
    if(current!==owner.current) {
      generation.current++;hhid.invalidate();owner.current=current;
      setUid('');setCode('');setInput('');setPassword('');setRecoveryInput('');setPhase('unbound');setOpen(false);
    }
    setLogged(!!current);return current;
  }
  async function run(action:'refresh'|'submit'|'logout'|'wechat') {
    if(lock.current) return;lock.current=true;setBusy(true);
    let expected='',epoch=generation.current;
    try {
      expected=currentOwner();epoch=generation.current;
      if(action==='wechat') {
        const {signInWithWechat}=await import('../shared/cloud');
        const login=await signInWithWechat();
        if(!alive.current || epoch!==generation.current) return;
        if(!login.ok) {setMessage(login.message);return;}
        expected=currentOwner();epoch=generation.current;
        setOpen(true);
      }
      if(!expected) {setMessage('请先微信登录，再连接 HHID');return;}
      const result=action==='logout'?await hhid.logout():action!=='submit' || phase==='save-pending'?await hhid.refresh():
        mode==='create'?await hhid.create(password):mode==='recover'?await hhid.recover(input,recoveryInput,password):await hhid.login(input,password);
      if(!alive.current || epoch!==generation.current || hhidOwner()!==expected) return;
      setPhase(result.phase);setUid(result.uid || '');setMessage(result.message);
      if(result.recoveryCode) setCode(result.recoveryCode);
      if(action==='submit') {setPassword('');setRecoveryInput('');}
      if(action==='logout') {setCode('');setOpen(false);}
    } catch(error) {
      if(alive.current && epoch===generation.current) {
        const failure=error as Error & {code?:string};
        if(['explicitLoginRequired','unauthenticated'].includes(failure.code || '')) {setPhase('unbound');setInput(uid);}
        if(failure.code==='changed') {setUid('');setCode('');setPhase('unbound');}
        setMessage(error instanceof Error?error.message:'共用账号暂不可用，请重试');
      }
    } finally {lock.current=false;if(alive.current)setBusy(false);}
  }
  useDidShow(()=>{void run('refresh');});
  return <View className="hhid-account">
    <View className="hhid-heading"><Text className="hhid-title">共用账号</Text><Button className="hhid-link" disabled={busy} onClick={()=>setOpen(!open)}>{open?'收起':uid?'管理':'连接 HHID'}</Button></View>
    {uid && <View className="hhid-row"><Text className="hhid-uid">{uid}</Text><Button className="hhid-link" onClick={()=>Taro.setClipboardData({data:uid}).catch(()=>setMessage('复制失败，请重试'))}>复制</Button></View>}
    <Text className="hhid-note">{message}</Text>
    {code && <View className="hhid-recovery"><Text>请自行保管 HHID 和恢复码</Text><Text className="hhid-uid">{code}</Text><Text className="hhid-note">恢复码只显示在本次界面，不会写入备份或日志。</Text><Button className="hhid-button" disabled={busy || phase!=='connected'} onClick={()=>{hhid.acknowledgeRecovery();setCode('');}}>已妥善保管</Button></View>}
    {open && <View className="hhid-form">
      {!logged?<Button className="hhid-button primary" disabled={busy} onClick={()=>run('wechat')}>微信登录</Button>:
        phase==='connected'?<Button className="hhid-button" disabled={busy || !!code} onClick={()=>run('logout')}>断开 HHID</Button>:
        phase==='save-pending'?<Button className="hhid-button primary" disabled={busy} onClick={()=>run('submit')}>重试保存登录状态</Button>:<>
          <View className="hhid-modes">{(['login','create','recover'] as const).map(item=><Button key={item} className={'hhid-link '+(mode===item?'active':'')} disabled={busy} onClick={()=>setMode(item)}>{item==='login'?'连接已有':item==='create'?'新建账号':'恢复账号'}</Button>)}</View>
          {mode!=='create' && <Input className="hhid-input" placeholder="8 位 HHID" value={input} maxlength={8} disabled={busy} onInput={event=>setInput(event.detail.value)} />}
          {mode==='recover' && <Input className="hhid-input" placeholder="10 位恢复码" value={recoveryInput} maxlength={10} password disabled={busy} onInput={event=>setRecoveryInput(event.detail.value)} />}
          <Input className="hhid-input" placeholder={mode==='recover'?'新口令，8–64 位':'口令，8–64 位'} value={password} maxlength={64} password disabled={busy} onInput={event=>setPassword(event.detail.value)} />
          <Button className="hhid-button primary" disabled={busy || password.length<8 || (mode!=='create' && input.trim().length!==8) || (mode==='recover' && recoveryInput.trim().length!==10)} onClick={()=>run('submit')}>{busy?'处理中…':mode==='login'?'连接':mode==='create'?'创建 HHID':'恢复并连接'}</Button>
        </>}
      <Button className="hhid-link" disabled={busy} onClick={()=>run('refresh')}>重新核对</Button>
    </View>}
  </View>;
}
