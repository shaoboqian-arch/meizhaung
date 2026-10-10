import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { categories } from "../../shared/constants";
import { recognizeIngredientImage } from "../../shared/ocr";
import type { ProductDraft } from "../../shared/product-draft";
import { readProductDraft, saveProductDraft, commitProductDraft, matchIngredients, getLocalScope, prepareReferencePhoto, attachReferencePhoto } from "../../shared/storage";
import { assertDraftCurrent, assertRecognitionCurrent } from "../../shared/reference-photo";
import { checkContentBeforeSave } from "../../shared/wxsession";
import "../../shared/page.css";
import "../products/index.css";

export default function ProductAddPage() {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const currentDraft = useRef<ProductDraft | null>(null);
  const pendingDrafts = useRef(new Map<string, ProductDraft>());
  const generation = useRef(0), active = useRef<number | null>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; active.current = null; }; }, []);
  const invalidate = () => { generation.current++; active.current = null; setBusy(false); setRecognizing(false); };
  useDidShow(() => {
    try {
      const scope = getLocalScope(), stored = readProductDraft();
      if (stored.scope !== scope) throw new Error("账号已变化，请重新打开；原稿保留");
      const pending = pendingDrafts.current.get(scope);
      const value = pending?.id === stored.id ? pending : stored;
      if (currentDraft.current?.scope !== value.scope || currentDraft.current?.id !== value.id) invalidate();
      currentDraft.current = value; setDraft(value);
      setError(value === pending ? "上次填写尚未确认保存，当前内容已保留；继续编辑或确认入库可重试。" : "");
    } catch (e) {
      invalidate(); currentDraft.current = null; setDraft(null);
      setError(e instanceof Error ? e.message : "读取失败，原稿保留，请重试");
    }
  });
  const current = (request: number) => alive.current && generation.current === request && active.current === request;
  const begin = (recognition = false) => {
    if (active.current !== null || !currentDraft.current) return null;
    const request = ++generation.current; active.current = request;
    if (recognition) setRecognizing(true); else setBusy(true);
    return request;
  };
  const finish = (request: number) => { if (current(request)) { active.current = null; setBusy(false); setRecognizing(false); } };
  const assertExpected = (expected: ProductDraft) => {
    assertDraftCurrent(currentDraft.current, expected);
    if (getLocalScope() !== expected.scope) throw new Error("账号已变化，原账号填写与照片保留，请重新打开。");
  };
  const report = (e: unknown, request: number) => {
    if (!current(request)) return;
    const text = e instanceof Error ? e.message : "处理失败，当前填写与照片保留，请重试";
    try {
      if (!currentDraft.current || getLocalScope() !== currentDraft.current.scope) { invalidate(); currentDraft.current = null; setDraft(null); }
    } catch { invalidate(); currentDraft.current = null; setDraft(null); }
    setError(text);
  };
  const edit = (patch: Partial<ProductDraft>, expected?: ProductDraft) => {
    let next: ProductDraft | undefined;
    try {
      if (!currentDraft.current) return false;
      if (expected) assertExpected(expected);
      if (getLocalScope() !== currentDraft.current.scope) throw new Error("账号已变化，原账号填写与照片保留，请重新打开。");
      next = { ...currentDraft.current, ...patch };
      currentDraft.current = next; setDraft(next);
      saveProductDraft(next); pendingDrafts.current.delete(next.scope); setError(""); return true;
    } catch (e) {
      if (next) pendingDrafts.current.set(next.scope, next);
      setError(e instanceof Error ? e.message : "保存失败，当前填写未落盘，请勿退出"); return false;
    }
  };
  const chooseImage = async () => {
    const request = begin(); if (request === null) return;
    const expected = { ...currentDraft.current! };
    try {
      const result = await Taro.chooseMedia({ count: 1, mediaType: ["image"], sourceType: ["album", "camera"] });
      if (!current(request) || !result.tempFiles[0]?.tempFilePath) return;
      assertExpected(expected);
      const saved = await prepareReferencePhoto(result.tempFiles[0].tempFilePath,expected);
      if (!current(request)) return;
      assertExpected(expected);
      if (edit({ image:saved },expected)) attachReferencePhoto(expected,saved,expected.image);
    } catch (e) { if (!/cancel/i.test(e instanceof Error ? e.message : String((e as {errMsg?:string})?.errMsg || ""))) report(e,request); }
    finally { finish(request); }
  };
  const recognize = async () => {
    if (!currentDraft.current?.image) return;
    const request = begin(true); if (request === null) return;
    const expected = { ...currentDraft.current! };
    try {
      const text = await recognizeIngredientImage(expected.image);
      if (!current(request)) return;
      assertExpected(expected); assertRecognitionCurrent(currentDraft.current,expected);
      if (!text.trim()) { setError("没有识别到文字，请拍一张更清晰、正对成分表的照片，或手动粘贴。"); return; }
      if (edit({ ingredientText:text },expected)) Taro.showToast({ title: `已识别 ${text.length} 字，请核对`, icon: "none" });
    } catch (e) { report(e,request); }
    finally { finish(request); }
  };
  const submit = async () => {
    const request = begin(); if (request === null) return;
    const expected = { ...currentDraft.current! };
    const assertSnapshot = () => {
      assertExpected(expected);
      if (JSON.stringify(currentDraft.current) !== JSON.stringify(expected) || JSON.stringify(readProductDraft()) !== JSON.stringify(expected)) {
        throw new Error("填写内容已变化，已停止旧请求；请核对当前原稿后再确认。");
      }
    };
    try {
      if (!expected.brand.trim() || !expected.model.trim()) throw new Error("先填写品牌和型号");
      saveProductDraft(expected); pendingDrafts.current.delete(expected.scope);
      await checkContentBeforeSave([expected.brand, expected.model, expected.ingredientText]);
      if (!current(request)) return;
      assertSnapshot();
      const result = matchIngredients(expected.ingredientText);
      const choice = await Taro.showModal({ title: "核对后入库", content:
        `已匹配 ${result.matches.length} 项，未识别 ${result.unmatchedFragments.length} 段。${result.matches.length ? "仅匹配成分参与分析。" : "成分信息不足，不能据此判断搭配安全。"}请确认已核对原成分表。` });
      if (!current(request) || !choice.confirm) return;
      assertSnapshot();
      const saved = commitProductDraft(expected);
      if (!saved.draftReset) { setError("产品已入库；表单重置状态未确认，请保留当前页面，重复确认不会重复入库"); return; }
      Taro.showToast({ title: "已保存本机，待手动同步", icon: "none" });
      await Taro.navigateBack();
    } catch (e) { report(e,request); }
    finally { finish(request); }
  };
  const result = matchIngredients(draft?.ingredientText ?? "");
  return <View className="page"><Text className="title">添加我的产品</Text>
    <Text className="muted compliance">填写内容实时保存在当前账号的本机草稿；返回后可继续。</Text>
    {error && <View className="panel"><Text className="ingredient-caution">{error}</Text></View>}
    {draft && <>
      <View className="panel">
        <Button className="upload-card" disabled={busy || recognizing} onClick={chooseImage}>{draft.image ? <Image className="upload-image" src={draft.image} mode="aspectFill" /> : "拍照 / 从相册选择"}</Button>
        <Button className="secondary-btn" disabled={!draft.image || busy || recognizing} onClick={recognize}>{recognizing ? "识别中" : draft.image ? "识别图中成分" : "识别图中成分（先拍照或选图）"}</Button>
        <Text className="muted compliance">参考照片保存在本机，不写入产品云表。点按识别时，压缩照片经服务端发送至腾讯云文字识别；识别后请核对，也可手动粘贴成分表。</Text>
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
        <Button className="primary-btn" disabled={busy || recognizing} onClick={submit}>{busy ? "处理中" : "确认成分并入库"}</Button>
      </View>
    </>}
  </View>;
}
