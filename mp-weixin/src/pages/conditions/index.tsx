import { Button, Image, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import type { SkinConcern } from "@shared/types";
import { skinConcernOptions } from "../../shared/constants";
import {
  getSkinConcerns,
  getLocalScope,
  needsCloudPull,
  pullFromCloud,
  setSkinConcerns,
  getSyncHint,
  runUserSyncAction
} from "../../shared/storage";
import "../../shared/page.css";
import "./index.css";
import heroCare from "../../assets/illustrations/hero-care.png";
import HhidAccount from "../../components/HhidAccount";
import ReferencePhotos from "../../components/ReferencePhotos";
import conditionAcne from "../../assets/illustrations/condition-acne.png";
import conditionDry from "../../assets/illustrations/condition-dry.png";
import conditionSensitive from "../../assets/illustrations/condition-sensitive.png";
import conditionRedness from "../../assets/illustrations/condition-redness.png";
import conditionOil from "../../assets/illustrations/condition-oil.png";
import conditionPore from "../../assets/illustrations/condition-pore.png";
import conditionBlackhead from "../../assets/illustrations/condition-blackhead.png";
import conditionDull from "../../assets/illustrations/condition-dull.png";
import conditionSpot from "../../assets/illustrations/condition-spot.png";
import conditionBarrier from "../../assets/illustrations/condition-barrier.png";
import conditionNeck from "../../assets/illustrations/condition-neck.png";
import conditionSagging from "../../assets/illustrations/condition-sagging.png";
import conditionFineLines from "../../assets/illustrations/condition-fine-lines.png";

const illustrationClassMap: Record<SkinConcern, string> = {
  痘多: "acne",
  干燥: "dry",
  敏感: "sensitive",
  泛红: "redness",
  出油多: "oil",
  毛孔粗: "pore",
  黑头: "blackhead",
  暗沉: "dull",
  色斑: "spot",
  屏障弱: "barrier",
  颈纹: "neck",
  松弛: "sagging",
  纹路: "finelines"
};

const conditionImages: Record<string, string> = {
  acne: conditionAcne,
  dry: conditionDry,
  sensitive: conditionSensitive,
  redness: conditionRedness,
  oil: conditionOil,
  pore: conditionPore,
  blackhead: conditionBlackhead,
  dull: conditionDull,
  spot: conditionSpot,
  barrier: conditionBarrier,
  neck: conditionNeck,
  sagging: conditionSagging,
  finelines: conditionFineLines
};

const concernDescriptions: Record<SkinConcern, string> = {
  痘多: "易长痘、闭口、粉刺",
  干燥: "紧绷起皮、缺水",
  敏感: "刺痛、灼热、易泛红",
  泛红: "脸颊/鼻周泛红",
  出油多: "T区出油旺盛",
  毛孔粗: "毛孔粗大、肤质不平",
  黑头: "黑头粉刺明显",
  暗沉: "肤色不均、气色不佳",
  色斑: "色斑、晒斑、肤色不匀",
  屏障弱: "易泛红、脱皮、换季不适",
  颈纹: "颈部横纹、皮肤松弛下垂",
  松弛: "面部轮廓松垮、缺乏弹性",
  纹路: "法令纹、抬头纹、眼角细纹"
};

export default function ConditionsPage() {
  const [concerns, setConcerns] = useState<SkinConcern[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [cloudHint, setCloudHint] = useState<string>("未登录，数据只存本机");

  const [ready,setReady] = useState(false);
  const loadedScope=useRef<string | null>(null), viewEpoch=useRef(0), syncBusy=useRef(false), alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;viewEpoch.current++;loadedScope.current=null;};},[]);
  const loadCurrent = () => {
    const scope=getLocalScope(), next=getSkinConcerns(), hint=getSyncHint();
    if (getLocalScope()!==scope) throw new Error("账号已变化，请重新打开；原记录保留");
    loadedScope.current=scope;setConcerns(next);setCloudHint(hint);setReady(true);
    return scope;
  };
  const hideUnknown = (error:unknown) => {
    loadedScope.current=null;setReady(false);setConcerns([]);
    setCloudHint(error instanceof Error ? error.message : "本机读取异常，原记录保留，请重试读取");
  };
  useDidShow(() => {
    const epoch=++viewEpoch.current;
    try {
      const scope=loadCurrent();
      if (needsCloudPull()) void pullFromCloud().then(result=>{
        if (!alive.current || epoch!==viewEpoch.current) return;
        try {
          if (getLocalScope()!==scope) return;
          if (result.ok) loadCurrent();
          setCloudHint(result.message);
        } catch(error) { hideUnknown(error); }
      }).catch(error=>{if(alive.current && epoch===viewEpoch.current) hideUnknown(error);});
    } catch(error) { hideUnknown(error); }
  });
  const toggleConcern = (concern:SkinConcern) => {
    if (!ready || syncBusy.current || !loadedScope.current) return;
    try {
      if (getLocalScope()!==loadedScope.current) throw new Error("账号已变化，旧选择未写入；请重新打开当前护肤记录");
      // 以当前分区原始记录计算增量，不把旧页面数组覆盖到后来账号。
      const original=getSkinConcerns();
      const next=original.includes(concern)?original.filter(item=>item!==concern):[...original,concern];
      setSkinConcerns(next);setConcerns(next);setCloudHint(getSyncHint());
    } catch(error) { hideUnknown(error); }
  };
  const runSync = async (mode:"save" | "read") => {
    if (syncBusy.current || (mode==='save' && !ready)) return;
    syncBusy.current=true;setSyncing(true);const epoch=viewEpoch.current;
    Taro.showToast({title:mode==='save'?"保存中…":"读取中…",icon:"none"});
    try {
      const result=await runUserSyncAction(mode);
      if (!alive.current || epoch!==viewEpoch.current) return;
      if (result.ok) loadCurrent();
      setCloudHint(result.message);Taro.showToast({title:result.message,icon:result.ok?"success":"none"});
    } catch(error) { if(alive.current && epoch===viewEpoch.current) hideUnknown(error); }
    finally { syncBusy.current=false;if(alive.current)setSyncing(false); }
  };

  return (
    <View className="page">
      <View className="skin-hero">
        <View className="hero-copy">
          <Text className="hero-title">我的护肤记录</Text>
          <Text className="hero-subtitle">选择感受，帮你匹配合适成分</Text>
        </View>
        <Image className="hero-art-image" src={heroCare} mode="aspectFit" />
      </View>
      <View className="panel account-panel">
        <View className="section-title">
          <Text>账号与同步</Text>
        </View>
        <Text className="cloud-status">{cloudHint}</Text>
        <View className="cloud-actions">
          <View className="cloud-pair">
            <Button className="cloud-action primary" onClick={() => runSync("save")} disabled={syncing || !ready}>保存</Button>
            <Button className="cloud-action" onClick={() => runSync("read")} disabled={syncing}>读取</Button>
          </View>
        </View>
        <Text className="cloud-note">
          保存到云端，读取到本机。需要时自动微信登录；失败不丢本机内容。
        </Text>
        <HhidAccount />
        <ReferencePhotos key={ready ? loadedScope.current : 'unavailable'} />
      </View>
      <View className="panel">
        <View className="section-title"><Text>我的皮肤情况</Text><Text>{ready ? concerns.length + " 项" : "暂未读取"}</Text></View>
        <View className="condition-grid">
          {skinConcernOptions.map((concern) => {
            const active = concerns.includes(concern);
            return (
              <Button
                className={active ? "condition-switch active" : "condition-switch"}
                key={concern}
                disabled={syncing || !ready}
                onClick={() => toggleConcern(concern)}
              >
                <View className="condition-illustration">
                  <Image
                    className="condition-image"
                    src={conditionImages[illustrationClassMap[concern]]}
                    mode="aspectFill"
                  />
                </View>
                <View className="condition-copy">
                  <Text className="condition-name">{concern}</Text>
                  <Text className="condition-desc">{concernDescriptions[concern]}</Text>
                </View>
                <Text className="switch-dot">{active ? "开" : "关"}</Text>
              </Button>
            );
          })}
        </View>
      </View>
      <View className="panel">
        <Text className="muted">仅作为护肤搭配参考，不构成医疗建议。推荐会优先减少刺激叠加，并补齐保湿、修护、防晒等基础步骤。</Text>
      </View>
    </View>
  );
}
