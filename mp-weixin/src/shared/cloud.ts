import Taro from "@tarojs/taro";
import { createMiniProgramWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk/miniprogram";
import { createDiagnosticWx } from "./workbuddy-cloud-diagnostics";
import { defaultSelectedIds } from "./constants";
import { validSnapshot, type Outcome, type Snapshot, type SyncTransport } from "./sync-model";
import type { Product } from "@shared/types";

/** The existing public application key is not an edit credential. */
const publicConfig = {
  endpoint: "https://mp-api.app.workbuddy.host",
  publishableKey: "wbpk_t1U4NdF6I0IZdm8LzoMLq6_ZgDedK2i111Xzj6vrW9uZKtgBLTsjCje"
};
type ProductRow = {
  product_id: string; brand: string; model: string; category: Product["category"];
  ingredient_ids: string[]; notes?: string | null;
};
type ProfileRow = { selected_ids: string[]; skin_concerns: Snapshot["skinConcerns"] };
type Database = { public: { Tables: {
  user_products: { Row: ProductRow & { owner_id: string; created_at: string }; Insert: ProductRow; Update: Partial<ProductRow>; Relationships: [] };
  user_profiles: { Row: ProfileRow & { owner_id: string }; Insert: ProfileRow; Update: Partial<ProfileRow>; Relationships: [] };
}; Views: {}; Functions: {} } };
export const cloud = createMiniProgramWorkBuddyCloud<Database>({
  endpoint: publicConfig.endpoint, publishableKey: publicConfig.publishableKey,
  wx: createDiagnosticWx(Taro)
});
const messages: Record<string, string> = {
  unauthenticated: "请先微信登录；本机原稿保留",
  "permission-denied": "当前账号没有权限，原稿保留且未覆盖",
  "not-found": "读取目标不存在，已停止覆盖",
  "invalid-request": "请求格式有误，已停止同步",
  "rate-limited": "操作太频繁，请稍后重试",
  "credits-exhausted": "云服务额度已用尽，本机原稿保留",
  "backend-unavailable": "同步服务暂不可用，本机改动保留",
  network: "网络不通，本机改动及待同步记录保留"
};
const failure = (error: unknown, status?: number): Outcome<never> => {
  const e = error && typeof error === "object" ? error as Record<string, unknown> : {};
  // Auth returns CloudError.kind; PostgREST returns code plus response.status.
  // Never infer a missing record from a timeout or match localized message text.
  const code = String(e.code ?? "");
  const kind = typeof e.kind === "string" ? e.kind :
    code === "42501" || status === 403 ? "permission-denied" :
    status === 401 ? "unauthenticated" : status === 404 ? "not-found" :
    status === 429 ? "rate-limited" : status !== undefined && status >= 500 ? "backend-unavailable" :
    status === 400 || code.startsWith("22") || code.startsWith("23") ? "invalid-request" :
    status === 0 ? "network" : "unknown";
  return { ok: false, kind, message: messages[kind] ?? "同步服务调用失败，本机原稿保留，请重试" };
};
const ok = <T,>(data: T): Outcome<T> => ({ ok: true, data });

export const getIdentity = async (): Promise<Outcome<string>> => {
  try {
    const { data, error } = await cloud.auth.getSession();
    if (error) return failure(error);
    if (!data?.user?.id || data.user.isAnonymous) return failure({ kind: "unauthenticated" });
    return ok(data.user.id);
  } catch (error) { return failure(error); }
};
const guard = async (owner: string): Promise<Outcome<null>> => {
  const identity = await getIdentity();
  if (!identity.ok) return identity;
  return identity.data === owner ? ok(null) : { ok: false, kind: "account-changed", message: "账号已变化，已停止同步" };
};

export const signInWithWechat = async () => {
  try {
    const appid = Taro.getAccountInfoSync().miniProgram?.appId;
    if (!appid) return { ok: false, message: "运行环境缺少小程序标识，无法登录" };
    const { code } = await Taro.login();
    if (!code) return { ok: false, message: "微信登录未完成，请重试" };
    const { error } = await cloud.auth.signInWithWechat(code, appid);
    if (error) return failure(error);
    return { ok: true, message: "已登录，尚未上传本机数据" };
  } catch (error) { return failure(error); }
};

export const syncTransport: SyncTransport = {
  identity: getIdentity,
  async read(owner) {
    const access = await guard(owner);
    if (!access.ok) return access;
    try {
      const [products, profile] = await Promise.all([
        cloud.database.from("user_products").select("product_id, brand, model, category, ingredient_ids, notes")
          .order("created_at", { ascending: true }),
        cloud.database.from("user_profiles").select("skin_concerns, selected_ids").maybeSingle()
      ]);
      if (products.error) return failure(products.error, products.status);
      if (profile.error) return failure(profile.error, profile.status);
      if (!Array.isArray(products.data)) return failure({ kind: "invalid-request" });
      const p = profile.data as ProfileRow | null;
      const snapshot: Snapshot = {
        localProducts: (products.data as ProductRow[]).map((r) => ({
          id: r.product_id, brand: r.brand, model: r.model, category: r.category,
          ingredientIds: r.ingredient_ids, ...(r.notes == null ? {} : { notes: r.notes })
        })),
        selectedIds: p ? p.selected_ids : [...defaultSelectedIds],
        skinConcerns: p ? p.skin_concerns : []
      };
      if (!validSnapshot(snapshot)) return failure({ kind: "invalid-request" });
      const rechecked = await guard(owner);
      return rechecked.ok ? ok(snapshot) : rechecked;
    } catch (error) { return failure(error); }
  },
  async putProducts(owner, products) {
    if (!products.length) return ok(null);
    const access = await guard(owner);
    if (!access.ok) return access;
    try {
      // Only operation deltas, never a full product-table replacement; no owner_id or device image path.
      const { error, status } = await cloud.database.from("user_products").upsert(products.map((p) => ({
        product_id: p.id, brand: p.brand, model: p.model, category: p.category,
        ingredient_ids: p.ingredientIds, notes: p.notes ?? null
      })), { onConflict: "owner_id,product_id" });
      return error ? failure(error, status) : ok(null);
    } catch (error) { return failure(error); }
  },
  async removeProduct(owner, id) {
    const access = await guard(owner);
    if (!access.ok) return access;
    try {
      const { error, status } = await cloud.database.from("user_products").delete().eq("product_id", id).select("product_id");
      return error ? failure(error, status) : ok(null); // Zero rows can be an idempotent retry. Final GET proves absence.
    } catch (error) { return failure(error); }
  },
  async putProfile(owner, snapshot) {
    const access = await guard(owner);
    if (!access.ok) return access;
    try {
      const { error, status } = await cloud.database.from("user_profiles").upsert({
        skin_concerns: snapshot.skinConcerns, selected_ids: snapshot.selectedIds
      }, { onConflict: "owner_id" });
      return error ? failure(error, status) : ok(null);
    } catch (error) { return failure(error); }
  }
};
