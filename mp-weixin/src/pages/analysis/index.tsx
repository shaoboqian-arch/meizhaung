import { Button, Image, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";
import { analyzeRoutine } from "@shared/data/analyzer";
import { ingredients as seedIngredients } from "@shared/data/catalog";
import { buildRoutineRecommendation } from "@shared/data/recommender";
import type { Product, SkinConcern } from "@shared/types";
import { getAllProducts, getSelectedIds, getSkinConcerns, ingredientNames, toggleStoredId } from "../../shared/storage";
import "../../shared/page.css";
import "./index.css";
import heroAnalysis from "../../assets/illustrations/hero-analysis.png";

export default function AnalysisPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [skinConcerns, setSkinConcerns] = useState<SkinConcern[]>([]);

  const refresh = () => {
    setProducts(getAllProducts());
    setSelectedIds(getSelectedIds());
    setSkinConcerns(getSkinConcerns());
  };

  useDidShow(refresh);

  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const recommendation = useMemo(
    () => buildRoutineRecommendation(selectedProducts, products, seedIngredients, skinConcerns),
    [selectedProducts, products, skinConcerns]
  );
  const recommendedProducts = (recommendation?.productIds ?? [])
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const recommendedIdSet = new Set(recommendation?.productIds ?? []);
  const standaloneIdSet = new Set(recommendation?.standaloneProductIds ?? []);
  const analysis = analyzeRoutine(selectedProducts, seedIngredients, recommendation?.standaloneProductIds ?? [], skinConcerns);
  const analysisClassMap = {
    互相配合: "match",
    互相克制: "caution",
    互相抵消: "offset",
    信息不足: "neutral"
  };

  const toggleSelected = (productId: string) => {
    setSelectedIds(toggleStoredId(productId));
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
            {recommendedIdSet.has(product.id) && <Text className="tag primary">推荐重合</Text>}
          </Button>
        ))}
      </View>

      {recommendation && (
        <View className="panel">
          <View className="section-title">
            <Text>推荐组合</Text>
            <Text>{recommendedProducts.length} 个</Text>
          </View>
          {recommendedProducts.map((product) => {
            const usagePlan = recommendation.usagePlans[product.id];
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
                <Text className="reason">{recommendation.reasons[product.id]}</Text>
              </View>
            );
          })}
          <View className="section-title sub-title">
            <Text>针对情况的推荐</Text>
            <Text>{recommendation.concernCoverage.length} 项情况</Text>
          </View>
          {recommendation.concernCoverage.map((coverage) => (
            <View className={`coverage-card ${coverage.status}`} key={coverage.concern}>
              <View className="coverage-head">
                <Text className="card-title">{coverage.concern}</Text>
                <Text className="tag primary">{coverage.status}</Text>
                <Text className="candidate-count">{coverage.candidateCount} 个候选</Text>
              </View>
              <Text className="reason">{coverage.reason}</Text>
            </View>
          ))}
          {recommendation.advantages.length > 0 && (
            <>
              <View className="section-title sub-title support-title">
                <Text>组合安全补充</Text>
                <Text>{recommendation.advantages.length} 条</Text>
              </View>
              {recommendation.advantages.map((advantage) => <Text className="advantage" key={advantage}>{advantage}</Text>)}
            </>
          )}
        </View>
      )}

      <View className="panel">
        <View className="section-title">
          <Text>白话分析</Text>
          <Text>{analysis.length} 条</Text>
        </View>
        {analysis.map((item) => (
          <View className={`analysis-card ${analysisClassMap[item.type]}`} key={`${item.type}-${item.title}`}>
            <Text className="analysis-type">{item.type}</Text>
            <Text className="card-title">{item.title}</Text>
            <Text className="muted">{item.detail}</Text>
          </View>
        ))}
        <Text className="muted">以上为成分信息参考和护肤搭配参考，不构成医疗建议。</Text>
      </View>
    </View>
  );
}
