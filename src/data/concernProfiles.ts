import type { IngredientTag, ProductCategory, SkinConcern } from "../types";

export interface ConcernProfile {
  concern: SkinConcern;
  goal: string;
  primaryTags: IngredientTag[];
  supportTags: IngredientTag[];
  preferredIngredientIds: string[];
  cautionIngredientIds: string[];
  avoidTags: IngredientTag[];
  preferredCategories: ProductCategory[];
  minimumScore: number;
}

export const concernProfiles: Record<SkinConcern, ConcernProfile> = {
  痘多: {
    concern: "痘多",
    goal: "控痘、抗炎并减少堵塞",
    primaryTags: ["祛痘"],
    supportTags: ["抗炎", "控油", "角质调理", "舒缓"],
    preferredIngredientIds: ["azelaic-acid", "salicylic-acid", "benzoyl-peroxide", "sulfur", "quaternium-73", "succinic-acid", "zinc-pca"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["祛痘护理", "精华", "爽肤水", "面膜"],
    minimumScore: 20
  },
  干燥: {
    concern: "干燥",
    goal: "补水、补脂并减少水分流失",
    primaryTags: ["保湿修护", "封闭锁水"],
    supportTags: ["屏障修护", "舒缓"],
    preferredIngredientIds: ["hyaluronic-acid", "glycerin", "ceramide", "squalane", "panthenol", "urea", "ectoin", "beta-glucan", "petrolatum"],
    cautionIngredientIds: ["alcohol-denat", "menthol", "fragrance"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["精华", "乳液", "面霜", "面膜", "爽肤水"],
    minimumScore: 20
  },
  敏感: {
    concern: "敏感",
    goal: "减少刺激并加强舒缓修护",
    primaryTags: ["舒缓", "屏障修护"],
    supportTags: ["抗炎", "保湿修护", "封闭锁水"],
    preferredIngredientIds: ["centella", "madecassoside", "panthenol", "bisabolol", "allantoin", "ectoin", "ceramide", "beta-glucan", "oat"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol", "tea-tree", "benzoyl-peroxide"],
    avoidTags: ["风险刺激", "酸类焕肤", "视黄醇", "去角质"],
    preferredCategories: ["喷雾", "爽肤水", "精华", "乳液", "面霜", "面膜"],
    minimumScore: 22
  },
  泛红: {
    concern: "泛红",
    goal: "舒缓发红并降低刺激负担",
    primaryTags: ["舒缓", "抗炎", "屏障修护"],
    supportTags: ["保湿修护"],
    preferredIngredientIds: ["azelaic-acid", "centella", "madecassoside", "bisabolol", "allantoin", "licorice", "ectoin", "panthenol"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol", "tea-tree"],
    avoidTags: ["风险刺激", "酸类焕肤", "视黄醇"],
    preferredCategories: ["喷雾", "爽肤水", "精华", "乳液", "面霜"],
    minimumScore: 22
  },
  出油多: {
    concern: "出油多",
    goal: "调节油脂并保持基础保湿",
    primaryTags: ["控油", "油脂调理"],
    supportTags: ["祛痘", "角质调理", "抗炎"],
    preferredIngredientIds: ["niacinamide", "zinc-pca", "carnitine", "sebum-regulating-complex", "salicylic-acid", "green-tea", "azelaic-acid"],
    cautionIngredientIds: ["alcohol-denat", "menthol", "fragrance"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["爽肤水", "精华", "乳液", "祛痘护理", "面膜"],
    minimumScore: 20
  },
  毛孔粗: {
    concern: "毛孔粗",
    goal: "控油、调理角质并改善粗糙观感",
    primaryTags: ["控油", "角质调理", "油脂调理"],
    supportTags: ["酸类焕肤", "视黄醇", "保湿修护"],
    preferredIngredientIds: ["niacinamide", "salicylic-acid", "zinc-pca", "retinol", "retinal", "mandelic-acid", "azelaic-acid"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["爽肤水", "精华", "祛痘护理", "乳液", "面膜"],
    minimumScore: 20
  },
  黑头: {
    concern: "黑头",
    goal: "疏通毛孔并控制角栓形成",
    primaryTags: ["酸类焕肤", "去角质", "角质调理"],
    supportTags: ["控油", "祛痘", "舒缓"],
    preferredIngredientIds: ["salicylic-acid", "mandelic-acid", "pha", "gluconolactone", "azelaic-acid", "zinc-pca"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["祛痘护理", "爽肤水", "精华", "面膜"],
    minimumScore: 20
  },
  暗沉: {
    concern: "暗沉",
    goal: "抗氧化、提亮并改善肤色不均",
    primaryTags: ["抗氧化", "美白淡斑"],
    supportTags: ["角质调理", "保湿修护", "防晒"],
    preferredIngredientIds: ["vitamin-c", "niacinamide", "ferulic-acid", "vitamin-e", "resveratrol", "tranexamic-acid", "arbutin", "licorice"],
    cautionIngredientIds: ["fragrance", "alcohol-denat"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["爽肤水", "精华", "乳液", "面霜", "防晒", "面膜"],
    minimumScore: 20
  },
  色斑: {
    concern: "色斑",
    goal: "抑制色沉链路并补足日间防护",
    primaryTags: ["美白淡斑", "防晒"],
    supportTags: ["抗氧化", "舒缓"],
    preferredIngredientIds: ["tranexamic-acid", "arbutin", "kojic-acid", "niacinamide", "vitamin-c", "hexylresorcinol", "phenylethyl-resorcinol", "n-acetyl-glucosamine", "licorice", "sunscreen-filter", "zinc-oxide", "titanium-dioxide"],
    cautionIngredientIds: ["fragrance", "alcohol-denat"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["精华", "爽肤水", "乳液", "面霜", "防晒"],
    minimumScore: 20
  },
  屏障弱: {
    concern: "屏障弱",
    goal: "补充屏障脂质并降低活性刺激",
    primaryTags: ["屏障修护", "舒缓"],
    supportTags: ["保湿修护", "封闭锁水", "抗炎"],
    preferredIngredientIds: ["ceramide", "ceramide-ap", "ceramide-eop", "cholesterol", "fatty-acid", "panthenol", "ectoin", "squalane", "centella"],
    cautionIngredientIds: ["fragrance", "alcohol-denat", "menthol", "tea-tree", "benzoyl-peroxide"],
    avoidTags: ["风险刺激", "酸类焕肤", "视黄醇", "去角质"],
    preferredCategories: ["精华", "乳液", "面霜", "面膜", "喷雾"],
    minimumScore: 22
  },
  颈纹: {
    concern: "颈纹",
    goal: "颈部保湿、淡纹和弹性护理",
    primaryTags: ["视黄醇", "保湿修护"],
    supportTags: ["抗氧化", "屏障修护"],
    preferredIngredientIds: ["peptide", "retinol", "retinal", "coq10", "adenosine", "copper-tripeptide-1", "palmitoyl-tripeptide-5"],
    cautionIngredientIds: ["fragrance", "alcohol-denat"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["颈部护理", "精华", "面霜"],
    minimumScore: 20
  },
  松弛: {
    concern: "松弛",
    goal: "补充抗老活性并兼顾弹性与修护",
    primaryTags: ["视黄醇", "抗氧化"],
    supportTags: ["保湿修护", "屏障修护"],
    preferredIngredientIds: ["peptide", "retinol", "retinal", "bakuchiol", "coq10", "adenosine", "copper-tripeptide-1", "palmitoyl-tripeptide-5"],
    cautionIngredientIds: ["fragrance", "alcohol-denat"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["精华", "乳液", "面霜", "颈部护理"],
    minimumScore: 20
  },
  纹路: {
    concern: "纹路",
    goal: "淡化干纹观感并补充抗老链路",
    primaryTags: ["视黄醇", "保湿修护"],
    supportTags: ["抗氧化", "屏障修护", "封闭锁水"],
    preferredIngredientIds: ["peptide", "retinol", "retinal", "bakuchiol", "adenosine", "copper-tripeptide-1", "palmitoyl-tripeptide-5"],
    cautionIngredientIds: ["fragrance", "alcohol-denat"],
    avoidTags: ["风险刺激"],
    preferredCategories: ["眼霜", "精华", "乳液", "面霜", "颈部护理"],
    minimumScore: 20
  }
};

export const allSkinConcerns = Object.keys(concernProfiles) as SkinConcern[];
