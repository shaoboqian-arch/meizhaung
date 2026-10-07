import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createLocalRepository, createSyncCoordinator, mergeSnapshots, snapshotSignature, type Snapshot,
  type SyncTransport, type Outcome } from "../src/shared/sync-model";
import { groupAnalysis, sortCoverage } from "../src/shared/analysis-view";
import { Disclosure } from "../src/components/Disclosure";
import { cloud, syncTransport } from "../src/shared/cloud";
import Taro from "@tarojs/taro";
import { signInAndSync, getLocalProducts, importGuestDraft, useGuestDraft } from "../src/shared/storage";
import type { Product, ConcernCoverage } from "../../src/types";

const initial: Snapshot = { localProducts: [], selectedIds: ["seed"], skinConcerns: [] };
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const p = (id: string, model = "原稿"): Product => ({ id, brand: "合成测试", model, category: "精华", ingredientIds: ["niacinamide"] });
const fixture = () => {
  const memory = new Map<string, unknown>();
  let owner = "account-a";
  let remote: Snapshot = copy(initial);
  let readFailure: string | null = null;
  let writeFailure = false;
  let onPut: (() => void) | null = null;
  let onRead: (() => void) | null = null;
  const writes: unknown[] = [];
  const storage = { get: (key: string) => memory.has(key) ? copy(memory.get(key)) : "",
    set: (key: string, value: unknown) => memory.set(key, copy(value)) };
  const repo = createLocalRepository(storage, initial);
  const transport: SyncTransport = {
    identity: async () => ({ ok: true, data: owner }),
    read: async () => {
      onRead?.();
      return readFailure ? { ok: false, kind: readFailure, message: readFailure } : { ok: true, data: copy(remote) };
    },
    putProducts: async (_owner, products) => {
      writes.push(copy(products));
      if (writeFailure) return { ok: false, kind: "network", message: "network" };
      for (const product of products) remote.localProducts = [...remote.localProducts.filter((v) => v.id !== product.id), copy(product)];
      onPut?.();
      return { ok: true, data: null };
    },
    removeProduct: async (_owner, id) => {
      writes.push({ delete: id });
      if (writeFailure) return { ok: false, kind: "network", message: "network" };
      remote.localProducts = remote.localProducts.filter((v) => v.id !== id);
      return { ok: true, data: null };
    },
    putProfile: async (_owner, s) => {
      writes.push({ profile: copy(s) });
      if (writeFailure) return { ok: false, kind: "network", message: "network" };
      remote.selectedIds = [...s.selectedIds]; remote.skinConcerns = [...s.skinConcerns];
      return { ok: true, data: null };
    }
  };
  const sync = createSyncCoordinator(repo, transport, initial);
  return { memory, storage, repo, sync, transport, writes,
    remote: () => remote, setRemote: (v: Snapshot) => { remote = copy(v); }, setOwner: (v: string) => { owner = v; },
    failRead: (v: string | null) => { readFailure = v; }, failWrite: (v: boolean) => { writeFailure = v; },
    duringPut: (fn: () => void) => { onPut = fn; }, duringRead: (fn: () => void) => { onRead = fn; } };
};

test("旧缓存只迁移到游客草稿，主动清空的数组有效，原键保留", () => {
  const f = fixture();
  f.memory.set("beauty-products", [p("legacy")]); f.memory.set("beauty-selected-ids", []);
  assert.deepEqual(f.repo.read().desiredSnapshot.selectedIds, []);
  assert.equal(f.repo.read().desiredSnapshot.localProducts[0].id, "legacy");
  assert.ok(f.memory.has("beauty-products"));
  f.repo.activate("account-a"); assert.deepEqual(f.repo.read().desiredSnapshot.localProducts, []);
});
test("损坏或读取异常不能当空数据覆盖", () => {
  const f = fixture(); f.memory.set("beauty-products", "broken");
  const before = f.memory.size;
  assert.throws(() => f.repo.read(), /格式异常/); assert.equal(f.memory.size, before);
  const broken = createLocalRepository({ get() { throw new Error("storage offline"); }, set() { assert.fail("must not write"); } }, initial);
  assert.throws(() => broken.read(), /storage offline/);
});
test("本机写入失败不报告成功，不清填写原稿", () => {
  const f = fixture(); f.repo.read();
  const repo = createLocalRepository({ get: f.storage.get, set() { throw new Error("quota"); } }, initial);
  assert.throws(() => repo.change((s) => ({ ...s, selectedIds: [] })), /quota/);
  assert.deepEqual(f.repo.read().desiredSnapshot.selectedIds, initial.selectedIds);
});
test("登录式pull先读不写，游客和两个账号原稿相互隔离", async () => {
  const f = fixture(); f.repo.change((s) => ({ ...s, localProducts: [p("guest")] }));
  f.setRemote({ ...initial, selectedIds: ["cloud-a"] });
  assert.equal((await f.sync.pull()).ok, true); assert.equal(f.writes.length, 0);
  assert.deepEqual(f.repo.read().desiredSnapshot.selectedIds, ["cloud-a"]);
  f.repo.change((s) => ({ ...s, skinConcerns: ["干燥"] }));
  f.setOwner("account-b"); f.setRemote({ ...initial, selectedIds: ["cloud-b"] }); await f.sync.pull();
  assert.deepEqual(f.repo.read().desiredSnapshot.skinConcerns, []);
  assert.deepEqual(f.repo.read("account-a").desiredSnapshot.skinConcerns, ["干燥"]);
  assert.equal(f.repo.read("guest").desiredSnapshot.localProducts[0].id, "guest");
});
test("切账号后的push不会把前一账号或游客上传", async () => {
  const f = fixture(); f.repo.change((s) => ({ ...s, localProducts: [p("guest")] }));
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
  assert.equal(f.repo.scope(), "guest");
});
for (const kind of ["network", "permission-denied", "invalid-request", "not-found", "backend-unavailable"]) {
  test(`${kind}读取失败：零写入、原稿和base不变`, async () => {
    const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, selectedIds: [] }));
    const before = f.repo.read(); f.failRead(kind);
    assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
    assert.deepEqual(f.repo.read(), before);
  });
}
test("离线刷新重建repository后，清空选择仍保留，云端旧快照不能恢复它", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, selectedIds: [] }));
  const reboot = createLocalRepository(f.storage, initial);
  assert.deepEqual(reboot.read().desiredSnapshot.selectedIds, []); assert.ok(reboot.read().journalId);
  await createSyncCoordinator(reboot, f.transport, initial).pull();
  assert.deepEqual(reboot.read().desiredSnapshot.selectedIds, []);
  await f.sync.push(); assert.deepEqual(f.remote().selectedIds, []); assert.equal(f.repo.read().journalId, null);
});
test("三方合并接受不同产品的增量，不制造同编号重复产品", () => {
  const base = { ...initial, localProducts: [p("base")] };
  const merged = mergeSnapshots(base, { ...base, localProducts: [...base.localProducts, p("local")] },
    { ...base, localProducts: [...base.localProducts, p("remote")] });
  assert.deepEqual(merged.conflicts, []); assert.equal(merged.snapshot.localProducts.length, 3);
});
test("同产品双端修改冲突保留本机原稿，零上传", async () => {
  const f = fixture(); f.setRemote({ ...initial, localProducts: [p("same")] }); await f.sync.pull();
  f.repo.change((s) => ({ ...s, localProducts: [p("same", "本机修改")] }));
  f.setRemote({ ...initial, localProducts: [p("same", "云端修改")] });
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
  assert.equal(f.repo.read().desiredSnapshot.localProducts[0].model, "本机修改");
});
test("同一profile字段双端冲突不自动选赢家", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, skinConcerns: ["敏感"] }));
  f.setRemote({ ...initial, skinConcerns: ["干燥"] });
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
});
test("删除失败保留墓碑，重启不复活；重试回读确认后仍阻挡旧记录", async () => {
  const f = fixture(); f.setRemote({ ...initial, localProducts: [p("deleted")], selectedIds: ["deleted"] }); await f.sync.pull();
  f.repo.change((s) => ({ ...s, localProducts: [], selectedIds: [] })); f.failWrite(true);
  assert.equal((await f.sync.push()).ok, false); assert.ok(f.repo.read().journalId);
  const reboot = createLocalRepository(f.storage, initial); await createSyncCoordinator(reboot, f.transport, initial).pull();
  assert.deepEqual(reboot.read().desiredSnapshot.localProducts, []);
  f.failWrite(false); assert.equal((await f.sync.push()).ok, true);
  assert.deepEqual(f.repo.read().deletedProductIds, ["deleted"]);
  f.setRemote({ ...initial, localProducts: [p("deleted")], selectedIds: ["deleted"] }); await f.sync.pull();
  assert.deepEqual(f.repo.read().desiredSnapshot.localProducts, []); assert.deepEqual(f.repo.read().desiredSnapshot.selectedIds, []);
  assert.ok(f.repo.read().journalId);
});
test("上传后的GET失败不能清journal", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, localProducts: [p("new")] }));
  f.duringPut(() => f.failRead("network")); assert.equal((await f.sync.push()).ok, false);
  assert.ok(f.repo.read().journalId); assert.equal(f.repo.read().desiredSnapshot.localProducts[0].id, "new");
});
test("回读不一致不能清journal", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, localProducts: [p("new")] }));
  f.duringPut(() => f.setRemote({ ...initial, localProducts: [p("new", "不同收据")] }));
  assert.equal((await f.sync.push()).ok, false); assert.ok(f.repo.read().journalId);
});
test("上传进行中新增编辑：旧收据不得清新版journal", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, localProducts: [p("new")] }));
  f.duringPut(() => f.repo.change((s) => ({ ...s, localProducts: [p("new", "请求期间新原稿")] })));
  assert.equal((await f.sync.push()).ok, true); assert.ok(f.repo.read().journalId);
  assert.equal(f.repo.read().desiredSnapshot.localProducts[0].model, "请求期间新原稿");
});
test("读取期间的编辑必须回读最新本机版本再合并", async () => {
  const f = fixture(); await f.sync.pull();
  f.duringRead(() => f.repo.change((s) => ({ ...s, selectedIds: [] })));
  await f.sync.pull(); assert.deepEqual(f.repo.read().desiredSnapshot.selectedIds, []); assert.ok(f.repo.read().journalId);
});
test("图片留本机，云端增量不带image，回读后仍可展示本机图片", async () => {
  const f = fixture(); await f.sync.pull();
  f.repo.change((s) => ({ ...s, localProducts: [{ ...p("photo"), image: "wxfile://device-only" }], selectedIds: ["photo"] }));
  assert.equal((await f.sync.push()).ok, true);
  assert.ok(!JSON.stringify(f.writes).includes("wxfile"));
  assert.equal(f.repo.read().desiredSnapshot.localProducts[0].image, "wxfile://device-only");
});
test("切换账号或草稿时不继续后续上传", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, localProducts: [p("new")], selectedIds: ["new"] }));
  f.duringPut(() => f.repo.activate("guest"));
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 1);
  assert.ok(f.repo.read("account-a").journalId);
});
test("云端字段格式异常不变成空数据", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, selectedIds: [] }));
  f.setRemote({ ...initial, selectedIds: null } as unknown as Snapshot);
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
});
test("没有改动时不会写云端", async () => {
  const f = fixture(); await f.sync.pull(); await f.sync.push(); assert.equal(f.writes.length, 0);
});
test("覆盖推荐排序稳定，推荐补入排第一，输入未改写", () => {
  const a = (status: ConcernCoverage["status"], concern: ConcernCoverage["concern"]): ConcernCoverage =>
    ({ status, concern, productIds: [], reason: "合成", candidateCount: 1 });
  const items = [a("已有覆盖", "干燥"), a("推荐补入", "敏感"), a("暂未覆盖", "色斑"), a("推荐补入", "泛红")];
  assert.deepEqual(sortCoverage(items).map((v) => v.concern), ["敏感", "泛红", "色斑", "干燥"]);
  assert.equal(items[0].status, "已有覆盖");
});
test("分析分两块；抵消仍标抵消，信息不足不能归为配合，完全重复项去重", () => {
  const item = { title: "合成条款", detail: "合成说明", productIds: ["a"] };
  const groups = groupAnalysis([{ ...item, type: "互相配合" }, { ...item, type: "互相克制" },
    { ...item, type: "互相抵消" }, { ...item, type: "信息不足" }, { ...item, type: "互相配合" }]);
  assert.equal(groups.caution.length, 2); assert.equal(groups.caution[1].type, "互相抵消");
  assert.equal(groups.cooperation.length, 1); assert.equal(groups.unknown.length, 1);
});
test("真实折叠组件默认不渲染解释正文", () => {
  const html = renderToStaticMarkup(<Disclosure title="互相配合" summary="1条"><span>默认隐藏的说明</span></Disclosure>);
  assert.ok(html.includes("查看说明")); assert.ok(!html.includes("默认隐藏的说明"));
});
test("SDK适配层失败分类保留，产品和profile读取均不伪装为空", async () => {
  const fixtureCloud = cloud as any;
  for (const kind of ["network", "permission-denied", "invalid-request", "not-found"]) {
    fixtureCloud.database.from = () => ({ select: () => ({
      order: async () => ({ data: null, error: { kind } }),
      maybeSingle: async () => ({ data: null, error: { kind } })
    }) });
    const result = await syncTransport.read("synthetic-owner");
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.kind, kind);
  }
});
test("SDK适配层账号不符时禁止读写", async () => {
  const fixtureCloud = cloud as any;
  fixtureCloud.database.from = () => assert.fail("unexpected database call");
  assert.equal((await syncTransport.read("other-owner")).ok, false);
  assert.equal((await syncTransport.putProducts("other-owner", [p("new")])).ok, false);
  assert.equal((await syncTransport.putProfile("other-owner", initial)).ok, false);
  assert.equal((await syncTransport.removeProduct("other-owner", "new")).ok, false);
});
test("真实PostgREST错误形状按HTTP状态及code分类，不依赖kind或文案", async () => {
  const fixtureCloud = cloud as any;
  for (const [status, code, expected] of [[403, "42501", "permission-denied"], [404, "", "not-found"],
    [400, "22P02", "invalid-request"], [503, "", "backend-unavailable"], [0, "", "network"]] as const) {
    fixtureCloud.database.from = () => ({ select: () => ({
      order: async () => ({ data: null, error: { code, message: "不用于分类" }, status }),
      maybeSingle: async () => ({ data: null, error: { code, message: "不用于分类" }, status })
    }) });
    const result = await syncTransport.read("synthetic-owner");
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.kind, expected);
  }
});
test("真实storage登录入口零写入，旧草稿只在手动导入后进入账号缓存", async () => {
  const fixtureCloud = cloud as any;
  let writeCount = 0;
  Taro.setStorageSync("beauty-products", [p("original-guest")]);
  Taro.setStorageSync("beauty-selected-ids", ["original-guest"]);
  fixtureCloud.database.from = (table: string) => ({
    select: () => ({ order: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: { selected_ids: ["cloud-only"], skin_concerns: ["敏感"] }, error: null }) }),
    upsert: () => { writeCount++; assert.fail(`unexpected ${table} write`); }
  });
  useGuestDraft(); assert.equal(getLocalProducts()[0].id, "original-guest");
  assert.equal((await signInAndSync()).ok, true);
  assert.deepEqual(getLocalProducts(), []); assert.equal(writeCount, 0);
  assert.equal((await importGuestDraft()).ok, true);
  assert.equal(getLocalProducts()[0].id, "original-guest"); assert.equal(writeCount, 0);
  useGuestDraft(); assert.equal(getLocalProducts()[0].id, "original-guest");
  assert.ok(Taro.getStorageSync("beauty-products"));
});
test("部分上传失败后重试不会丢原稿或重复创建产品", async () => {
  const f = fixture(); await f.sync.pull();
  f.repo.change((s) => ({ ...s, localProducts: [p("partial")], selectedIds: ["partial"] }));
  f.duringPut(() => f.failWrite(true)); assert.equal((await f.sync.push()).ok, false);
  assert.ok(f.repo.read().journalId); assert.equal(f.remote().localProducts.length, 1);
  f.failWrite(false); assert.equal((await f.sync.push()).ok, true);
  assert.equal(f.remote().localProducts.length, 1); assert.equal(f.repo.read().journalId, null);
});
test("并行同步单飞，不重复提交", async () => {
  const f = fixture(); await f.sync.pull(); f.repo.change((s) => ({ ...s, localProducts: [p("single")] }));
  let release!: (value: Outcome<Snapshot>) => void;
  const originalRead = f.transport.read;
  f.transport.read = () => new Promise((resolve) => { release = resolve; });
  const first = f.sync.push(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await f.sync.push()).ok, false); assert.equal(f.writes.length, 0);
  f.transport.read = originalRead; release({ ok: true, data: copy(initial) });
  assert.equal((await first).ok, true); assert.equal(f.writes.length, 1);
});
