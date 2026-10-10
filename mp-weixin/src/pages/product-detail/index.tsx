import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { useRef, useState } from "react";
import type { Product } from "@shared/types";
import { ingredients } from "@shared/data/catalog";
import { getAllProducts, getLocalProducts, getSelectedIds, getLocalScope, toggleStoredId, deleteStoredProduct } from "../../shared/storage";
import { detailUrl } from "../../shared/product-view";
import { getProductRecommendationRestriction } from "../../shared/recommendation-policy";
import "../../shared/page.css";
import "../products/index.css";

export default function ProductDetailPage() {
  const id = useRouter().params.id;
  const [product, setProduct] = useState<Product | undefined>();
  const [selected, setSelected] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const view = useRef<{scope:string;generation:number;product:Product} | null>(null);
  const generation = useRef(0), deleting = useRef(false);
  const [busy,setBusy] = useState(false);
  const hideOld = (message:string) => { view.current=null;setProduct(undefined);setLocal(false);setSelected(false);setError(message); };
  useDidShow(() => {
    const request=++generation.current;
    try {
      const scope=getLocalScope(), next=getAllProducts().find(p=>p.id===id);
      const isLocal=getLocalProducts().some(p=>p.id===id), isSelected=getSelectedIds().includes(id ?? "");
      if (getLocalScope()!==scope) throw new Error("账号已变化，请返回重新查找；原数据保留");
      view.current=next?{scope,generation:request,product:next}:null;
      setProduct(next);setLocal(isLocal);setSelected(isSelected);setImageFailed(false);setError("");
    } catch(e) { hideOld(e instanceof Error ? e.message : "读取失败，原数据保留"); }
  });
  const assertCurrent = (expected:NonNullable<typeof view.current>) => {
    if (getLocalScope()!==expected.scope || generation.current!==expected.generation || view.current?.scope!==expected.scope) throw new Error("账号或页面已变化，已停止旧操作；两边原数据保留");
  };
  const toggle = () => {
    const expected=view.current;if (!expected || deleting.current) return;
    try { assertCurrent(expected);setSelected(toggleStoredId(expected.product.id).includes(expected.product.id)); }
    catch(e) { hideOld(e instanceof Error ? e.message : "保存失败，原稿保留"); }
  };
  const remove = async () => {
    const expected=view.current;if (!expected || !local || deleting.current) return;
    deleting.current=true;setBusy(true);
    try {
      assertCurrent(expected);
      const choice=await Taro.showModal({title:"删除这条产品？",content:"只删除这条本机产品并记入待同步删除记录；不会自动写云端。"});
      if (!choice.confirm) return;
      assertCurrent(expected);
      const latest=getLocalProducts().find(p=>p.id===expected.product.id);
      if (!latest || JSON.stringify(latest)!==JSON.stringify(expected.product)) throw new Error("产品内容已更新，旧删除已停止；请重新打开核对");
      deleteStoredProduct(expected.product.id);await Taro.navigateBack();
    } catch(e) {
      // 页面已经显示另一账号时，不让旧弹窗的错误改写当前详情。
      if (generation.current===expected.generation) hideOld(e instanceof Error ? e.message : "删除未保存，原稿保留");
    } finally { deleting.current=false;setBusy(false); }
  };
  return <View className="page">
    {error && <View className="panel"><Text>{error}</Text></View>}
    {!product ? <Text className="muted">产品不存在或暂时无法读取，请返回重新查找</Text> : <>
      <Text className="title">{product.brand} {product.model}</Text><Text className="card-meta">{product.category} · {local ? "我的添加" : "内置产品库"}</Text>
      {local && product.image && (imageFailed ? <Text className="muted">本机图片已失效，产品文字仍保留</Text> :
        <Image className="product-image" src={product.image} mode="aspectFit" onError={() => setImageFailed(true)} />)}
      <Button className="primary-btn" disabled={busy} onClick={toggle}>{selected ? "从当前搭配移除" : "加入当前搭配"}</Button>
      {getProductRecommendationRestriction(product, ingredients) && <View className="panel recommendation-restriction">
        <View className="section-title"><Text>用药信息待核对</Text></View>
        <Text className="muted">{getProductRecommendationRestriction(product, ingredients)}</Text>
      </View>}
      <View className="panel"><View className="section-title"><Text>成分详情</Text></View>
        {product.ingredientIds.map((iid) => { const ingredient = ingredients.find((i) => i.id === iid);
          return ingredient ? <Button className="ingredient-row" key={iid} onClick={() => Taro.navigateTo({ url: detailUrl("ingredient", iid) })}>{ingredient.name} · 查看详情</Button> :
            <Text className="muted" key={iid}>未知成分编号：{iid}</Text>; })}
        {!product.ingredientIds.length && <Text className="muted">成分信息不足，不能据此判断搭配安全</Text>}
      </View>
      {product.notes && <View className="panel"><View className="section-title"><Text>产品备注 / 原始成分文本</Text></View><Text className="muted detail-notes">{product.notes}</Text></View>}
      {local && <Button className="danger-btn" disabled={busy} onClick={remove}>删除我的产品</Button>}
    </>}
  </View>;
}
