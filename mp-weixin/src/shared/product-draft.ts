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
  const validate = (raw: unknown, scope: string): ProductDraft => {
    const d = raw as ProductDraft;
    if (!d || d.schemaVersion !== 1 || d.scope !== scope || typeof d.id !== "string" || !d.id.startsWith("manual-") ||
      !categories.includes(d.category) || ![d.brand, d.model, d.ingredientText, d.image].every((v) => typeof v === "string")) {
      throw new Error("添加草稿格式异常，原稿保留，已停止保存");
    }
    return { ...d };
  };
  const write = (draft: ProductDraft) => {
    storage.set(key(draft.scope), { ...draft });
    const receipt = validate(storage.get(key(draft.scope)), draft.scope);
    if (["schemaVersion", "scope", "id", "brand", "model", "category", "ingredientText", "image"].some(field => receipt[field as keyof ProductDraft] !== draft[field as keyof ProductDraft])) throw new Error("草稿保存未确认，请保留当前页面，填写内容仍可编辑");
    return { ...draft };
  };
  const read = (scope: string): ProductDraft => {
    const raw = storage.get(key(scope));
    if (raw === "" || raw === undefined) {
      return write(emptyDraft(scope));
    }
    return validate(raw, scope);
  };
  const save = (draft: ProductDraft, currentScope: string) => {
    if (draft.scope !== currentScope) throw new Error("账号已变化，请返回后重新打开；原账号草稿保留");
    validate(draft, currentScope);
    const current = validate(storage.get(key(currentScope)), currentScope);
    if (current.id !== draft.id) throw new Error("原草稿已结束或已更换，当前填写已保留，旧请求已停止");
    return write(draft);
  };
  const finish = (draft: ProductDraft, currentScope: string) => {
    if (draft.scope !== currentScope) throw new Error("账号已变化，原账号草稿保留");
    const current = validate(storage.get(key(currentScope)), currentScope);
    if (current.id !== draft.id) throw new Error("原草稿已结束或已更换，旧请求已停止");
    return write(emptyDraft(currentScope));
  };
  const peek = (scope: string): ProductDraft | null => {
    const raw = storage.get(key(scope));
    return raw === '' || raw === undefined ? null : validate(raw,scope);
  };
  return { read, save, finish, peek };
};
