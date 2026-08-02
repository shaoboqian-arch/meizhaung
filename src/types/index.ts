export type ProductCategory =
  | "卸妆水"
  | "洁面"
  | "爽肤水"
  | "精华"
  | "面霜"
  | "面膜"
  | "防晒"
  | "眼霜"
  | "乳液"
  | "喷雾"
  | "唇部护理"
  | "身体乳"
  | "祛痘护理"
  | "颈部护理";

export type IngredientTag =
  | "清洁卸除"
  | "保湿修护"
  | "屏障修护"
  | "抗氧化"
  | "美白淡斑"
  | "酸类焕肤"
  | "视黄醇"
  | "舒缓"
  | "防晒"
  | "控油"
  | "封闭锁水"
  | "祛痘"
  | "抗炎"
  | "抗糖化"
  | "去角质"
  | "油脂调理"
  | "角质调理"
  | "风险刺激";

export type SkinConcern =
  | "痘多"
  | "干燥"
  | "敏感"
  | "泛红"
  | "出油多"
  | "毛孔粗"
  | "黑头"
  | "暗沉"
  | "色斑"
  | "屏障弱"
  | "颈纹"
  | "松弛"
  | "纹路";

export type IngredientRiskLevel = "低" | "中" | "高";

export interface Ingredient {
  id: string;
  name: string;
  canonicalName?: string;
  aliases: string[];
  tags: IngredientTag[];
  plainEffect: string;
  caution?: string;
  riskLevel?: IngredientRiskLevel;
  riskNotes?: string[];
  avoidFor?: SkinConcern[];
  routineTips?: string[];
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  category: ProductCategory;
  ingredientIds: string[];
  notes?: string;
  image?: string;
}

export interface AnalysisResult {
  type: "互相配合" | "互相克制" | "互相抵消" | "信息不足";
  title: string;
  detail: string;
  productIds: string[];
}

export interface IngredientRelation {
  id: string;
  type: "互相配合" | "互相克制" | "互相抵消";
  leftTags?: IngredientTag[];
  rightTags?: IngredientTag[];
  leftIngredientIds?: string[];
  rightIngredientIds?: string[];
  title: string;
  detail: string;
  priority: number;
}

export interface RoutineAdjustmentRule {
  id: string;
  action: "standalone-categories" | "separate-tag-products" | "keep-first-tag-product";
  triggerTags?: IngredientTag[];
  repeatedTag?: IngredientTag;
  categories?: ProductCategory[];
  advantage: string;
}

export interface RoutineRecommendation {
  productIds: string[];
  applyProductIds: string[];
  standaloneProductIds?: string[];
  advantages: string[];
  concernCoverage: ConcernCoverage[];
  reasons: Record<string, string>;
  usagePlans: Record<string, RoutineUsagePlan>;
}

export interface ConcernCoverage {
  concern: SkinConcern;
  candidateCount: number;
  status: "已有覆盖" | "推荐补入" | "暂未覆盖";
  productIds: string[];
  reason: string;
}

export interface RoutineUsagePlan {
  step: string;
  timing: string[];
  placement: string[];
}
