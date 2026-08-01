import Taro from "@tarojs/taro";
import { ingredients as seedIngredients, products as seedProducts } from "@shared/data/catalog";
import type { Product, SkinConcern } from "@shared/types";
import { defaultSelectedIds } from "./constants";

const localProductsKey = "beauty-products";
const selectedIdsKey = "beauty-selected-ids";
const concernsKey = "beauty-skin-concerns";

const readArray = <T,>(key: string, fallback: T[]): T[] => {
  try {
    const value = Taro.getStorageSync<T[]>(key);
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

export const getLocalProducts = () => readArray<Product>(localProductsKey, []);
export const setLocalProducts = (products: Product[]) => Taro.setStorageSync(localProductsKey, products);

export const getSelectedIds = () => readArray<string>(selectedIdsKey, defaultSelectedIds);
export const setSelectedIds = (ids: string[]) => Taro.setStorageSync(selectedIdsKey, ids);

export const getSkinConcerns = () => readArray<SkinConcern>(concernsKey, []);
export const setSkinConcerns = (concerns: SkinConcern[]) => Taro.setStorageSync(concernsKey, concerns);

export const getAllProducts = () => [...seedProducts, ...getLocalProducts()];

export const toggleStoredId = (id: string) => {
  const current = getSelectedIds();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  setSelectedIds(next);
  return next;
};

export const ingredientNames = (product: Product) =>
  product.ingredientIds
    .map((id) => seedIngredients.find((ingredient) => ingredient.id === id)?.name)
    .filter(Boolean)
    .join(" / ");

export const matchIngredientIds = (text: string) => {
  const input = text.toLowerCase();
  return Array.from(new Set(
    seedIngredients
      .filter((ingredient) =>
        [ingredient.name, ...ingredient.aliases].some((alias) => input.includes(alias.toLowerCase()))
      )
      .map((ingredient) => ingredient.id)
  ));
};
