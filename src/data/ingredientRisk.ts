import type { Ingredient, IngredientRiskLevel, IngredientTag, SkinConcern } from "../types";

export interface IngredientRiskProfile {
  riskLevel: IngredientRiskLevel;
  riskNotes: string[];
  avoidFor: SkinConcern[];
  routineTips: string[];
}

const highRiskIds = new Set([
  "retinol",
  "salicylic-acid",
  "glycolic-acid",
  "kojic-acid",
  "alcohol-denat",
  "menthol"
]);

const mediumRiskIds = new Set([
  "azelaic-acid",
  "vitamin-c",
  "benzoyl-peroxide",
  "sulfur",
  "kaolin",
  "charcoal"
]);

const riskByTag: Partial<Record<IngredientTag, IngredientRiskLevel>> = {
  酸类焕肤: "高",
  视黄醇: "高",
  风险刺激: "高",
  祛痘: "中",
  控油: "中",
  去角质: "中",
  角质调理: "中",
  美白淡斑: "低",
  抗氧化: "低",
  屏障修护: "低",
  保湿修护: "低",
  舒缓: "低"
};

const mergeLevel = (left: IngredientRiskLevel, right: IngredientRiskLevel): IngredientRiskLevel => {
  const score: Record<IngredientRiskLevel, number> = { 低: 1, 中: 2, 高: 3 };
  return score[right] > score[left] ? right : left;
};

export const getIngredientRiskProfile = (ingredient: Ingredient): IngredientRiskProfile => {
  let riskLevel: IngredientRiskLevel = "低";
  const riskNotes: string[] = [];
  const avoidFor = new Set<SkinConcern>();
  const routineTips: string[] = [];

  if (mediumRiskIds.has(ingredient.id)) riskLevel = "中";
  if (highRiskIds.has(ingredient.id)) riskLevel = "高";

  ingredient.tags.forEach((tag) => {
    const tagRisk = riskByTag[tag];
    if (tagRisk) riskLevel = mergeLevel(riskLevel, tagRisk);
  });

  if (ingredient.tags.includes("酸类焕肤") || ingredient.tags.includes("去角质") || ingredient.tags.includes("角质调理")) {
    riskNotes.push("角质代谢类，干燥、敏感、屏障弱时更容易刺痛脱皮。");
    routineTips.push("优先夜间低频使用，白天接防晒。");
    ["干燥", "敏感", "泛红", "屏障弱"].forEach((item) => avoidFor.add(item as SkinConcern));
  }

  if (ingredient.tags.includes("视黄醇")) {
    riskNotes.push("A醇类需要建立耐受，不适合和强酸同晚叠加。");
    routineTips.push("睡前使用，从低频开始，白天必须防晒。");
    ["干燥", "敏感", "泛红", "屏障弱"].forEach((item) => avoidFor.add(item as SkinConcern));
  }

  if (ingredient.tags.includes("祛痘") || ingredient.tags.includes("控油")) {
    riskNotes.push("控油祛痘类适合油痘诉求，但多件叠加容易过度清洁或拔干。");
    routineTips.push("同一晚保留一个主力即可。");
    ["干燥", "敏感", "屏障弱"].forEach((item) => avoidFor.add(item as SkinConcern));
  }

  if (ingredient.tags.includes("风险刺激")) {
    riskNotes.push("刺激风险偏高，敏感期优先避开。");
    ["敏感", "泛红", "屏障弱"].forEach((item) => avoidFor.add(item as SkinConcern));
  }

  if (ingredient.tags.includes("防晒")) {
    routineTips.push("白天最后一步使用，足量比叠加更多精华更重要。");
  }

  if (ingredient.tags.includes("屏障修护") || ingredient.tags.includes("舒缓") || ingredient.tags.includes("保湿修护")) {
    routineTips.push("适合做活性成分前后的缓冲和收尾。");
  }

  if (ingredient.caution && !riskNotes.includes(ingredient.caution)) {
    riskNotes.push(ingredient.caution);
  }

  return {
    riskLevel,
    riskNotes: riskNotes.length ? riskNotes : ["常规使用风险较低，重点看产品浓度和个人耐受。"],
    avoidFor: Array.from(avoidFor),
    routineTips: routineTips.length ? routineTips : ["可按产品质地和使用场景安排。"]
  };
};

export const enrichIngredientRisk = (ingredient: Ingredient): Ingredient => ({
  ...ingredient,
  ...getIngredientRiskProfile(ingredient)
});

