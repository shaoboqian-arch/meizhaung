import { Button, Image, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { analyzeRoutine } from "@shared/data/analyzer";
import { ingredients as seedIngredients } from "@shared/data/catalog";
import type { Product, SkinConcern } from "@shared/types";
import { getAllProducts, getSelectedIds, getSkinConcerns, ingredientNames, toggleStoredId } from "../../shared/storage";
import { analysisItemKey, groupAnalysis, sortCoverage } from "../../shared/analysis-view";
import { Disclosure } from "../../components/Disclosure";
import { buildSceneRecommendation, selectSceneAlternative, sceneLabels, type RoutineScene } from "../../shared/scene-recommendation";
import "../../shared/page.css";
import "./index.css";
import heroAnalysis from "../../assets/illustrations/hero-analysis.png";

export default function AnalysisPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>([]);
  const [scene, setScene] = useState<RoutineScene>("morning");
  const [sceneChoices, setSceneChoices] = useState<Record<RoutineScene, Record<string, string>>>({ morning: {}, evening: {} });

  const refresh = () => {
    try {
    setProducts(getAllProducts());
    setSelectedIds(getSelectedIds());
    setSkinConcerns(getSkinConcerns());
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "本机读取失败，原稿保留", icon: "none" });
    }
  };

  useDidShow(refresh);

  const selectedProducts = useMemo(() => products.filter((product) => selectedIds.includes(product.id)), [products, selectedIds]);
  const sceneResult = useMemo(
    () => buildSceneRecommendation(selectedProducts, products, seedIngredients, skinConcerns, scene, sceneChoices[scene]),
    [selectedProducts, products, skinConcerns, scene, sceneChoices]
  );
  const recommendation = sceneResult.recommendation;
  const recommendedProducts = (recommendation?.productIds ?? [])
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const recommendedIdSet = new Set(recommendation?.productIds ?? []);
  const standaloneIdSet = new Set(recommendation?.standaloneProductIds ?? []);
  const analysis = analyzeRoutine(selectedProducts, seedIngredients, recommendation?.standaloneProductIds ?? [], skinConcerns);
  const groups = groupAnalysis(analysis);
  const analysisClassMap = {
    互相配合: "match",
    互相克制: "caution",
    互相抵消: "offset",
    信息不足: "neutral"
  };
  // 微信 WXSS 选择器不支持中文标识符，而 coverage.status 的取值是中文文案。
  // 这里把「类名」与「显示文案」分开：类名走映射，文案照旧显示中文。
  const coverageClassMap: Record<string, string> = {
    推荐补入: "recommended",
    暂未覆盖: "uncovered"
  };
  const coverageClass = (status: string) => coverageClassMap[status] ?? "unknown";

  const toggleSelected = (productId: string) => {
    try { setSelectedIds(toggleStoredId(productId)); }
    catch { Taro.showToast({ title: "保存失败，原稿保留，请重试", icon: "none" }); }
  };

  return (
    <View className="page">
      <View className="top illustrated">
        <View>
          <Text className="eyebrow">Routine Assistant</Text>
          <Text className="title">搭配助手</Text>
        </View>
        <Image className="top-art-image" src={heroAnalysis} mode="aspectFit" />
        <Text className="count-pill">{selectedProducts.length} 个</Text>
      </View>

      <View className="panel">
        <View className="section-title">
          <Text>当前组合</Text>
          <Text>{selectedProducts.length} 个已选</Text>
        </View>
        {selectedProducts.length === 0 && <Text className="muted">当前组合为空，暂无推荐组合。</Text>}
        {selectedProducts.map((product) => (
          <Button
            className={recommendedIdSet.has(product.id) ? "selected-row overlap" : "selected-row"}
            key={product.id}
            onClick={() => toggleSelected(product.id)}
          >
            <View>
              <Text className="card-title">{product.brand} {product.model}</Text>
              <Text className="muted">{product.category}</Text>
            </View>
            {recommendedIdSet.has(product.id) && <Text className="tag primary">{sceneLabels[scene]}入选</Text>}
          </Button>
        ))}
      </View>

      <View className="panel">
        <View className="section-title"><Text>白话分析</Text><Text>共 {groups.caution.length + groups.cooperation.length + groups.unknown.length} 项</Text></View>
        <Text className="muted scene-note">这里分析原始选择（含备选），不表示建议一次用完。</Text>
        <Disclosure key={`caution:${JSON.stringify(groups.caution)}`} className="analysis-group caution" title={`互相克制 · ${groups.caution.length} 项`}
          summary={groups.caution.some((i) => i.type === "互相抵消") ? "含互相抵消项，需优先核对" : "需要注意或错开的搭配"}>
          {!groups.caution.length && <Text className="muted">暂未发现需要克制的搭配；不代表所有用法均安全。</Text>}
          {groups.caution.map((item) => <View className={`analysis-card ${analysisClassMap[item.type]}`} key={analysisItemKey(item)}>
            <Text className="analysis-type">{item.type}</Text><Text className="card-title">{item.title}</Text>
            <Text className="muted">{item.detail}</Text>
          </View>)}
        </Disclosure>
        <Disclosure key={`cooperation:${JSON.stringify(groups.cooperation)}`} className="analysis-group match" title={`互相配合 · ${groups.cooperation.length} 项`} summary="可互相补足的功效">
          {!groups.cooperation.length && <Text className="muted">暂无明确配合项。</Text>}
          {groups.cooperation.map((item) => <View className="analysis-card match" key={analysisItemKey(item)}>
            <Text className="card-title">{item.title}</Text><Text className="muted">{item.detail}</Text>
          </View>)}
        </Disclosure>
        {groups.unknown.length > 0 && <Disclosure key={`unknown:${JSON.stringify(groups.unknown)}`} className="analysis-group neutral" title={`信息不足 · ${groups.unknown.length} 项`} summary="这些内容不能判定为安全或配合">
          {groups.unknown.map((item) => <View className="analysis-card neutral" key={analysisItemKey(item)}>
            <Text className="card-title">{item.title}</Text><Text className="muted">{item.detail}</Text>
          </View>)}
        </Disclosure>}
        <Text className="muted">成分信息及护肤搭配参考，不构成医疗建议。</Text>
      </View>

      {selectedProducts.length > 0 && <View className="panel scene-controls">
        <View className="section-title"><Text>使用场景</Text><Text>独立取舍</Text></View>
        <View className="scene-tabs">{(["morning", "evening"] as RoutineScene[]).map((value) =>
          <Button key={value} className={`scene-tab ${scene === value ? "active" : ""}`} onClick={() => setScene(value)}>{sceneLabels[value]}</Button>)}</View>
        <Text className="muted scene-note">同一步骤默认一款，未入选产品留作备选。</Text>
      </View>}

      {recommendation && <View className="panel" key={`coverage:${scene}`}>
        <View className="section-title"><Text>针对情况的推荐</Text><Text>共 {recommendation.concernCoverage.length} 项</Text></View>
        {sortCoverage(recommendation.concernCoverage).map((coverage) => <Disclosure
          className={`coverage-card ${coverageClass(coverage.status)}`} key={`${coverage.concern}-${coverage.status}-${coverage.reason}`}
          title={`${coverage.concern} · ${coverage.status}`} summary={`${coverage.candidateCount} 个候选`}>
          <Text className="reason">{coverage.reason}</Text>
        </Disclosure>)}
      </View>}

      {selectedProducts.length > 0 && (
        <>
        <View className="panel scene-recommendation" key={`recommendation:${scene}`}>
          <View className="section-title">
            <Text>{sceneLabels[scene]}推荐组合</Text>
            <Text>{recommendedProducts.length} 个</Text>
          </View>
          {!recommendation && <Text className="muted">本场景暂无可排入的已选产品，不自动把全部选择叠在一起。</Text>}
          {recommendedProducts.map((product) => {
            const usagePlan = recommendation!.usagePlans[product.id];
            const alreadySelected = selectedIds.includes(product.id);
            return (
              <View className={alreadySelected ? "recommend-card overlap" : "recommend-card"} key={product.id}>
                <View className="card-head">
                  <Text className="card-title">{product.brand} {product.model}</Text>
                  <Text className="card-meta">{product.category}</Text>
                </View>
                <View className="tag-row">
                  {standaloneIdSet.has(product.id) && <Text className="tag primary">单独步骤</Text>}
                  {alreadySelected && <Text className="tag primary">当前已有</Text>}
                  {usagePlan && <Text className="tag">{usagePlan.step}</Text>}
                  {usagePlan?.timing.map((tag) => <Text className="tag" key={`${product.id}-${tag}`}>{tag}</Text>)}
                  {usagePlan?.placement.map((tag) => <Text className="tag" key={`${product.id}-${tag}`}>{tag}</Text>)}
                </View>
                <Text className="muted">{ingredientNames(product)}</Text>
              </View>
            );
          })}
        </View>

        <View className="panel scene-other-notes" key={`other-notes:${scene}`}>
          <Disclosure className="scene-other-disclosure" title="其他说明" summary="取舍依据 · 组合说明 · 备选">
          {recommendation && recommendedProducts.length > 0 && <View className="other-note-section selection-explanation">
            <View className="other-note-head"><Text className="other-note-heading">取舍依据</Text><Text className="other-note-count">{recommendedProducts.length} 款入选</Text></View>
            {recommendedProducts.map((product) => <View className="other-selection-row" key={product.id}>
              <View className="other-product-head"><Text className="card-title other-product-name">{product.brand} {product.model}</Text><Text className="other-product-category">{product.category}</Text></View>
              <Text className="other-note-body">{recommendation.reasons[product.id]}</Text>
            </View>)}
          </View>}
          {recommendation && recommendation.advantages.length > 0 && (
            <View className="other-note-section scene-advantages">
              <View className="other-note-head"><Text className="other-note-heading">组合说明</Text><Text className="other-note-count">{recommendation.advantages.length} 项</Text></View>
              {recommendation.advantages.map((advantage, index) => <View className="other-advantage-row" key={advantage}>
                <Text className="other-advantage-index">{index + 1}.</Text><Text className="advantage other-note-body">{advantage}</Text>
              </View>)}
            </View>
          )}
          {sceneResult.alternatives.length > 0 && <View className="other-note-section scene-alternatives">
            <View className="other-note-head"><Text className="other-note-heading">备选</Text><Text className="other-note-count">{sceneResult.alternatives.length} 款未入选</Text></View>
            <Text className="other-note-intro">原始选择仍保留，可按原因换选</Text>
            {sceneResult.alternatives.map(({ product, reason, canReplace }) => <View className="alternative-row" key={product.id}>
              <View className="other-product-head"><Text className="card-title other-product-name">{product.brand} {product.model}</Text>
                {canReplace && <View className="other-note-actions"><Button className="alternative-replace" onClick={() => setSceneChoices((current) => ({ ...current,
                  [scene]: selectSceneAlternative(current[scene], product)
                }))}>改用这款</Button></View>}
                <Text className="other-product-category">{product.category}</Text>
              </View>
              <Text className="other-note-body">{reason}</Text>
            </View>)}
          </View>}
          {Object.keys(sceneChoices[scene]).length > 0 && <View className="other-reset-actions"><Button className="scene-reset" onClick={() => setSceneChoices((current) => ({ ...current, [scene]: {} }))}>恢复自动取舍</Button></View>}
          </Disclosure>
          <View className="other-notice-section"><Text className="other-note-caption">使用提醒</Text>
          {sceneResult.notices.map((note) => <Text className="muted scene-note" key={note}>{note}</Text>)}
          </View>
        </View>
        </>
      )}

    </View>
  );
}
