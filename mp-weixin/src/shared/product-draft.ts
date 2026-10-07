import type { ProductCategory } from "@shared/types";
import type { LocalStoragePort } from "./sync-model";
import { categories } from "./constants";

export interface ProductDraft {
  schemaVersion: 1; scope: string; id: string;
  brand: string; model: string; category: ProductCategory; ingredientText: string; image: string;
}
const emptyDraft = (scope: string): ProductDraft => ({ schemaVersion: 1, scope,
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  brand: "", model: "", category: "精华", ingredientText: "", image: "" });
export const createProductDraftStore = (storage: LocalStoragePort) => {
  const key = (scope: string) => `beauty-mp-product-form-v1:${encodeURIComponent(scope)}`;
  const read = (scope: string): ProductDraft => {
    const raw = storage.get(key(scope));
    if (raw === "" || raw === undefined) {
      const draft = emptyDraft(scope); storage.set(key(scope), draft); return draft;
    }
    const d = raw as ProductDraft;
    if (!d || d.schemaVersion !== 1 || d.scope !== scope || typeof d.id !== "string" || !d.id.startsWith("manual-") ||
      !categories.includes(d.category) || ![d.brand, d.model, d.ingredientText, d.image].every((v) => typeof v === "string")) {
      throw new Error("添加草稿格式异常，原稿保留，已停止保存");
    }
    return { ...d };
  };
  const save = (draft: ProductDraft, currentScope: string) => {
    if (draft.scope !== currentScope) throw new Error("账号已变化，请返回后重新打开；原账号草稿保留");
    storage.set(key(draft.scope), { ...draft });
    return { ...draft };
  };
  const finish = (draft: ProductDraft, currentScope: string) => save(emptyDraft(draft.scope), currentScope);
  return { read, save, finish };
};
