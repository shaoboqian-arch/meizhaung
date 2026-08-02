import { getMatchingIngredientRelations } from "./analyzer";
import { concernProfiles, type ConcernProfile } from "./concernProfiles";
import { getIngredientRiskProfile } from "./ingredientRisk";
import { findIngredientByAnyName } from "./ingredientMatcher";
import { routineAdjustmentRules } from "./relationships";
import type { ConcernCoverage, Ingredient, IngredientTag, Product, ProductCategory, RoutineRecommendation, RoutineUsagePlan, SkinConcern } from "../types";

const preferredCategoryIds: Partial<Record<ProductCategory, string[]>> = {
    卸妆水: ["bioderma-h2o", "fancl-cleansing", "shu-cleansing"],
    洁面: ["cerave-cleanser", "freeplus-cleanser", "youth-superfood"],
    爽肤水: ["ipsa-toner", "fresh-rose-toner", "sk2-essence"],
    精华: ["vichy-89", "olay-light", "skinceuticals-ce"],
    面霜: ["laroche-b5", "cerave-cream", "drjart-ceramide"],
    面膜: ["drjart-mask", "origins-mask", "lauramercier-mask"],
    防晒: ["elta-md", "laroche-anthelios", "biore-sunscreen"],
    眼霜: ["esteelauder-anr-eye", "lancome-genifique-eye", "cerave-eye-repair", "ahc-eye", "ordinary-caffeine"],
    乳液: ["minon-lotion", "clinique-gel", "sisley-emulsion"],
    喷雾: ["avene-spray", "laroche-spray"],
    唇部护理: ["lip-laroche", "lip-bioderma", "lip-laneige"],
    身体乳: ["aveeno-body", "nivea-body", "kiehls-body"],
    祛痘护理: ["cosrx-bha", "firstaid-pads", "medicube-zero"],
    颈部护理: ["clarins-neck", "strivectin-neck", "sisley-neck"]
};

const categoryOrder: Record<Product["category"], number> = {
  卸妆水: 10,
  洁面: 20,
  爽肤水: 30,
  喷雾: 35,
  眼霜: 40,
  精华: 50,
  祛痘护理: 55,
  面膜: 60,
  乳液: 70,
  面霜: 80,
  防晒: 90,
  唇部护理: 95,
  身体乳: 100,
  颈部护理: 105
};

const isCleanserCategory = (category: Product["category"]) => category === "卸妆水" || category === "洁面";

const getIngredients = (product: Product, ingredients: Ingredient[]) =>
  product.ingredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id) ?? findIngredientByAnyName(id, ingredients))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));

const productHasTag = (product: Product, ingredients: Ingredient[], tag: IngredientTag) =>
  getIngredients(product, ingredients).some((ingredient) => ingredient.tags.includes(tag));

const hasTag = (products: Product[], ingredients: Ingredient[], tag: IngredientTag) =>
  products.some((product) => productHasTag(product, ingredients, tag));

const addProduct = (ids: string[], productId: string, allProducts: Product[]) => {
  if (ids.includes(productId)) return;
  if (allProducts.some((product) => product.id === productId)) ids.push(productId);
};

const getBestProductForCategory = (category: Product["category"], allProducts: Product[]) => {
  const preferredIds = preferredCategoryIds[category] ?? [];
  return (
    preferredIds.map((id) => allProducts.find((product) => product.id === id)).find(Boolean) ??
    allProducts.find((product) => product.category === category)
  );
};

const sortRoutineIds = (ids: string[], allProducts: Product[]) =>
  [...ids].sort((leftId, rightId) => {
    const leftProduct = allProducts.find((product) => product.id === leftId);
    const rightProduct = allProducts.find((product) => product.id === rightId);
    if (!leftProduct || !rightProduct) return 0;
    return categoryOrder[leftProduct.category] - categoryOrder[rightProduct.category];
  });

const getProductsByIds = (ids: string[], allProducts: Product[]) =>
  ids
    .map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

const getProductLabel = (productId: string | undefined, allProducts: Product[]) => {
  const product = allProducts.find((item) => item.id === productId);
  return product ? `${product.brand} ${product.model}` : "对应产品";
};

const productTagSet = (product: Product, ingredients: Ingredient[]) =>
  new Set(getIngredients(product, ingredients).flatMap((ingredient) => ingredient.tags));

const riskPenalty = (product: Product, ingredients: Ingredient[], skinConcerns: SkinConcern[]) =>
  getIngredients(product, ingredients).reduce((total, ingredient) => {
    const profile = ingredient.riskLevel ? ingredient : getIngredientRiskProfile(ingredient);
    const levelPenalty = profile.riskLevel === "高" ? 10 : profile.riskLevel === "中" ? 5 : 0;
    const concernPenalty = profile.avoidFor?.some((concern) => skinConcerns.includes(concern)) ? 12 : 0;
    return total + levelPenalty + concernPenalty;
  }, 0);

const recommendationCategories = new Set<ProductCategory>([
  "爽肤水",
  "喷雾",
  "眼霜",
  "精华",
  "祛痘护理",
  "面膜",
  "乳液",
  "面霜",
  "防晒",
  "颈部护理"
]);

const countMatches = <T,>(values: Iterable<T>, expected: T[]) => {
  const valueSet = new Set(values);
  return expected.filter((value) => valueSet.has(value)).length;
};

export const getConcernMatchScore = (
  product: Product,
  profile: ConcernProfile,
  ingredients: Ingredient[],
  activeConcerns: SkinConcern[] = [profile.concern]
) => {
  if (!recommendationCategories.has(product.category)) return Number.NEGATIVE_INFINITY;

  const tags = productTagSet(product, ingredients);
  const ingredientIds = new Set(product.ingredientIds);
  const primaryHits = countMatches(tags, profile.primaryTags);
  const supportHits = countMatches(tags, profile.supportTags);
  const ingredientHits = countMatches(ingredientIds, profile.preferredIngredientIds);
  const avoidTagHits = countMatches(tags, profile.avoidTags);
  const cautionHits = countMatches(ingredientIds, profile.cautionIngredientIds);
  const categoryBonus = profile.preferredCategories.includes(product.category) ? 10 : 0;
  const neckBonus = profile.concern === "颈纹" && product.category === "颈部护理" ? 24 : 0;

  return (
    primaryHits * 18 +
    supportHits * 7 +
    ingredientHits * 11 +
    categoryBonus +
    neckBonus -
    avoidTagHits * 24 -
    cautionHits * 9 -
    Math.min(riskPenalty(product, ingredients, activeConcerns), 36)
  );
};

const isConcernCandidate = (
  product: Product,
  profile: ConcernProfile,
  ingredients: Ingredient[],
  activeConcerns: SkinConcern[]
) => {
  const tags = productTagSet(product, ingredients);
  const hasPrimaryEffect = profile.primaryTags.some((tag) => tags.has(tag));
  const hasSupportingEffect = profile.supportTags.some((tag) => tags.has(tag));
  const hasKeyIngredient = profile.preferredIngredientIds.some((id) => product.ingredientIds.includes(id));
  const isDedicatedNeckProduct = profile.concern === "颈纹" && product.category === "颈部护理";
  const hasDirectConcernRisk = getIngredients(product, ingredients).some((ingredient) => {
    const riskProfile = ingredient.riskLevel ? ingredient : getIngredientRiskProfile(ingredient);
    return riskProfile.avoidFor?.includes(profile.concern);
  });

  return (
    !hasDirectConcernRisk &&
    (hasPrimaryEffect || hasSupportingEffect) &&
    (hasKeyIngredient || isDedicatedNeckProduct) &&
    getConcernMatchScore(product, profile, ingredients, activeConcerns) >= profile.minimumScore
  );
};

export const getConcernCandidateProducts = (
  concern: SkinConcern,
  allProducts: Product[],
  ingredients: Ingredient[],
  activeConcerns: SkinConcern[] = [concern]
) => {
  const profile = concernProfiles[concern];
  return allProducts
    .filter((product) => isConcernCandidate(product, profile, ingredients, activeConcerns))
    .sort((left, right) => {
      const scoreDifference =
        getConcernMatchScore(right, profile, ingredients, activeConcerns) -
        getConcernMatchScore(left, profile, ingredients, activeConcerns);
      if (scoreDifference !== 0) return scoreDifference;
      const riskDifference =
        riskPenalty(left, ingredients, activeConcerns) - riskPenalty(right, ingredients, activeConcerns);
      return riskDifference !== 0 ? riskDifference : left.id.localeCompare(right.id);
    });
};

const hardConflictCount = (
  ids: string[],
  allProducts: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[]
) =>
  getMatchingIngredientRelations(getProductsByIds(ids, allProducts), ingredients, standaloneProductIds).filter((relation) =>
    relation.type === "互相抵消"
  ).length;

const candidateKeepsRoutineStable = (
  ids: string[],
  candidateId: string,
  allProducts: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[]
) =>
  hardConflictCount([...ids, candidateId], allProducts, ingredients, standaloneProductIds) <=
  hardConflictCount(ids, allProducts, ingredients, standaloneProductIds);

const categoryDuplicatePenalty = (product: Product, ids: string[], allProducts: Product[]) => {
  const sameCategoryCount = ids.filter(
    (id) => allProducts.find((item) => item.id === id)?.category === product.category
  ).length;
  const highDensityCategory = ["爽肤水", "精华", "祛痘护理", "面膜", "乳液", "面霜"].includes(product.category);
  return highDensityCategory ? sameCategoryCount * 9 : sameCategoryCount * 3;
};

const selectSupportCandidate = (
  ids: string[],
  allProducts: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[],
  skinConcerns: SkinConcern[],
  desiredTags: IngredientTag[],
  preferredCategories: ProductCategory[]
) =>
  allProducts
    .filter((product) => !ids.includes(product.id) && recommendationCategories.has(product.category))
    .map((product) => {
      const tagHits = countMatches(productTagSet(product, ingredients), desiredTags);
      const categoryBonus = preferredCategories.includes(product.category) ? 12 : 0;
      const score =
        tagHits * 22 +
        categoryBonus -
        riskPenalty(product, ingredients, skinConcerns) -
        categoryDuplicatePenalty(product, ids, allProducts);
      return { product, tagHits, score };
    })
    .filter(
      ({ product, tagHits }) =>
        tagHits > 0 && candidateKeepsRoutineStable(ids, product.id, allProducts, ingredients, standaloneProductIds)
    )
    .sort((left, right) => right.score - left.score || left.product.id.localeCompare(right.product.id))[0]?.product;

const concernIsCovered = (
  concern: SkinConcern,
  ids: string[],
  allProducts: Product[],
  ingredients: Ingredient[],
  activeConcerns: SkinConcern[]
) => {
  const profile = concernProfiles[concern];
  return getProductsByIds(ids, allProducts).some((product) =>
    isConcernCandidate(product, profile, ingredients, activeConcerns)
  );
};

const addConcernGapProducts = (
  ids: string[],
  allProducts: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[],
  targetConcerns: SkinConcern[],
  activeConcerns: SkinConcern[],
  maxAdditions: number
) => {
  let nextIds = [...ids];
  const addedIds: string[] = [];

  while (addedIds.length < maxAdditions) {
    const uncoveredConcerns = targetConcerns.filter(
      (concern) => !concernIsCovered(concern, nextIds, allProducts, ingredients, activeConcerns)
    );
    if (uncoveredConcerns.length === 0) break;

    const best = allProducts
      .filter((product) => !nextIds.includes(product.id) && recommendationCategories.has(product.category))
      .map((product) => {
        const matchedConcerns = uncoveredConcerns.filter((concern) =>
          isConcernCandidate(product, concernProfiles[concern], ingredients, activeConcerns)
        );
        const coverageScore = matchedConcerns.reduce(
          (total, concern) => total + getConcernMatchScore(product, concernProfiles[concern], ingredients, activeConcerns),
          0
        );
        const score =
          coverageScore +
          matchedConcerns.length * 42 -
          categoryDuplicatePenalty(product, nextIds, allProducts);
        return { product, matchedConcerns, score };
      })
      .filter(
        ({ product, matchedConcerns }) =>
          matchedConcerns.length > 0 &&
          candidateKeepsRoutineStable(nextIds, product.id, allProducts, ingredients, standaloneProductIds)
      )
      .sort((left, right) => {
        if (right.matchedConcerns.length !== left.matchedConcerns.length) {
          return right.matchedConcerns.length - left.matchedConcerns.length;
        }
        return right.score - left.score || left.product.id.localeCompare(right.product.id);
      })[0];

    if (!best) break;
    nextIds.push(best.product.id);
    addedIds.push(best.product.id);
  }

  return { ids: nextIds, addedIds };
};

const removeHardConflicts = (
  ids: string[],
  allProducts: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[],
  selectedProducts: Product[]
) => {
  let nextIds = [...ids];
  const selectedIdSet = new Set(selectedProducts.map((product) => product.id));

  for (let pass = 0; pass < 5; pass += 1) {
    const currentConflictCount = hardConflictCount(nextIds, allProducts, ingredients, standaloneProductIds);
    if (currentConflictCount === 0 || nextIds.length < 2) break;

    const removableIds = nextIds
      .filter((id) => !standaloneProductIds.includes(id))
      .sort((leftId, rightId) => Number(selectedIdSet.has(leftId)) - Number(selectedIdSet.has(rightId)));
    const bestRemoval = removableIds
      .map((id) => ({
        id,
        conflictCount: hardConflictCount(
          nextIds.filter((nextId) => nextId !== id),
          allProducts,
          ingredients,
          standaloneProductIds
        )
      }))
      .sort((left, right) => left.conflictCount - right.conflictCount)[0];

    if (!bestRemoval || bestRemoval.conflictCount >= currentConflictCount) break;
    nextIds = nextIds.filter((id) => id !== bestRemoval.id);
  }

  return nextIds;
};

const buildUsagePlan = (
  product: Product,
  ingredients: Ingredient[],
  applyIndex: number,
  standalone: boolean
): RoutineUsagePlan => {
  const hasAcid = productHasTag(product, ingredients, "酸类焕肤");
  const hasRetinoid = productHasTag(product, ingredients, "视黄醇");
  const hasAcne = productHasTag(product, ingredients, "祛痘") || productHasTag(product, ingredients, "控油");
  const hasAntioxidant = productHasTag(product, ingredients, "抗氧化");
  const hasWashOffCleanser = productHasTag(product, ingredients, "清洁卸除");
  const isActiveNightProduct = hasRetinoid || hasAcid;
  const step = standalone ? "单独步骤" : `第${applyIndex + 1}步`;

  if (product.category === "卸妆水") {
    return { step, timing: ["晚", "洗脸前"], placement: ["先卸防晒/彩妆", "后接洁面"] };
  }
  if (product.category === "洁面") {
    return { step, timing: ["早/晚", "洗脸时"], placement: ["清洁步骤", "后接爽肤水/精华"] };
  }
  if (product.category === "爽肤水" || product.category === "喷雾") {
    if (isActiveNightProduct) {
      return { step, timing: ["睡前", "洗脸后"], placement: ["精华前", "先低频"] };
    }
    return { step, timing: ["早/晚", "洗脸后"], placement: ["精华前", "轻薄打底"] };
  }
  if (product.category === "眼霜") {
    return hasRetinoid
      ? { step, timing: ["睡前", "洗脸后"], placement: ["少量点涂", "面霜前"] }
      : { step, timing: ["早/睡前", "洗脸后"], placement: ["精华后", "面霜前"] };
  }
  if (product.category === "精华") {
    if (hasRetinoid) {
      return { step, timing: ["睡前", "洗脸后"], placement: ["乳液/面霜前", "先低频"] };
    }
    if (hasAcid) {
      return { step, timing: ["睡前", "洗脸后"], placement: ["乳液/面霜前", "避开A醇同晚"] };
    }
    const timing = hasAntioxidant ? ["早", "洗脸后"] : ["早/晚", "洗脸后"];
    const placement = hasAntioxidant ? ["乳液/面霜前", "白天接防晒"] : ["乳液/面霜前", "薄涂到厚涂"];
    return { step, timing, placement };
  }
  if (product.category === "祛痘护理") {
    return { step, timing: hasAcne || isActiveNightProduct ? ["睡前", "洗脸后"] : ["早/晚", "洗脸后"], placement: ["局部优先", "面霜前"] };
  }
  if (product.category === "面膜") {
    return hasWashOffCleanser || hasAcid || hasAcne
      ? { step, timing: ["睡前", "洗脸后"], placement: ["短时使用", "冲洗后保湿"] }
      : { step, timing: ["睡前", "洗脸后"], placement: ["周护理", "后接修护/锁水"] };
  }
  if (product.category === "乳液") {
    return isActiveNightProduct
      ? { step, timing: ["睡前", "精华后"], placement: ["面霜前", "先低频"] }
      : { step, timing: ["早/睡前", "精华后"], placement: ["面霜前", "保湿承接"] };
  }
  if (product.category === "面霜") {
    return isActiveNightProduct
      ? { step, timing: ["睡前", "精华后"], placement: ["锁水步骤", "白天加强防晒"] }
      : { step, timing: ["早/睡前", "精华后"], placement: ["锁水步骤", "白天防晒前"] };
  }
  if (product.category === "防晒") {
    return { step, timing: ["早", "出门前"], placement: ["最后一步", "面霜后"] };
  }
  if (product.category === "唇部护理") {
    return { step, timing: ["睡前", "洁面后"], placement: ["面部护理后", "最后封层"] };
  }
  if (product.category === "身体乳") {
    return { step, timing: ["沐浴后", "睡前"], placement: ["身体清洁后", "趁皮肤微湿"] };
  }
  if (product.category === "颈部护理") {
    return hasRetinoid
      ? { step, timing: ["睡前", "面部护理后"], placement: ["颈部薄涂", "白天加强防晒"] }
      : { step, timing: ["早/睡前", "面部护理后"], placement: ["颈部薄涂", "由下向上轻涂"] };
  }

  return { step, timing: ["早/晚"], placement: ["按质地从薄到厚"] };
};

const buildProductReason = (
  product: Product,
  ingredients: Ingredient[],
  standaloneProductIds: string[],
  selectedProducts: Product[],
  skinConcerns: SkinConcern[]
) => {
  const ingredientNames = getIngredients(product, ingredients).map((ingredient) => ingredient.name);
  const names = ingredientNames.length ? ingredientNames.join("、") : "已知成分";
  const ingredientRisks = getIngredients(product, ingredients).map((ingredient) =>
    ingredient.riskLevel ? ingredient : getIngredientRiskProfile(ingredient)
  );
  const hasMatchedConcern = skinConcerns.length > 0 && ingredientRisks.length > 0 && ingredientRisks.every(
    (profile) => !profile.avoidFor?.some((concern) => skinConcerns.includes(concern))
  );
  const highRiskCount = ingredientRisks.filter((profile) => profile.riskLevel === "高").length;
  const matchedConcerns = skinConcerns.filter((concern) =>
    isConcernCandidate(product, concernProfiles[concern], ingredients, skinConcerns)
  );
  const concernText = matchedConcerns.length
    ? `在你选择的情况里，它同时覆盖${matchedConcerns.join("、")}。`
    : "";
  const riskText = highRiskCount > 0
    ? `${concernText}含${highRiskCount}个高刺激风险成分，所以建议按标签低频使用。`
    : `${concernText}整体风险评分更稳，适合作为当前组合的补位产品。`;
  const matchText = hasMatchedConcern ? "同时避开了你已标记情况里的主要慎用项。" : "";
  const selectedHasActive =
    hasTag(selectedProducts, ingredients, "酸类焕肤") ||
    hasTag(selectedProducts, ingredients, "视黄醇") ||
    hasTag(selectedProducts, ingredients, "祛痘") ||
    hasTag(selectedProducts, ingredients, "抗氧化");

  if (standaloneProductIds.includes(product.id)) {
    return `选它是因为你当前组合里出现了${product.category}这个类别，但这类产品不适合和留肤产品叠在同一步。${product.brand} ${product.model}作为该类别的优先项，用来承担单独清洁步骤，不参与精华、面霜、防晒的叠加。`;
  }

  if (product.category === "防晒") {
    return selectedHasActive
      ? `选它是因为当前组合里有酸类、A醇、祛痘或抗氧化这类活性护理，白天更需要防晒兜底。${product.brand} ${product.model}含${names}，作用是减少紫外线对活性护理后的影响。${riskText}${matchText}`
      : `选它是为了补齐白天最后一步。${product.brand} ${product.model}含${names}，比继续增加精华更能补上防护缺口。${riskText}${matchText}`;
  }

  if (skinConcerns.some((concern) => ["干燥", "敏感", "泛红", "屏障弱"].includes(concern)) && (product.category === "面霜" || product.category === "乳液")) {
    return `选它是因为你打开了干燥/敏感/泛红/屏障弱。${product.brand} ${product.model}含${names}，优先目标是补屏障、压刺激、减少紧绷。${riskText}${matchText}`;
  }

  if (
    matchedConcerns.some((concern) => ["痘多", "出油多", "毛孔粗", "黑头"].includes(concern)) &&
    (productHasTag(product, ingredients, "祛痘") || productHasTag(product, ingredients, "控油") || productHasTag(product, ingredients, "角质调理"))
  ) {
    return `选它是为了补上${matchedConcerns.filter((concern) => ["痘多", "出油多", "毛孔粗", "黑头"].includes(concern)).join("、")}。${product.brand} ${product.model}含${names}，在全库候选中兼顾了对应功效、其他已选情况和当前组合冲突。${riskText}${matchText}`;
  }

  if (skinConcerns.some((concern) => ["暗沉", "色斑"].includes(concern)) && product.category === "精华") {
    return `选它是因为你打开了暗沉/色斑。${product.brand} ${product.model}含${names}，优先补提亮淡斑方向。${riskText}${matchText}`;
  }

  if (product.category === "面霜" || product.category === "乳液") {
    return `选它是为了补屏障和锁水。${product.brand} ${product.model}含${names}，适合放在精华后面，降低干燥、刺痛和脱皮概率。${riskText}${matchText}`;
  }

  if (product.category === "精华") {
    return `选它是因为当前组合需要这个方向的打底或功能补齐。${product.brand} ${product.model}含${names}，能补足保湿、提亮或修护链路。${riskText}${matchText}`;
  }

  if (product.category === "祛痘护理") {
    return skinConcerns.some((concern) => ["痘多", "出油多", "毛孔粗", "黑头"].includes(concern))
      ? `选它是因为你打开了痘多/出油多/毛孔粗/黑头这类情况。${product.brand} ${product.model}含${names}，用一个油痘护理主力，比乱叠多个刺激型产品更稳。${riskText}${matchText}`
      : `选它是为了把油痘护理集中到一个主力产品上。${product.brand} ${product.model}含${names}，比多种刺激型产品叠加更稳。${riskText}${matchText}`;
  }

  if (product.category === "颈部护理") {
    return skinConcerns.some((c) => ["颈纹", "松弛", "纹路"].includes(c))
      ? `选它是因为你打开了颈纹/松弛/纹路。${product.brand} ${product.model}含${names}，专门针对颈部抗老紧致。${riskText}${matchText}`
      : `选它是因为它属于${product.category}类别。${product.brand} ${product.model}含${names}，帮助颈部抗老。${riskText}${matchText}`;
  }
  return `选它是因为它能补齐当前组合缺口。${product.brand} ${product.model}含${names}，适合作为${product.category}类别的优先项。${riskText}${matchText}`;
};

export function buildRoutineRecommendation(
  selectedProducts: Product[],
  allProducts: Product[],
  ingredients: Ingredient[],
  skinConcerns: SkinConcern[] = []
): RoutineRecommendation | null {
  if (selectedProducts.length === 0) return null;

  const activeConcerns = Array.from(new Set(skinConcerns));
  const advantages: string[] = [];
  let nextIds = Array.from(new Set(selectedProducts.map((product) => product.id)));
  let standaloneProductIds: string[] = [];

  const currentProducts = () => getProductsByIds(nextIds, allProducts);
  const currentHasTags = (tags: readonly IngredientTag[] = []) =>
    tags.every((tag) => hasTag(currentProducts(), ingredients, tag));
  const currentIdsWithTag = (tag: IngredientTag) =>
    nextIds.filter((id) => {
      const product = allProducts.find((item) => item.id === id);
      return product ? productHasTag(product, ingredients, tag) : false;
    });

  routineAdjustmentRules.forEach((rule) => {
    if (rule.action === "standalone-categories") {
      const categories = rule.categories ?? [];
      const workingProducts = currentProducts();
      const hasRuleCategory = workingProducts.some((product) =>
        categories.some((category) => category === product.category)
      );
      const hasOtherCategory = workingProducts.some((product) =>
        categories.every((category) => category !== product.category)
      );
      if (!hasRuleCategory || !hasOtherCategory) return;

      const conflictingCategories = Array.from(
        new Set(
          workingProducts
            .filter((product) => categories.some((category) => category === product.category))
            .map((product) => product.category)
        )
      );
      const leaveOnIds = workingProducts
        .filter((product) => categories.every((category) => category !== product.category))
        .map((product) => product.id);
      const bestConflictCategoryIds = conflictingCategories
        .map((category) => getBestProductForCategory(category, allProducts)?.id)
        .filter((id): id is string => Boolean(id));
      const replacedAcidCleansers = workingProducts.filter((product) => {
        if (product.category !== "洁面" || !productHasTag(product, ingredients, "酸类焕肤")) return false;
        const replacementId = bestConflictCategoryIds.find((id) =>
          allProducts.find((item) => item.id === id)?.category === product.category
        );
        const replacement = allProducts.find((item) => item.id === replacementId);
        return Boolean(replacement && replacement.id !== product.id && !productHasTag(replacement, ingredients, "酸类焕肤"));
      });

      nextIds = [...bestConflictCategoryIds, ...leaveOnIds];
      standaloneProductIds = Array.from(new Set([...standaloneProductIds, ...bestConflictCategoryIds]));
      advantages.push(rule.advantage);
      if (replacedAcidCleansers.length > 0) {
        advantages.push(
          `${replacedAcidCleansers.map((product) => `「${getProductLabel(product.id, allProducts)}」`).join("、")}的酸类去角质功能已替换为单独的温和清洁步骤，不再保留该酸类功能。`
        );
      }
      return;
    }

    if (rule.action === "separate-tag-products") {
      if (!currentHasTags(rule.triggerTags)) return;
      advantages.push(rule.advantage);
      return;
    }

    if (rule.action === "keep-first-tag-product" && rule.repeatedTag) {
      const matchedIds = currentIdsWithTag(rule.repeatedTag);
      if (matchedIds.length <= 1) return;
      nextIds = nextIds.filter((id) => id === matchedIds[0] || !matchedIds.includes(id));
      advantages.push(rule.advantage);
    }
  });

  nextIds = removeHardConflicts(
    sortRoutineIds(Array.from(new Set(nextIds)), allProducts),
    allProducts,
    ingredients,
    standaloneProductIds,
    selectedProducts
  );

  if (activeConcerns.length > 0) {
    const concernResult = addConcernGapProducts(
      nextIds,
      allProducts,
      ingredients,
      standaloneProductIds,
      activeConcerns,
      activeConcerns,
      Math.min(6, Math.max(2, Math.ceil(activeConcerns.length / 2)))
    );
    nextIds = concernResult.ids;
  }

  const tryAddSupport = (
    desiredTags: IngredientTag[],
    preferredCategories: ProductCategory[],
    message: (productId: string) => string
  ) => {
    const candidate = selectSupportCandidate(
      nextIds,
      allProducts,
      ingredients,
      standaloneProductIds,
      activeConcerns,
      desiredTags,
      preferredCategories
    );
    if (!candidate) return;
    addProduct(nextIds, candidate.id, allProducts);
    advantages.push(message(candidate.id));
  };

  if (!hasTag(currentProducts(), ingredients, "保湿修护")) {
    tryAddSupport(
      ["保湿修护", "屏障修护", "舒缓"],
      ["精华", "乳液", "面霜", "爽肤水"],
      (productId) => `推荐组合里加入了「${getProductLabel(productId, allProducts)}」做保湿打底，避免只补功效、不补基础含水量。`
    );
  }

  const hasIrritatingActive =
    hasTag(currentProducts(), ingredients, "酸类焕肤") ||
    hasTag(currentProducts(), ingredients, "视黄醇") ||
    hasTag(currentProducts(), ingredients, "祛痘");
  const needsRepair = activeConcerns.some((concern) => ["干燥", "敏感", "泛红", "屏障弱"].includes(concern));
  if (
    (hasIrritatingActive || needsRepair) &&
    !hasTag(currentProducts(), ingredients, "屏障修护") &&
    !hasTag(currentProducts(), ingredients, "舒缓")
  ) {
    tryAddSupport(
      ["屏障修护", "舒缓", "抗炎"],
      ["精华", "乳液", "面霜", "面膜"],
      (productId) => `推荐组合里加入了「${getProductLabel(productId, allProducts)}」做修护缓冲，降低活性成分集中叠加的刺激负担。`
    );
  }

  const needsSunscreen =
    hasIrritatingActive ||
    hasTag(currentProducts(), ingredients, "抗氧化") ||
    activeConcerns.some((concern) => ["暗沉", "色斑"].includes(concern));
  if (needsSunscreen && !hasTag(currentProducts(), ingredients, "防晒")) {
    tryAddSupport(
      ["防晒"],
      ["防晒"],
      (productId) => `推荐组合里加入了「${getProductLabel(productId, allProducts)}」补齐白天防护，避免提亮、焕肤或抗老步骤没有防晒收尾。`
    );
  }

  nextIds = sortRoutineIds(Array.from(new Set(nextIds)), allProducts);
  let recommendedProducts = getProductsByIds(nextIds, allProducts);
  const recommendedHasCleanser = recommendedProducts.some((product) => isCleanserCategory(product.category));
  const recommendedHasLeaveOn = recommendedProducts.some((product) => !isCleanserCategory(product.category));
  if (recommendedHasCleanser && recommendedHasLeaveOn) {
    const cleanserIds = recommendedProducts
      .filter((product) => isCleanserCategory(product.category))
      .map((product) => product.id);
    const newStandaloneCount = cleanserIds.filter((id) => !standaloneProductIds.includes(id)).length;
    standaloneProductIds = Array.from(new Set([...standaloneProductIds, ...cleanserIds]));
    if (newStandaloneCount > 0) {
      advantages.push("推荐后清洁类和留肤类并存，清洁产品已自动改为单独步骤，避免同一步抵消。");
    }
  }
  standaloneProductIds = standaloneProductIds.filter((id) => nextIds.includes(id));
  nextIds = removeHardConflicts(nextIds, allProducts, ingredients, standaloneProductIds, selectedProducts);
  standaloneProductIds = standaloneProductIds.filter((id) => nextIds.includes(id));

  const uncoveredAfterConflictCleanup = activeConcerns.filter(
    (concern) => !concernIsCovered(concern, nextIds, allProducts, ingredients, activeConcerns)
  );
  if (uncoveredAfterConflictCleanup.length > 0) {
    const repairResult = addConcernGapProducts(
      nextIds,
      allProducts,
      ingredients,
      standaloneProductIds,
      uncoveredAfterConflictCleanup,
      activeConcerns,
      Math.min(2, uncoveredAfterConflictCleanup.length)
    );
    nextIds = removeHardConflicts(
      sortRoutineIds(Array.from(new Set(repairResult.ids)), allProducts),
      allProducts,
      ingredients,
      standaloneProductIds,
      selectedProducts
    );
  }

  if (hardConflictCount(nextIds, allProducts, ingredients, standaloneProductIds) > 0) {
    const applyCandidates = nextIds.filter((id) => !standaloneProductIds.includes(id));
    const stableApplyId = applyCandidates.find(
      (id) => hardConflictCount([...standaloneProductIds, id], allProducts, ingredients, standaloneProductIds) === 0
    );
    nextIds = sortRoutineIds(
      stableApplyId ? [...standaloneProductIds, stableApplyId] : [...standaloneProductIds],
      allProducts
    );
    standaloneProductIds = standaloneProductIds.filter((id) => nextIds.includes(id));
    advantages.push("推荐组合已进一步收敛为更少但更稳定的产品，避免继续触发抵消或克制。");
  }

  nextIds = sortRoutineIds(Array.from(new Set(nextIds)), allProducts);
  recommendedProducts = getProductsByIds(nextIds, allProducts);
  const selectedIdSet = new Set(selectedProducts.map((product) => product.id));
  const concernCoverage: ConcernCoverage[] = activeConcerns.map((concern) => {
    const profile = concernProfiles[concern];
    const candidates = getConcernCandidateProducts(concern, allProducts, ingredients, activeConcerns);
    const matchedProducts = recommendedProducts.filter((product) =>
      isConcernCandidate(product, profile, ingredients, activeConcerns)
    );
    const existingMatches = matchedProducts.filter((product) => selectedIdSet.has(product.id));
    const matchedNames = matchedProducts.slice(0, 3).map((product) => `${product.brand} ${product.model}`).join("、");
    const status: ConcernCoverage["status"] = existingMatches.length > 0
      ? "已有覆盖"
      : matchedProducts.length > 0
        ? "推荐补入"
        : "暂未覆盖";
    const reason = status === "已有覆盖"
      ? `你选择的现有产品已经覆盖“${profile.goal}”；全库按当前情况筛出${candidates.length}个合格候选，无需重复堆同类功效。`
      : status === "推荐补入"
        ? `为补上“${profile.goal}”，从${candidates.length}个合格候选中选入${matchedNames}；排序同时考虑其他已选情况、成分风险和当前组合冲突。`
        : `全库有${candidates.length}个相关候选，但没有产品能在不增加硬冲突的前提下补入，当前组合优先保持稳定。`;

    return {
      concern,
      candidateCount: candidates.length,
      status,
      productIds: matchedProducts.map((product) => product.id),
      reason
    };
  });
  const applyProductIds = nextIds.filter((id) => !standaloneProductIds.includes(id));

  if (activeConcerns.length === 0 && advantages.length === 0) {
    advantages.push("当前组合没有明显硬冲突，推荐只补齐保湿、修护、防晒这类基础支撑。");
  }

  const reasons = Object.fromEntries(
    nextIds
      .map((id) => allProducts.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => [
        product.id,
        buildProductReason(product, ingredients, standaloneProductIds, selectedProducts, skinConcerns)
      ])
  );
  let applyIndex = -1;
  const usagePlans = Object.fromEntries(
    nextIds
      .map((id) => allProducts.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => {
        const standalone = standaloneProductIds.includes(product.id);
        if (!standalone) applyIndex += 1;
        return [product.id, buildUsagePlan(product, ingredients, applyIndex, standalone)];
      })
  );

  return {
    productIds: nextIds,
    applyProductIds,
    standaloneProductIds,
    advantages,
    concernCoverage,
    reasons,
    usagePlans
  };
}
