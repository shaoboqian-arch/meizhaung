import type { Product, ProductCategory, Ingredient } from "@shared/types";

export const PAGE_SIZE = 24;
export const filterProducts = (products: Product[], ingredients: Ingredient[], options: {
  search: string; category: ProductCategory | "全部"; localOnly: boolean; localIds: string[];
}) => {
  const keyword = options.search.normalize("NFKC").trim().toLowerCase();
  const names = new Map(ingredients.map((i) => [i.id, [i.name, ...i.aliases].join(" ")]));
  return products.filter((p) => {
    if (options.localOnly && !options.localIds.includes(p.id)) return false;
    // Searching intentionally spans categories; the category filter is only for browsing.
    if (!keyword) return options.category === "全部" || p.category === options.category;
    return [p.brand, p.model, p.category, p.notes ?? "", ...p.ingredientIds.map((id) => names.get(id) ?? "")]
      .join(" ").normalize("NFKC").toLowerCase().includes(keyword);
  });
};
export const pageItems = <T,>(items: T[], page: number) => items.slice(0, Math.max(1, page) * PAGE_SIZE);
export const detailUrl = (kind: "product" | "ingredient", id: string) =>
  `/pages/${kind}-detail/index?id=${encodeURIComponent(id)}`;
