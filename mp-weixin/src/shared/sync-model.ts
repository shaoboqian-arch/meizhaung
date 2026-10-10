import type { Product, SkinConcern } from "@shared/types";
import { categories, skinConcernOptions } from "./constants";

export interface Snapshot {
  localProducts: Product[];
  selectedIds: string[];
  skinConcerns: SkinConcern[];
}
export interface DraftState {
  schemaVersion: 1;
  scope: string;
  revision: number;
  baseSnapshot: Snapshot | null;
  desiredSnapshot: Snapshot;
  journalId: string | null;
  syncedAt: number;
  lastReadAt: number;
  deletedProductIds: string[];
}
export type Outcome<T> = { ok: true; data: T } | { ok: false; kind: string; message: string };
export interface SyncTransport {
  identity(): Promise<Outcome<string>>;
  read(owner: string): Promise<Outcome<Snapshot>>;
  putProducts(owner: string, products: Product[]): Promise<Outcome<null>>;
  removeProduct(owner: string, id: string): Promise<Outcome<null>>;
  putProfile(owner: string, snapshot: Snapshot): Promise<Outcome<null>>;
}
export interface LocalStoragePort { get(key: string): unknown; set(key: string, value: unknown): void }
export type SyncResult = { ok: boolean; message: string };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const absent = (value: unknown) => value === "" || value === undefined;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string");
export const validSnapshot = (value: unknown): value is Snapshot => {
  if (!value || typeof value !== "object") return false;
  const s = value as Snapshot;
  return strings(s.selectedIds) && strings(s.skinConcerns) && s.skinConcerns.every((c) => skinConcernOptions.includes(c)) &&
    Array.isArray(s.localProducts) && s.localProducts.every((p) => p && typeof p.id === "string" &&
      typeof p.brand === "string" && typeof p.model === "string" && categories.includes(p.category) && strings(p.ingredientIds) &&
      (p.notes === undefined || typeof p.notes === "string") && (p.image === undefined || typeof p.image === "string")) &&
    new Set(s.localProducts.map((p) => p.id)).size === s.localProducts.length;
};
export const productSignature = (p: Product | undefined) => p ? JSON.stringify({
  id: p.id, brand: p.brand, model: p.model, category: p.category,
  ingredientIds: [...p.ingredientIds].sort(), notes: p.notes ?? ""
}) : "absent";
const listSignature = (values: string[]) => JSON.stringify([...new Set(values)].sort());
export const snapshotSignature = (s: Snapshot) => JSON.stringify({
  selectedIds: listSignature(s.selectedIds), skinConcerns: listSignature(s.skinConcerns),
  products: [...s.localProducts].sort((a, b) => a.id.localeCompare(b.id)).map(productSignature)
});
export const withoutImages = (s: Snapshot): Snapshot => ({ ...clone(s),
  localProducts: s.localProducts.map(({ image: _image, ...p }) => clone(p)) });

/** Conflict is an editable failure, not permission to pick a winner. */
export const mergeSnapshots = (base: Snapshot, local: Snapshot, remote: Snapshot) => {
  const conflicts: string[] = [];
  const choose = <T,>(key: string, b: T, l: T, r: T, signature: (v: T) => string): T => {
    if (signature(l) === signature(b)) return r;
    if (signature(r) === signature(b) || signature(l) === signature(r)) return l;
    conflicts.push(key);
    return l;
  };
  const ids = new Set([...base.localProducts, ...local.localProducts, ...remote.localProducts].map((p) => p.id));
  const products: Product[] = [];
  for (const id of ids) {
    const l = local.localProducts.find((p) => p.id === id);
    const p = choose(`产品:${id}`, base.localProducts.find((v) => v.id === id), l,
      remote.localProducts.find((v) => v.id === id), productSignature);
    if (p) products.push({ ...p, ...(l?.image ? { image: l.image } : {}) });
  }
  return { conflicts, snapshot: {
    localProducts: products,
    selectedIds: choose("已选组合", base.selectedIds, local.selectedIds, remote.selectedIds, listSignature),
    skinConcerns: choose("皮肤情况", base.skinConcerns, local.skinConcerns, remote.skinConcerns, listSignature)
  } };
};

export const createLocalRepository = (storage: LocalStoragePort, initial: Snapshot) => {
  const activeKey = "beauty-mp-active-scope-v1";
  const key = (scope: string) => `beauty-mp-state-v1:${encodeURIComponent(scope)}`;
  const scope = (): string => {
    const raw = storage.get(activeKey);
    if (absent(raw)) return "guest";
    if (typeof raw !== "string" || !raw) throw new Error("本机账号标记损坏，已停止读写");
    return raw;
  };
  const peek = (owner = scope()): DraftState | null => {
    const raw = storage.get(key(owner));
    if (!absent(raw)) {
      const s = raw as DraftState;
      if (!s || s.schemaVersion !== 1 || s.scope !== owner || !Number.isInteger(s.revision) || s.revision < 0 ||
        !validSnapshot(s.desiredSnapshot) || (s.baseSnapshot !== null && !validSnapshot(s.baseSnapshot)) ||
        (s.journalId !== null && typeof s.journalId !== "string") || typeof s.syncedAt !== "number" ||
        typeof s.lastReadAt !== "number" || !strings(s.deletedProductIds)) {
        throw new Error("本机草稿读取异常，原始缓存已保留，不会上传");
      }
      return clone(s);
    }
    return null;
  };
  const read = (owner = scope()): DraftState => {
    const existing=peek(owner);
    if(existing) return existing;
    // Legacy keys are preserved verbatim. They belong to an unclaimed guest draft, never to an inferred account.
    const desired = clone(initial);
    let legacy = false;
    if (owner === "guest") {
      for (const [field, oldKey] of [["localProducts", "beauty-products"], ["selectedIds", "beauty-selected-ids"],
        ["skinConcerns", "beauty-skin-concerns"]] as const) {
        const old = storage.get(oldKey);
        if (!absent(old)) { Object.assign(desired, { [field]: old }); legacy = true; }
      }
      if (!validSnapshot(desired)) throw new Error("旧本机草稿格式异常，已保留且未迁移");
    }
    const state: DraftState = { schemaVersion: 1, scope: owner, revision: 0, baseSnapshot: null,
      desiredSnapshot: desired, journalId: legacy ? "legacy-guest" : null, syncedAt: 0, lastReadAt: 0, deletedProductIds: [] };
    storage.set(key(owner), state);
    return clone(state);
  };
  const save = (s: DraftState) => storage.set(key(s.scope), clone(s));
  const activate = (owner: string) => { read(owner); storage.set(activeKey, owner); };
  const change = (update: (s: Snapshot) => Snapshot) => {
    const state = read();
    const next = update(clone(state.desiredSnapshot));
    if (!validSnapshot(next)) throw new Error("本机数据格式有误，未保存");
    const removed = state.desiredSnapshot.localProducts.filter((p) => !next.localProducts.some((n) => n.id === p.id)).map((p) => p.id);
    state.deletedProductIds = [...new Set([...state.deletedProductIds, ...removed])]
      .filter((id) => !next.localProducts.some((p) => p.id === id));
    state.desiredSnapshot = next;
    state.revision += 1;
    state.journalId = `${state.scope}:${state.revision}:${Date.now()}`;
    // The single durable envelope contains the original base and desired draft BEFORE the UI reports success.
    save(state);
    return next;
  };
  return { read, peek, save, scope, activate, change };
};

export const createSyncCoordinator = (repo: ReturnType<typeof createLocalRepository>, transport: SyncTransport,
  initial: Snapshot) => {
  let running = false;
  const sync = async (upload: boolean): Promise<SyncResult> => {
    if (running) return { ok: false, message: "同步正在进行，改动仍保存在本机" };
    running = true;
    try {
      const identity = await transport.identity();
      if (!identity.ok) return identity;
      const owner = identity.data;
      if (repo.scope() !== owner) {
        // Account switch must never automatically submit either guest or previous-account data.
        if (upload) return { ok: false, message: "当前草稿不属于登录账号，请先登录并读取；原稿已保留" };
        repo.activate(owner);
      }
      const remote = await transport.read(owner);
      if (!remote.ok) return remote;
      if (!validSnapshot(remote.data)) return { ok: false, message: "云端数据格式有误，本机草稿未覆盖" };
      if (repo.scope() !== owner) return { ok: false, message: "账号已切换，已停止同步" };
      const current = repo.read(owner); // Re-read edits made while the request was in flight.
      const merged = current.journalId
        ? mergeSnapshots(current.baseSnapshot ?? initial, current.desiredSnapshot, remote.data)
        : { snapshot: { ...remote.data, localProducts: remote.data.localProducts.map((p) => ({ ...p,
            ...(current.desiredSnapshot.localProducts.find((l) => l.id === p.id)?.image ?
              { image: current.desiredSnapshot.localProducts.find((l) => l.id === p.id)!.image } : {}) })) }, conflicts: [] };
      if (merged.conflicts.length) return { ok: false,
        message: `存在冲突（${merged.conflicts.join("、")}），已保留本机原稿，未上传` };
      merged.snapshot.localProducts = merged.snapshot.localProducts.filter((p) => !current.deletedProductIds.includes(p.id));
      merged.snapshot.selectedIds = merged.snapshot.selectedIds.filter((id) => !current.deletedProductIds.includes(id));
      const state: DraftState = { ...current, baseSnapshot: withoutImages(remote.data), desiredSnapshot: merged.snapshot,
        lastReadAt: Date.now(),
        journalId: snapshotSignature(merged.snapshot) === snapshotSignature(remote.data) ? null :
          (current.journalId ?? `tombstone:${current.revision}:${Date.now()}`) };
      repo.save(state);
      if (!upload) return { ok: true, message: state.journalId ? "云端已读取，本机仍有待同步改动" : "已读取云端数据" };
      const sent = clone(state.desiredSnapshot);
      const puts = sent.localProducts.filter((p) => productSignature(p) !== productSignature(remote.data.localProducts.find((r) => r.id === p.id)));
      const removed = remote.data.localProducts.filter((p) => !sent.localProducts.some((l) => l.id === p.id));
      const profileChanged = listSignature(sent.selectedIds) !== listSignature(remote.data.selectedIds) ||
        listSignature(sent.skinConcerns) !== listSignature(remote.data.skinConcerns);
      const stillActive = () => repo.scope() === owner;
      if (!stillActive()) return { ok: false, message: "账号已切换，待同步记录保留" };
      if (puts.length) {
        const put = await transport.putProducts(owner, puts.map(({ image: _image, ...p }) => p));
        if (!put.ok) return put;
      }
      for (const p of removed) {
        if (!stillActive()) return { ok: false, message: "账号已切换，待同步记录保留" };
        const result = await transport.removeProduct(owner, p.id);
        if (!result.ok) return result;
      }
      if (profileChanged) {
        if (!stillActive()) return { ok: false, message: "账号已切换，待同步记录保留" };
        const result = await transport.putProfile(owner, withoutImages(sent)); if (!result.ok) return result;
      }
      if (!stillActive()) return { ok: false, message: "账号已切换，待同步记录保留" };
      const receipt = await transport.read(owner);
      if (!receipt.ok) return { ok: false, message: `上传后回读失败，原稿及待同步记录保留：${receipt.message}` };
      if (!validSnapshot(receipt.data) || snapshotSignature(receipt.data) !== snapshotSignature(sent)) {
        return { ok: false, message: "上传后回读不一致，原稿及待同步记录保留" };
      }
      const latest = repo.read(owner);
      // A successful older request cannot clear a newer draft.
      repo.save({ ...latest, baseSnapshot: withoutImages(receipt.data), syncedAt: Date.now(),
        journalId: snapshotSignature(latest.desiredSnapshot) === snapshotSignature(sent) ? null : latest.journalId });
      return { ok: true, message: repo.read(owner).journalId ? "本次已回读确认，新增改动仍待同步" : "已同步并回读确认" };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "同步失败，本机原稿保留" };
    } finally { running = false; }
  };
  return { pull: () => sync(false), push: () => sync(true) };
};
