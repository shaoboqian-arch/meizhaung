import { buildRoutineRecommendation, buildUsagePlan, getConcernCandidateProducts, getConcernMatchScore } from "@shared/data/recommender";
import { concernProfiles } from "@shared/data/concernProfiles";
import { findIngredientByAnyName } from "@shared/data/ingredientMatcher";
import { getIngredientRiskProfile } from "@shared/data/ingredientRisk";
import { getMatchingIngredientRelations } from "@shared/data/analyzer";
import { getProductRecommendationRestriction, recommendationPolicyVersion } from "./recommendation-policy";
import type { Ingredient, IngredientTag, Product, RoutineRecommendation, SkinConcern } from "@shared/types";

export type RoutineScene = "morning" | "evening";
export const sceneLabels: Record<RoutineScene, string> = { morning: "早间", evening: "晚间" };
export const sceneRuleVersion = `scene-selection-v1:${recommendationPolicyVersion}`;
export const routineSlot = (p: Product) => p.category === "乳液" || p.category === "面霜" ? "moisturizer"
  : p.category === "爽肤水" || p.category === "喷雾" ? "hydration" : p.category;
export const selectSceneAlternative = (choices: Record<string, string>, p: Product) => Object.fromEntries([
  ...Object.entries(choices).filter(([slot]) => slot !== routineSlot(p)), [routineSlot(p), p.id]
]);
const cleanser = (p: Product) => p.category === "洁面" || p.category === "卸妆水";
const label = (p: Product) => `${p.brand} ${p.model}`;
const resolvedIngredients = (p: Product, ingredients: Ingredient[]) => p.ingredientIds
  .map((id) => ingredients.find((i) => i.id === id) ?? findIngredientByAnyName(id, ingredients))
  .filter((i): i is Ingredient => Boolean(i));
const tagsOf = (p: Product, ingredients: Ingredient[]) => new Set(resolvedIngredients(p, ingredients).flatMap((i) => i.tags));
const riskOf = (p: Product, ingredients: Ingredient[], concerns: SkinConcern[]) => resolvedIngredients(p, ingredients)
  .reduce((sum, i) => { const risk = i.riskLevel ? i : getIngredientRiskProfile(i);
    return sum + (risk.riskLevel === "高" ? 10 : risk.riskLevel === "中" ? 5 : 0)
      + (risk.avoidFor?.some((c) => concerns.includes(c)) ? 12 : 0); }, 0);

// Timing comes from the same usage-plan authority as the existing recommendation engine.
export const sceneExclusion = (p: Product, scene: RoutineScene, ingredients: Ingredient[], concerns: SkinConcern[]) => {
  const restriction = getProductRecommendationRestriction(p, ingredients);
  if (restriction) return restriction;
  const tags = tagsOf(p, ingredients);
  if (!cleanser(p) && tags.has("酸类焕肤") && tags.has("视黄醇")) return "同一产品含酸类和A醇，无法按产品拆开；先核对配方及使用说明，不自动排入";
  if (!cleanser(p) && getMatchingIngredientRelations([p], ingredients).some((r) => r.type === "互相抵消"))
    return "同一产品内出现成分库抵消条目，需核对实际配方，不提供强行换选";
  if (resolvedIngredients(p, ingredients).some((i) => (i.riskLevel ? i : getIngredientRiskProfile(i)).avoidFor?.some((c) => concerns.includes(c))))
    return "成分库记录了与你当前皮肤情况相关的注意项，不自动排入";
  const timing = buildUsagePlan(p, ingredients, 0, false).timing;
  const fits = scene === "morning" ? timing.some((t) => t.includes("早")) : timing.some((t) => t.includes("晚") || t.includes("睡前"));
  return fits ? "" : `现有使用时段标注不属于${sceneLabels[scene]}，留作其他时段备选`;
};

export interface SceneAlternative { product: Product; reason: string; canReplace: boolean }
export interface SceneRecommendation {
  scene: RoutineScene; ruleVersion: string; recommendation: RoutineRecommendation | null;
  alternatives: SceneAlternative[]; notices: string[];
}

export function buildSceneRecommendation(selected: Product[], all: Product[], ingredients: Ingredient[], concerns: SkinConcern[],
  scene: RoutineScene, overrides: Record<string, string> = {}): SceneRecommendation {
  const selectedSet = new Set(selected.map((p) => p.id));
  const exclusions = new Map(all.map((p) => [p.id, sceneExclusion(p, scene, ingredients, concerns)]));
  const eligible = all.filter((p) => !exclusions.get(p.id));
  const candidateIds = new Map(concerns.map((c) => [c, new Set(getConcernCandidateProducts(c, eligible, ingredients, concerns).map((p) => p.id))]));
  const coverageCount = (p: Product) => concerns.filter((c) => candidateIds.get(c)?.has(p.id)).length;
  const score = (p: Product) => concerns.reduce((sum, c) => {
    const value = getConcernMatchScore(p, concernProfiles[c], ingredients, concerns);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const explicit = (p: Product) => overrides[routineSlot(p)] === p.id && selectedSet.has(p.id) ? Object.values(overrides).indexOf(p.id) + 1 : 0;
  const ranked = [...eligible].sort((a, b) => explicit(b) - explicit(a)
    || Number(selectedSet.has(b.id)) - Number(selectedSet.has(a.id)) || coverageCount(b) - coverageCount(a)
    || riskOf(a, ingredients, concerns) - riskOf(b, ingredients, concerns) || score(b) - score(a) || a.id.localeCompare(b.id));
  const chosen: Product[] = [];
  const skipped = new Map<string, string>();
  const treatmentCategories = new Set(["精华", "祛痘护理", "面膜"]);
  const functionTags: IngredientTag[] = ["酸类焕肤", "视黄醇", "美白淡斑", "抗氧化", "祛痘", "控油", "保湿修护", "屏障修护", "舒缓"];
  for (const p of ranked) {
    const sameSlot = chosen.find((item) => routineSlot(item) === routineSlot(p));
    if (sameSlot) { skipped.set(p.id, `同一步骤优先保留「${label(sameSlot)}」，避免重复叠涂`); continue; }
    const tags = tagsOf(p, ingredients);
    const activePeer = !cleanser(p) && chosen.find((item) => !cleanser(item) && (
      (tags.has("酸类焕肤") && (tagsOf(item, ingredients).has("酸类焕肤") || tagsOf(item, ingredients).has("视黄醇")))
      || (tags.has("视黄醇") && (tagsOf(item, ingredients).has("酸类焕肤") || tagsOf(item, ingredients).has("视黄醇")))));
    if (activePeer) { skipped.set(p.id, `本场景保留「${label(activePeer)}」，同类夜间活性不重复，酸类与A醇留作分晚替换`); continue; }
    const standalone = [...chosen, p].filter(cleanser).map((item) => item.id);
    const hard = getMatchingIngredientRelations([...chosen, p], ingredients, standalone).find((r) => r.type === "互相抵消");
    if (hard) { skipped.set(p.id, `与本场景其他步骤存在抵消：${hard.title}`); continue; }
    const duplicateFunction = treatmentCategories.has(p.category) && chosen.find((item) => {
      if (!treatmentCategories.has(item.category)) return false;
      const functions = functionTags.filter((tag) => tags.has(tag));
      return functions.length > 0 && functions.every((tag) => tagsOf(item, ingredients).has(tag))
        && concerns.every((c) => !candidateIds.get(c)?.has(p.id) || candidateIds.get(c)?.has(item.id));
    });
    if (duplicateFunction) { skipped.set(p.id, `主要功效已由「${label(duplicateFunction)}」覆盖，留作替换而非继续叠加`); continue; }
    chosen.push(p);
  }
  const initial = chosen.filter((p) => selectedSet.has(p.id));
  // A constrained catalog has one item per step. Every gap-filling pass must use it,
  // so later rules cannot silently reintroduce a duplicate category or night active.
  const recommendation = buildRoutineRecommendation(initial, chosen, ingredients, concerns);
  const finalSet = new Set(recommendation?.productIds ?? []);
  if (recommendation) {
    recommendation.concernCoverage = recommendation.concernCoverage.map((coverage) => ({ ...coverage,
      candidateCount: candidateIds.get(coverage.concern)?.size ?? 0,
      status: coverage.productIds.some((id) => selectedSet.has(id)) ? "已有覆盖" : coverage.productIds.length ? "推荐补入" : "暂未覆盖",
      reason: coverage.productIds.length
        ? `${sceneLabels[scene]}方案由${coverage.productIds.map((id) => label(all.find((p) => p.id === id)!)).join("、")}覆盖该情况；同一步骤只取一款。`
        : `${sceneLabels[scene]}尚无能同时满足时段、取舍和组合规则的覆盖产品，不为凑齐情况重复叠涂。` }));
    recommendation.productIds.forEach((id) => {
      const p = all.find((item) => item.id === id)!;
      const usage = recommendation.usagePlans[id];
      recommendation.usagePlans[id] = { ...usage, timing: [sceneLabels[scene], ...usage.timing.filter((t) => !/早|晚|睡前/.test(t))] };
      recommendation.reasons[id] = `${selectedSet.has(id) ? "优先从你的选择中保留" : "为本场景缺口补入"}；覆盖${coverageCount(p)}项当前情况，同一步骤不重复。`
        + (resolvedIngredients(p, ingredients).length < p.ingredientIds.length || !p.ingredientIds.length ? " 成分信息不完整，需核对产品说明；不代表安全。" : "");
    });
  }
  const alternatives = selected.filter((p) => !finalSet.has(p.id)).map((product) => ({ product,
    reason: exclusions.get(product.id) || skipped.get(product.id) || "未进入本场景方案，原始选择仍保留",
    canReplace: !exclusions.get(product.id) }));
  return { scene, ruleVersion: sceneRuleVersion, recommendation, alternatives,
    notices: ["切换场景或替换备选不改变原始选择；备选替换仅用于本次页面方案。",
      ...(selected.some((p) => getProductRecommendationRestriction(p, ingredients))
        ? ["已选条目中有用药信息待核对项，仅保留记录，不排入早晚护肤方案；白话分析不构成用药建议。"] : []),
      ...(scene === "evening" ? ["晚间是单晚方案，不代表每晚都用；酸类与A醇可在不同晚上换选。"] : []),
      ...(!initial.length && selected.length ? ["当前已选产品未能进入这个场景，查看备选中的原因。"] : [])] };
}
