import { ingredientRelations } from "./relationships";
import { findIngredientByAnyName } from "./ingredientMatcher";
import type { AnalysisResult, Ingredient, IngredientRelation, IngredientTag, Product, SkinConcern } from "../types";

const names = (products: Product[]) => products.map((product) => `${product.brand} ${product.model}`).join(" + ");

const productIngredients = (product: Product, ingredients: Ingredient[]) =>
  product.ingredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id) ?? findIngredientByAnyName(id, ingredients))
    .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));

const productIngredientEntries = (products: Product[], ingredients: Ingredient[]) =>
  products.flatMap((product) =>
    productIngredients(product, ingredients).map((ingredient) => ({
      productId: product.id,
      ingredient
    }))
  );

const hasAnyTag = (ingredient: Ingredient, tags?: IngredientTag[]) =>
  Boolean(tags?.some((tag) => ingredient.tags.includes(tag)));

const hasAnyId = (ingredient: Ingredient, ids?: string[]) => Boolean(ids?.includes(ingredient.id));

const ingredientMatchesSide = (
  ingredient: Ingredient,
  tags?: IngredientTag[],
  ingredientIds?: string[]
) => hasAnyTag(ingredient, tags) || hasAnyId(ingredient, ingredientIds);

const relationMatches = (
  relation: IngredientRelation,
  entries: ReturnType<typeof productIngredientEntries>
) => {
  const left = entries.filter(({ ingredient }) =>
    ingredientMatchesSide(ingredient, relation.leftTags, relation.leftIngredientIds)
  );
  const right = entries.filter(({ ingredient }) =>
    ingredientMatchesSide(ingredient, relation.rightTags, relation.rightIngredientIds)
  );

  if (!left.length || !right.length) return false;
  return left.some((leftEntry) =>
    right.some((rightEntry) => leftEntry.productId !== rightEntry.productId)
  );
};

const sensitiveConcerns: SkinConcern[] = ["敏感", "屏障弱", "泛红"];
const dryConcerns: SkinConcern[] = ["干燥"];
const acneConcerns: SkinConcern[] = ["痘多", "出油多", "毛孔粗", "黑头"];

const skinContextNote = (skinConcerns: SkinConcern[]): string | null => {
  if (skinConcerns.length === 0) return null;
  const parts: string[] = [];
  const hasSensitive = skinConcerns.some((c) => sensitiveConcerns.includes(c));
  const hasDry = skinConcerns.some((c) => dryConcerns.includes(c));
  const hasAcne = skinConcerns.some((c) => acneConcerns.includes(c));
  if (hasSensitive) parts.push("你标记了敏感/屏障弱/泛红，高刺激组合风险更高");
  if (hasDry) parts.push("干性肌肤在酸类/A醇叠加时更容易脱皮紧绷");
  if (hasAcne) parts.push("油痘肌建议优先控油祛痘主力，避免多酸叠加");
  return parts.length ? `【结合你的肤质】${parts.join("；")}。` : null;
};

export function analyzeRoutine(
  products: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[] = [],
  skinConcerns: SkinConcern[] = []
): AnalysisResult[] {
  const sameStepProducts = products.filter((product) => !standaloneProductIds.includes(product.id));

  if (sameStepProducts.length < 2) {
    const note = skinContextNote(skinConcerns);
    return [
      {
        type: "信息不足",
        title: "至少选择两个产品",
        detail: note
          ? `单个产品或单独步骤只能看成分作用，不能判断同一步搭配关系。${note}`
          : "单个产品或单独步骤只能看成分作用，不能判断同一步搭配关系。",
        productIds: products.map((item) => item.id)
      }
    ];
  }

  const selectedName = names(sameStepProducts);
  const skinNote = skinContextNote(skinConcerns);

  const results = getMatchingIngredientRelations(products, ingredients, standaloneProductIds)
    .slice(0, 6)
    .map<AnalysisResult>((relation) => {
      let detail = relation.type === "互相抵消" ? `${selectedName}，${relation.detail}` : relation.detail;
      if (skinNote && (relation.type === "互相克制" || relation.type === "互相抵消")) {
        detail = `${detail} ${skinNote}`;
      }
      return {
        type: relation.type,
        title: relation.title,
        detail,
        productIds: sameStepProducts.map((product) => product.id)
      };
    });

  if (results.length === 0) {
    results.push({
      type: "信息不足",
      title: "没有发现明显冲突",
      detail: skinNote
        ? `当前组合没有命中高风险规则。按清洁、精华、面霜、防晒顺序使用，并观察泛红刺痛。${skinNote}`
        : "当前组合没有命中高风险规则。按清洁、精华、面霜、防晒顺序使用，并观察泛红刺痛。",
      productIds: sameStepProducts.map((product) => product.id)
    });
  }

  return results;
}

export function getMatchingIngredientRelations(
  products: Product[],
  ingredients: Ingredient[],
  standaloneProductIds: string[] = []
): IngredientRelation[] {
  const sameStepProducts = products.filter((product) => !standaloneProductIds.includes(product.id));
  const selectedIngredients = productIngredientEntries(sameStepProducts, ingredients);

  return ingredientRelations
    .filter((relation) => relationMatches(relation, selectedIngredients))
    .sort((a, b) => b.priority - a.priority);
}
