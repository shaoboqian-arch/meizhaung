import type { Ingredient } from "../types";

export interface IngredientTextMatch {
  ingredientId: string;
  ingredientName: string;
  matchedAlias: string;
  sourceFragment: string;
  basis: "标准名" | "中文别名" | "英文/INCI 别名";
}

export interface IngredientTextMatchResult {
  matches: IngredientTextMatch[];
  unmatchedFragments: string[];
}

const normalizeAlias = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u3000\s]+/g, " ")
    .replace(/[-_/]+/g, " ")
    .replace(/[，,;；、|()[\]{}:：.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isAsciiWords = (value: string) => /^[a-z0-9 ]+$/.test(value);

const containsAlias = (normalizedText: string, normalizedAlias: string) => {
  if (!normalizedAlias) return false;
  if (isAsciiWords(normalizedAlias)) {
    return ` ${normalizedText} `.includes(` ${normalizedAlias} `);
  }
  return normalizedText.includes(normalizedAlias);
};

export const normalizeIngredientText = (value: string) => normalizeAlias(value);

export const getIngredientSearchTerms = (ingredient: Ingredient) =>
  Array.from(new Set([ingredient.id, ingredient.name, ingredient.canonicalName, ...ingredient.aliases].filter(Boolean)))
    .map((term) => normalizeAlias(String(term)))
    .filter((term) => term.length >= 2);

export const findIngredientIdsInText = (text: string, ingredients: Ingredient[]) => {
  const normalizedText = normalizeIngredientText(text);
  if (!normalizedText) return [];

  return ingredients
    .filter((ingredient) =>
      getIngredientSearchTerms(ingredient).some((term) => containsAlias(normalizedText, term))
    )
    .map((ingredient) => ingredient.id);
};

export const getIngredientSearchText = (ingredient: Ingredient) =>
  getIngredientSearchTerms(ingredient).join(" ");

export const findIngredientByAnyName = (value: string, ingredients: Ingredient[]) => {
  const normalizedValue = normalizeAlias(value);
  return ingredients.find((ingredient) =>
    getIngredientSearchTerms(ingredient).some((term) => term === normalizedValue)
  );
};

const ocrSeparatorPattern = /[,，;；、\n\r|]+/u;
const ocrLabelPattern = /^(?:ingredients?|inci|成分(?:表|全成分)?)[\s:：]*/iu;
const meaningfulCharacterPattern = /[\p{L}\p{N}]/u;

const isHanText = (value: string) => /\p{Script=Han}/u.test(value);

const getOcrAliases = (ingredient: Ingredient) =>
  Array.from(new Set([ingredient.name, ingredient.canonicalName, ...ingredient.aliases].filter(Boolean)))
    .map((alias) => ({ ingredient, alias: String(alias), normalized: normalizeAlias(String(alias)) }))
    .filter((entry) => entry.normalized.length >= 2)
    .sort((left, right) => right.normalized.length - left.normalized.length);

const hasWholeAlias = (text: string, normalizedAlias: string) => {
  if (text === normalizedAlias) return true;
  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
};

const removeAlias = (text: string, normalizedAlias: string) => {
  const escaped = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return text.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu"), "$1 ").replace(/\s+/g, " ").trim();
};

const getMatchBasis = (ingredient: Ingredient, alias: string): IngredientTextMatch["basis"] => {
  if (normalizeAlias(alias) === normalizeAlias(ingredient.name)) return "标准名";
  return isHanText(alias) ? "中文别名" : "英文/INCI 别名";
};

export const matchIngredientText = (text: string, ingredients: Ingredient[]): IngredientTextMatchResult => {
  const fragments = text
    .split(ocrSeparatorPattern)
    .map((fragment) => fragment.replace(ocrLabelPattern, "").trim())
    .filter((fragment) => meaningfulCharacterPattern.test(fragment));
  const aliases = ingredients.flatMap(getOcrAliases);
  const matches = new Map<string, IngredientTextMatch>();
  const unmatchedFragments: string[] = [];

  for (const fragment of fragments) {
    let residual = normalizeAlias(fragment);
    let matched = false;

    for (const { ingredient, alias, normalized } of aliases) {
      if (matches.has(ingredient.id) || !hasWholeAlias(residual, normalized)) continue;
      matches.set(ingredient.id, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        matchedAlias: alias,
        sourceFragment: fragment,
        basis: getMatchBasis(ingredient, alias)
      });
      matched = true;
      residual = removeAlias(residual, normalized);
    }

    const remainingMeaningfulText = residual
      .replace(/[\d.%()[\]{}]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if ((!matched || meaningfulCharacterPattern.test(remainingMeaningfulText)) && remainingMeaningfulText) {
      unmatchedFragments.push(fragment);
    }
  }

  return {
    matches: [...matches.values()],
    unmatchedFragments: Array.from(new Set(unmatchedFragments))
  };
};
