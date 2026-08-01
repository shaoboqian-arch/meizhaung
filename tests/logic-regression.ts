import assert from "node:assert/strict";
import { getMatchingIngredientRelations } from "../src/data/analyzer";
import { ingredients, products } from "../src/data/catalog";
import { allSkinConcerns } from "../src/data/concernProfiles";
import { matchIngredientText } from "../src/data/ingredientMatcher";
import { buildRoutineRecommendation, getConcernCandidateProducts } from "../src/data/recommender";
import { mergeRoutineSnapshots, type RoutineSnapshot } from "../src/data/routineMerge";
import {
  getUngroupedAnalysisForDisplay,
  groupAnalysisForDisplay,
  shouldCollapseAnalysisDetail,
  shouldCollapseCoverageReason,
  shouldCollapseRecommendationReason,
  sortAnalysisForDisplay,
  sortConcernCoverageForDisplay,
  sortRecommendedProductsForDisplay
} from "../src/features/recommendationPresentation";
import type { AnalysisResult, ConcernCoverage, Product, SkinConcern } from "../src/types";

const getProducts = (ids: string[]) => ids
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => Boolean(product));

const hardRelations = (items: Product[], standaloneIds: string[] = []) =>
  getMatchingIngredientRelations(items, ingredients, standaloneIds)
    .filter((relation) => relation.type !== "互相配合");

const brandCount = (keyword: string) =>
  products.filter((product) => product.brand.toLowerCase().includes(keyword.toLowerCase())).length;

const syncedProduct = (id: string, notes: string): Product => ({
  id,
  brand: "测试品牌",
  model: id,
  category: "精华",
  ingredientIds: [],
  notes
});

const mergeBase: RoutineSnapshot = {
  selectedIds: ["product-a"],
  skinConcerns: ["干燥"],
  localProducts: [syncedProduct("manual-a", "原始")]
};
const mergedSnapshot = mergeRoutineSnapshots(
  mergeBase,
  {
    selectedIds: ["product-b"],
    skinConcerns: ["干燥", "痘多"],
    localProducts: [syncedProduct("manual-a", "本机修改")]
  },
  {
    selectedIds: ["product-a", "product-c"],
    skinConcerns: ["干燥", "泛红"],
    localProducts: [syncedProduct("manual-a", "原始"), syncedProduct("manual-b", "另一设备新增")]
  }
);
assert.deepEqual(mergedSnapshot.selectedIds.sort(), ["product-b", "product-c"], "双设备产品选择合并失败");
assert.deepEqual(mergedSnapshot.skinConcerns.sort(), ["干燥", "泛红", "痘多"].sort(), "双设备情况合并失败");
assert.equal(mergedSnapshot.localProducts.find((product) => product.id === "manual-a")?.notes, "本机修改", "本机产品修改被覆盖");
assert.ok(mergedSnapshot.localProducts.some((product) => product.id === "manual-b"), "另一设备新增产品丢失");

assert.ok(products.length >= 350, `产品库不足 350 项：${products.length}`);
assert.ok(ingredients.length >= 50, `成分库不足 50 项：${ingredients.length}`);
assert.equal(new Set(products.map((product) => product.id)).size, products.length, "产品 ID 重复");
assert.equal(new Set(ingredients.map((ingredient) => ingredient.id)).size, ingredients.length, "成分 ID 重复");

const knownIngredientIds = new Set(ingredients.map((ingredient) => ingredient.id));
const unknownReferences = products.flatMap((product) =>
  product.ingredientIds
    .filter((id) => !knownIngredientIds.has(id))
    .map((id) => `${product.id}:${id}`)
);
assert.deepEqual(unknownReferences, [], `产品引用未知成分：${unknownReferences.join(", ")}`);
assert.ok(brandCount("unny") >= 10, `UNNY 产品不足 10 项：${brandCount("unny")}`);
assert.ok(brandCount("la mer") >= 15, `La Mer 产品不足 15 项：${brandCount("la mer")}`);
assert.ok(brandCount("la prairie") >= 20, `La Prairie 产品不足 20 项：${brandCount("la prairie")}`);
assert.ok(brandCount("valmont") >= 15, `法尔曼产品不足 15 项：${brandCount("valmont")}`);
assert.ok(brandCount("rubinstein") >= 18, `赫莲娜产品不足 18 项：${brandCount("rubinstein")}`);
assert.equal(buildRoutineRecommendation([], products, ingredients, ["痘多"]), null, "空组合不应产生推荐");

const baseProduct = products.find((product) => product.id === "skinceuticals-ce");
assert.ok(baseProduct, "缺少基准产品 skinceuticals-ce");

const candidateCounts = Object.fromEntries(allSkinConcerns.map((concern) => {
  const candidates = getConcernCandidateProducts(concern, products, ingredients, [concern]);
  assert.ok(candidates.length >= 8, `${concern}候选产品不足 8 项：${candidates.length}`);

  const recommendation = buildRoutineRecommendation([baseProduct], products, ingredients, [concern]);
  assert.ok(recommendation, `${concern}未生成推荐`);
  assert.equal(recommendation.concernCoverage.length, 1, `${concern}覆盖结果数量异常`);
  assert.notEqual(recommendation.concernCoverage[0].status, "暂未覆盖", `${concern}未被最终组合覆盖`);
  assert.equal(recommendation.concernCoverage[0].candidateCount, candidates.length, `${concern}候选数量口径不一致`);
  assert.deepEqual(
    hardRelations(getProducts(recommendation.productIds), recommendation.standaloneProductIds),
    [],
    `${concern}推荐存在硬冲突`
  );
  return [concern, candidates.length];
}));

const complexConcernGroups: SkinConcern[][] = [
  ["痘多", "干燥", "敏感", "泛红", "屏障弱"],
  ["出油多", "毛孔粗", "黑头", "暗沉", "色斑"],
  ["干燥", "颈纹", "松弛", "纹路"],
  allSkinConcerns
];

for (const concernGroup of complexConcernGroups) {
  const recommendation = buildRoutineRecommendation([baseProduct], products, ingredients, concernGroup);
  assert.ok(recommendation, `复杂情况未生成推荐：${concernGroup.join("+")}`);
  const uncovered = recommendation.concernCoverage
    .filter((coverage) => coverage.status === "暂未覆盖")
    .map((coverage) => coverage.concern);
  assert.deepEqual(uncovered, [], `复杂情况仍有未覆盖项：${concernGroup.join("+")} -> ${uncovered.join("、")}`);
  assert.deepEqual(
    hardRelations(getProducts(recommendation.productIds), recommendation.standaloneProductIds),
    [],
    `复杂情况推荐存在硬冲突：${concernGroup.join("+")}`
  );
  const repeated = buildRoutineRecommendation([baseProduct], products, ingredients, concernGroup);
  assert.deepEqual(repeated?.productIds, recommendation.productIds, `相同输入结果不稳定：${concernGroup.join("+")}`);
  assert.deepEqual(
    Object.keys(recommendation.usagePlans).sort(),
    [...recommendation.productIds].sort(),
    `使用计划未覆盖全部推荐产品：${concernGroup.join("+")}`
  );
}

for (const product of products) {
  const recommendation = buildRoutineRecommendation([product], products, ingredients, []);
  assert.ok(recommendation, `单产品未生成推荐：${product.id}`);
  assert.deepEqual(
    hardRelations(getProducts(recommendation.productIds), recommendation.standaloneProductIds),
    [],
    `单产品推荐存在硬冲突：${product.id}`
  );
}

let conflictPairCount = 0;
for (let leftIndex = 0; leftIndex < products.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < products.length; rightIndex += 1) {
    const pair = [products[leftIndex], products[rightIndex]];
    if (hardRelations(pair).length === 0) continue;
    conflictPairCount += 1;
    const recommendation = buildRoutineRecommendation(pair, products, ingredients, []);
    assert.ok(recommendation, `冲突组合未生成推荐：${pair.map((product) => product.id).join("+")}`);
    assert.deepEqual(
      hardRelations(getProducts(recommendation.productIds), recommendation.standaloneProductIds),
      [],
      `冲突组合推荐仍有硬冲突：${pair.map((product) => product.id).join("+")}`
    );
  }
}
assert.ok(conflictPairCount > 0, "产品库未覆盖任何冲突组合测试");

console.log(JSON.stringify({
  products: products.length,
  ingredients: ingredients.length,
  brands: {
    unny: brandCount("unny"),
    laMer: brandCount("la mer"),
    laPrairie: brandCount("la prairie"),
    valmont: brandCount("valmont"),
    helenaRubinstein: brandCount("rubinstein")
  },
  candidateCounts,
  conflictPairCount
}, null, 2));
console.log("Logic regression passed.");

const cleanser = products.find((product) => product.id === "cerave-cleanser");
const acidProduct = products.find((product) => product.id === "paula-bha");
const retinolProduct = products.find((product) => product.id === "ordinary-retinol");
assert.ok(cleanser, "Missing baseline cleanser");
assert.ok(acidProduct, "Missing baseline acid product");
assert.ok(retinolProduct, "Missing baseline retinol product");

const cleanserWithLeaveOn = buildRoutineRecommendation(
  [cleanser, baseProduct],
  products,
  ingredients,
  []
);
assert.ok(cleanserWithLeaveOn, "Cleanser plus leave-on products did not produce a recommendation");
assert.ok(
  cleanserWithLeaveOn.productIds.includes(cleanser.id),
  "Cleanser plus leave-on products did not retain the best cleanser"
);
assert.ok(
  cleanserWithLeaveOn.standaloneProductIds?.includes(cleanser.id),
  "Best cleanser was not kept as a standalone step"
);

const cleanserAcidRetinolSerum = buildRoutineRecommendation(
  [cleanser, acidProduct, retinolProduct, baseProduct],
  products,
  ingredients,
  []
);
assert.ok(cleanserAcidRetinolSerum, "Cleanser plus acid plus retinol plus serum did not produce a recommendation");
assert.ok(
  cleanserAcidRetinolSerum.productIds.includes(cleanser.id),
  "A later rule overwrote the best cleanser"
);
assert.ok(
  cleanserAcidRetinolSerum.standaloneProductIds?.includes(cleanser.id),
  "A later rule did not keep the best cleanser standalone"
);
assert.ok(
  cleanserAcidRetinolSerum.productIds.includes(retinolProduct.id),
  "Acid and retinol rule unexpectedly removed retinol"
);
assert.ok(
  !cleanserAcidRetinolSerum.productIds.includes(acidProduct.id),
  "Acid and retinol rule did not remove acid"
);
assert.equal(
  new Set(cleanserAcidRetinolSerum.productIds).size,
  cleanserAcidRetinolSerum.productIds.length,
  "Recommendation has duplicate products"
);
assert.deepEqual(
  hardRelations(getProducts(cleanserAcidRetinolSerum.productIds), cleanserAcidRetinolSerum.standaloneProductIds),
  [],
  "Recommendation still contains a hard conflict"
);
assert.ok(
  cleanserAcidRetinolSerum.advantages.some((advantage) => advantage.includes("\u5df2\u79fb\u9664\u9178\u7c7b")),
  "Acid removal explanation is missing"
);
assert.ok(
  cleanserAcidRetinolSerum.advantages.every((advantage) => !advantage.includes("\u62c6\u5f00\u4f7f\u7528")),
  "Acid removal copy still claims split use"
);

const matchedIngredientText = matchIngredientText(
  "\u6210\u5206\uff1a\u70df\u9160\u80fa, NIACINAMIDE; Ceramide NP | Retinolate",
  ingredients
);
assert.deepEqual(
  matchedIngredientText.matches.map((match) => match.ingredientId).sort(),
  ["ceramide", "niacinamide"],
  "OCR matcher did not cover Chinese and English aliases"
);
assert.ok(
  matchedIngredientText.unmatchedFragments.includes("Retinolate"),
  "OCR matcher treated a substring as retinol"
);

const displayProducts = sortRecommendedProductsForDisplay([cleanser, baseProduct], [cleanser.id]);
assert.deepEqual(
  displayProducts.map((product) => product.id),
  [baseProduct.id, cleanser.id],
  "Recommended additions are not sorted before existing products"
);
const displayCoverage: ConcernCoverage[] = [
  { concern: allSkinConcerns[0], candidateCount: 1, status: "\u5df2\u6709\u8986\u76d6", productIds: [baseProduct.id], reason: "covered" },
  { concern: allSkinConcerns[1], candidateCount: 1, status: "\u63a8\u8350\u8865\u5165", productIds: [cleanser.id], reason: "added" }
];
assert.equal(
  sortConcernCoverageForDisplay(displayCoverage)[0].status,
  "\u63a8\u8350\u8865\u5165",
  "Concern recommendations did not sort additions first"
);
const displayAnalysis: AnalysisResult[] = [
  { type: "\u4e92\u76f8\u914d\u5408", title: "pair", detail: "pair", productIds: [] },
  { type: "\u4e92\u76f8\u914d\u5408", title: "pair-two", detail: "pair-two", productIds: [] },
  { type: "\u4e92\u76f8\u514b\u5236", title: "conflict", detail: "conflict", productIds: [] },
  { type: "\u4e92\u76f8\u62b5\u6d88", title: "cancel", detail: "cancel", productIds: [] },
  { type: "\u4fe1\u606f\u4e0d\u8db3", title: "missing", detail: "missing", productIds: [] }
];
assert.equal(
  sortAnalysisForDisplay(displayAnalysis)[0].type,
  "\u4e92\u76f8\u514b\u5236",
  "Plain-language analysis did not sort conflicts first"
);
const analysisGroups = groupAnalysisForDisplay(displayAnalysis);
assert.deepEqual(
  analysisGroups.map((group) => ({ label: group.label, titles: group.items.map((item) => item.title) })),
  [
    { label: "\u4e92\u76f8\u514b\u5236", titles: ["conflict", "cancel"] },
    { label: "\u4e92\u76f8\u914d\u5408", titles: ["pair", "pair-two"] }
  ],
  "Plain-language analysis did not group conflict and cooperation separately"
);
assert.deepEqual(
  getUngroupedAnalysisForDisplay(displayAnalysis).map((item) => item.title),
  ["missing"],
  "Plain-language analysis should keep non-relationship states separate"
);
assert.ok(shouldCollapseRecommendationReason(cleanser.id, [cleanser.id]));
assert.ok(shouldCollapseCoverageReason(displayCoverage[0]));
assert.ok(shouldCollapseAnalysisDetail(displayAnalysis[0]));
assert.ok(shouldCollapseAnalysisDetail(displayAnalysis[2]));
console.log("Backport regression passed.");
