import type { Product, SkinConcern } from "../types";

export interface RoutineSnapshot {
  selectedIds: string[];
  skinConcerns: SkinConcern[];
  localProducts: Product[];
}

const mergeStringList = <T extends string>(base: T[], local: T[], remote: T[]) => {
  const baseSet = new Set(base);
  const localSet = new Set(local);
  const merged = new Set(remote);

  base.forEach((item) => {
    if (!localSet.has(item)) merged.delete(item);
  });
  local.forEach((item) => {
    if (!baseSet.has(item)) merged.add(item);
  });
  return [...merged];
};

const comparableProduct = ({ image: _image, ...product }: Product) => JSON.stringify(product);

export const mergeRoutineSnapshots = (
  base: RoutineSnapshot,
  local: RoutineSnapshot,
  remote: RoutineSnapshot
): RoutineSnapshot => {
  const baseProducts = new Map(base.localProducts.map((product) => [product.id, product]));
  const localProducts = new Map(local.localProducts.map((product) => [product.id, product]));
  const mergedProducts = new Map(remote.localProducts.map((product) => [product.id, product]));

  baseProducts.forEach((_product, id) => {
    if (!localProducts.has(id)) mergedProducts.delete(id);
  });
  localProducts.forEach((product, id) => {
    const baseProduct = baseProducts.get(id);
    if (!baseProduct || comparableProduct(product) !== comparableProduct(baseProduct)) mergedProducts.set(id, product);
  });

  return {
    selectedIds: mergeStringList(base.selectedIds, local.selectedIds, remote.selectedIds),
    skinConcerns: mergeStringList(base.skinConcerns, local.skinConcerns, remote.skinConcerns),
    localProducts: [...mergedProducts.values()]
  };
};
