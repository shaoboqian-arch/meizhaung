import { Button, Image, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import type { SkinConcern } from "@shared/types";
import { skinConcernOptions } from "../../shared/constants";
import { getSkinConcerns, setSkinConcerns } from "../../shared/storage";
import "../../shared/page.css";
import "./index.css";
import heroCare from "../../assets/illustrations/hero-care.png";
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

  useDidShow(() => {
    setConcerns(getSkinConcerns());
  });

  const toggleConcern = (concern: SkinConcern) => {
    const next = concerns.includes(concern)
      ? concerns.filter((item) => item !== concern)
      : [...concerns, concern];
    setConcerns(next);
    setSkinConcerns(next);
  };

  return (
    <View className="page">
      <View className="skin-hero">
        <View className="hero-copy">
          <Text className="hero-title">记录你的肌肤状态</Text>
          <Text className="hero-subtitle">选择感受，帮你匹配合适成分</Text>
        </View>
        <Image className="hero-art-image" src={heroCare} mode="aspectFit" />
      </View>
      <View className="panel">
        <View className="section-title">
          <Text>我的皮肤情况</Text>
          <Text>本地保存</Text>
        </View>
        <View className="condition-grid">
          {skinConcernOptions.map((concern) => {
            const active = concerns.includes(concern);
            return (
              <Button
                className={active ? "condition-switch active" : "condition-switch"}
                key={concern}
                onClick={() => toggleConcern(concern)}
              >
                <View className="condition-illustration">
                  <Image
                    className="condition-image"
                    src={conditionImages[illustrationClassMap[concern]]}
                    mode="aspectFit"
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
