import { findIngredientByAnyName } from "@shared/data/ingredientMatcher";
import type { Ingredient, Product } from "@shared/types";

export const recommendationPolicyVersion = "medicine-review-v1";

// Conservative recommendation eligibility, not a determination of a product's legal status.
// Ingredient keys (including resolved aliases) govern catalog, manual and OCR entries alike.
const reviewIngredientIds = new Set(["adapalene", "benzoyl-peroxide"]);
const medicineInformation = /药物|处方药|遵医嘱|医生指导|\bOTC\b/iu;

export function getProductRecommendationRestriction(product: Product, ingredients: Ingredient[]): string {
  const evidence = product.ingredientIds.some((key) => {
    const ingredient = ingredients.find((item) => item.id === key) ?? findIngredientByAnyName(key, ingredients);
    return reviewIngredientIds.has(key) || Boolean(ingredient && (reviewIngredientIds.has(ingredient.id)
      || medicineInformation.test(`${ingredient.plainEffect} ${ingredient.caution ?? ""}`)));
  }) || medicineInformation.test(product.notes ?? "");
  return evidence ? "含需核对用药信息的成分或备注，不参与自动护肤推荐；原始选择保留，请按医嘱核对。" : "";
}
