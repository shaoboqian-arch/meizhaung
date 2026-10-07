import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { useRef, useState } from "react";
import { categories } from "../../shared/constants";
import { recognizeIngredientImage } from "../../shared/ocr";
import type { ProductDraft } from "../../shared/product-draft";
import { readProductDraft, saveProductDraft, commitProductDraft, matchIngredients } from "../../shared/storage";
import { checkContentBeforeSave } from "../../shared/wxsession";
import "../../shared/page.css";
import "../products/index.css";

export default function ProductAddPage() {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const currentDraft = useRef<ProductDraft | null>(null);
  useDidShow(() => { try { const value = readProductDraft(); currentDraft.current = value; setDraft(value); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "读取失败，原稿保留"); } });
  const edit = (patch: Partial<ProductDraft>) => {
    if (!currentDraft.current) return;
    const next = { ...currentDraft.current, ...patch };
    currentDraft.current = next; setDraft(next);
    try { saveProductDraft(next); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "保存失败，当前填写未落盘，请勿退出"); }
  };
  const chooseImage = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album", "camera"] });
      if (!result.tempFiles[0]?.tempFilePath) return;
      const saved = await Taro.saveFile({ tempFilePath: result.tempFiles[0].tempFilePath });
      if (!("savedFilePath" in saved) || !saved.savedFilePath) throw new Error("图片保存失败");
      edit({ image: saved.savedFilePath });
    } catch (e) { setError(e instanceof Error ? e.message : "图片选择失败，请重试"); }
    finally { setBusy(false); }
  };
  const recognize = async () => {
    if (!draft?.image || busy || recognizing) return;
    setRecognizing(true);
    try {
      const text = await recognizeIngredientImage(draft.image);
      if (!text.trim()) {
        setError("没有识别到文字，请拍一张更清晰、正对成分表的照片，或手动粘贴。");
        return;
      }
      edit({ ingredientText: text });
      Taro.showToast({ title: `已识别 ${text.length} 字，请核对`, icon: "none" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "识别失败，请手动粘贴成分表");
    } finally {
      setRecognizing(false);
    }
  };
  const submit = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      if (!draft.brand.trim() || !draft.model.trim()) throw new Error("先填写品牌和型号");
      // 微信内容安全预检：违规/身份失效会抛中文文案阻断；服务不可用自动放行，不卡保存主链路。
      await checkContentBeforeSave([draft.brand, draft.model, draft.ingredientText]);
      saveProductDraft(draft);
      const result = matchIngredients(draft.ingredientText);
      const choice = await Taro.showModal({ title: "核对后入库", content:
        `已匹配 ${result.matches.length} 项，未识别 ${result.unmatchedFragments.length} 段。${result.matches.length ? "仅匹配成分参与分析。" : "成分信息不足，不能据此判断搭配安全。"}请确认已核对原成分表。` });
      if (!choice.confirm) return;
      const saved = commitProductDraft(draft);
      if (!saved.draftReset) { setError("产品已入库；表单重置失败，草稿保留，重复确认不会重复入库"); return; }
      Taro.showToast({ title: "已保存本机，待手动同步", icon: "none" });
      await Taro.navigateBack();
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败，填写内容保留"); }
    finally { setBusy(false); }
  };
  const result = matchIngredients(draft?.ingredientText ?? "");
  return <View className="page"><Text className="title">添加我的产品</Text>
    <Text className="muted compliance">填写内容实时保存在当前账号的本机草稿；返回后可继续。</Text>
    {error && <View className="panel"><Text className="ingredient-caution">{error}</Text></View>}
    {draft && <>
      <View className="panel">
        <Button className="upload-card" disabled={busy} onClick={chooseImage}>{draft.image ? <Image className="upload-image" src={draft.image} mode="aspectFill" /> : "拍照 / 从相册选择"}</Button>
        <Button className="secondary-btn" disabled={!draft.image || busy || recognizing} onClick={recognize}>{recognizing ? "识别中" : draft.image ? "识别图中成分" : "识别图中成分（先拍照或选图）"}</Button>
        <Text className="muted compliance">照片仅本机参考；点按识别时照片经同步服务转发至腾讯云文字识别，不做存储。识别后请逐项核对，也可直接手动粘贴成分表。</Text>
        <Input disabled={busy} className="form-input" value={draft.brand} placeholder="品牌" onInput={(e) => edit({ brand: String(e.detail.value) })} />
        <Input disabled={busy} className="form-input" value={draft.model} placeholder="型号/产品名" onInput={(e) => edit({ model: String(e.detail.value) })} />
        <Picker disabled={busy} mode="selector" range={categories} value={categories.indexOf(draft.category)} onChange={(e) => {
          const category = categories[Number(e.detail.value)]; if (category) edit({ category });
        }}><View className="picker-field">{draft.category}</View></Picker>
        <Textarea disabled={busy} maxlength={-1} className="form-textarea" value={draft.ingredientText} placeholder="粘贴或手输成分表，例如：Niacinamide, Retinol, Ceramide NP"
          onInput={(e) => edit({ ingredientText: String(e.detail.value) })} />
      </View>
      <View className="panel"><View className="section-title"><Text>人工核对</Text><Text>{result.matches.length} 项匹配</Text></View>
        {result.matches.map((m) => <View className="match-review-row" key={m.ingredientId}><Text>{m.ingredientName}</Text><Text className="muted">{m.matchedAlias} · {m.basis}</Text></View>)}
        {!result.matches.length && <Text className="muted">暂无匹配，入库后将按成分信息不足处理。</Text>}
        {!!result.unmatchedFragments.length && <><Text className="ingredient-caution">未识别片段不会参与分析，请核对修正</Text>
          {result.unmatchedFragments.map((f) => <Text className="match-review-row muted" key={f}>{f}</Text>)}</>}
        <Button className="primary-btn" disabled={busy} onClick={submit}>{busy ? "处理中" : "确认成分并入库"}</Button>
      </View>
    </>}
  </View>;
}
