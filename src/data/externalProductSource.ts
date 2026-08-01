import { findIngredientIdsInText } from "./ingredientMatcher";
import type { Ingredient, Product, ProductCategory } from "../types";

interface OpenBeautyFactsProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  ingredients_text?: string;
  image_front_small_url?: string;
  image_url?: string;
  url?: string;
}

interface OpenBeautyFactsResponse {
  products?: OpenBeautyFactsProduct[];
}

const inferCategory = (product: OpenBeautyFactsProduct): ProductCategory => {
  const text = `${product.product_name ?? ""} ${product.generic_name ?? ""} ${product.categories ?? ""} ${(product.categories_tags ?? []).join(" ")}`.toLowerCase();

  if (/sunscreen|sun cream|sun protection|spf|防晒/.test(text)) return "防晒";
  if (/micellar|makeup remover|cleansing water|卸妆/.test(text)) return "卸妆水";
  if (/cleanser|cleansing gel|face wash|洁面/.test(text)) return "洁面";
  if (/toner|lotion tonique|爽肤水|化妆水/.test(text)) return "爽肤水";
  if (/eye cream|eye serum|眼霜/.test(text)) return "眼霜";
  if (/serum|ampoule|精华/.test(text)) return "精华";
  if (/acne|blemish|spot treatment|祛痘/.test(text)) return "祛痘护理";
  if (/mask|masque|面膜/.test(text)) return "面膜";
  if (/lip|balm|唇/.test(text)) return "唇部护理";
  if (/body|身体/.test(text)) return "身体乳";
  if (/neck|颈/.test(text)) return "颈部护理";
  if (/cream|moisturizer|moisturiser|面霜/.test(text)) return "面霜";
  if (/emulsion|milk|乳液/.test(text)) return "乳液";
  if (/spray|mist|喷雾/.test(text)) return "喷雾";
  return "精华";
};

const compact = (value?: string) => value?.trim().replace(/\s+/g, " ") ?? "";

const toProduct = (product: OpenBeautyFactsProduct, ingredients: Ingredient[]): Product | null => {
  const code = compact(product.code);
  const model = compact(product.product_name) || compact(product.generic_name);
  const brand = compact(product.brands).split(",")[0]?.trim() || "Open Beauty Facts";
  if (!code || !model) return null;

  const ingredientText = compact(product.ingredients_text);
  const ingredientIds = Array.from(new Set(findIngredientIdsInText(ingredientText, ingredients)));

  return {
    id: `openbeautyfacts-${code}`,
    brand,
    model,
    category: inferCategory(product),
    ingredientIds,
    notes: ingredientText ? `Open Beauty Facts：${ingredientText}` : "Open Beauty Facts 导入，待补全成分。",
    image: product.image_front_small_url || product.image_url || undefined
  };
};

export const searchOpenBeautyFactsProducts = async (query: string, ingredients: Ingredient[]) => {
  const keyword = query.trim();
  if (!keyword) return [];

  const params = new URLSearchParams({
    search_terms: keyword,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "8",
    fields: "code,product_name,generic_name,brands,categories,categories_tags,ingredients_text,image_front_small_url,image_url,url"
  });
  const response = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`);
  if (!response.ok) throw new Error("Open Beauty Facts 查询失败");

  const data = (await response.json()) as OpenBeautyFactsResponse;
  const seen = new Set<string>();
  return (data.products ?? [])
    .map((product) => toProduct(product, ingredients))
    .filter((product): product is Product => Boolean(product))
    .filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
};
