import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { createProductDraftStore } from "../src/shared/product-draft";
import { filterProducts, pageItems, detailUrl } from "../src/shared/product-view";
import { matchIngredients, matchIngredientIds, commitProductDraft, useGuestDraft, getLocalProducts, getSelectedIds, runUserSyncAction } from "../src/shared/storage";
import { products, ingredients } from "../../src/data/catalog";
import { createSyncActionRunner, type SyncActionPort } from "../src/shared/sync-actions";
import { buildSceneRecommendation, routineSlot, sceneExclusion, selectSceneAlternative } from "../src/shared/scene-recommendation";
import { buildUsagePlan } from "../../src/data/recommender";
import { getProductRecommendationRestriction, recommendationPolicyVersion } from "../src/shared/recommendation-policy";
import type { Product } from "../../src/types";
const memoryFixture = () => {
  const memory = new Map<string, unknown>();
  const port = { get: (k: string) => memory.has(k) ? memory.get(k) : "", set: (k: string, v: unknown) => memory.set(k, JSON.parse(JSON.stringify(v))) };
  return { memory, port, store: createProductDraftStore(port) };
};

const sample = (id: string) => products.find((p) => p.id === id)!;
const finalProducts = (result: ReturnType<typeof buildSceneRecommendation>, pool = products) =>
  (result.recommendation?.productIds ?? []).map((id) => pool.find((p) => p.id === id)!);
test("扩容目录结构：766产品222成分，ID唯一、引用存在、全量可分页", () => {
  assert.equal(products.length, 766); assert.equal(ingredients.length, 222);
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  assert.equal(new Set(ingredients.map((i) => i.id)).size, ingredients.length);
  const ids = new Set(ingredients.map((i) => i.id));
  assert.ok(products.every((p) => p.brand && p.model && p.ingredientIds.every((id) => ids.has(id))));
  assert.deepEqual(pageItems(products, Math.ceil(products.length / 24)), products);
});
test("用药信息门禁：保留目录及原选择，不补入、不换选，不生成虚假覆盖与用法", () => {
  const restricted = products.filter((p) => getProductRecommendationRestriction(p, ingredients));
  for (const id of ["dafuwen-adapalene-gel", "banzai-bp-cream", "benzac-ac"]) assert.ok(restricted.some((p) => p.id === id));
  const selected = [...restricted, sample("laroche-b5")]; const original = JSON.stringify(selected);
  for (const scene of ["morning", "evening"] as const) {
    for (const override of [{}, { 祛痘护理: "dafuwen-adapalene-gel" }, { 祛痘护理: "banzai-bp-cream" }]) {
      const r = buildSceneRecommendation(selected, products, ingredients, ["痘多"], scene, override);
      assert.ok(r.ruleVersion.includes(recommendationPolicyVersion));
      assert.ok(finalProducts(r).every((p) => !getProductRecommendationRestriction(p, ingredients)));
      for (const p of restricted) {
        assert.ok(!r.recommendation?.productIds.includes(p.id));
        assert.ok(!r.recommendation?.usagePlans[p.id]); assert.ok(!r.recommendation?.reasons[p.id]);
        assert.ok(r.recommendation?.concernCoverage.every((c) => !c.productIds.includes(p.id)));
        const a = r.alternatives.find((item) => item.product.id === p.id)!;
        assert.equal(a.canReplace, false); assert.match(a.reason, /用药信息/);
      }
      assert.ok(r.notices.some((n) => /用药信息待核对/.test(n)));
      const auto = buildSceneRecommendation([sample("laroche-b5")], products, ingredients, ["痘多"], scene);
      assert.ok(finalProducts(auto).every((p) => !getProductRecommendationRestriction(p, ingredients)));
    }
  }
  assert.equal(JSON.stringify(selected), original);
});
test("用药门禁统一解析ID、中英别名、导入备注，缺失元数据也不放开受限ID", () => {
  const base: Product = { id: "synthetic-medication", brand: "合成", model: "本机导入", category: "祛痘护理", ingredientIds: [] };
  for (const key of ["adapalene", "阿达帕林", "ADAPALENE", "达芙文", "benzoyl-peroxide", "BPO", "Benzoyl Peroxide", "过氧化苯甲酰"]) {
    const p = { ...base, ingredientIds: [key] };
    assert.match(sceneExclusion(p, "evening", ingredients, []), /不参与自动护肤推荐/);
    assert.equal(buildSceneRecommendation([p], [p], ingredients, [], "evening", { 祛痘护理: p.id }).recommendation, null);
  }
  assert.ok(getProductRecommendationRestriction({ ...base, ingredientIds: ["adapalene"] }, []));
  assert.ok(getProductRecommendationRestriction({ ...base, notes: "遵医嘱" }, ingredients));
  assert.equal(getProductRecommendationRestriction(sample("ordinary-retinol"), ingredients), "");
  assert.equal(getProductRecommendationRestriction(sample("laroche-b5"), ingredients), "");
  assert.equal(getProductRecommendationRestriction({ ...base, ingredientIds: ["NotAdapalene", "NotBPO"] }, ingredients), "");
});
test("场景独立：早间不排夜用活性，晚间不排防晒；使用时段与现有权威一致", () => {
  const selected = [sample("ordinary-retinol"), sample("paula-bha"), sample("elta-md"), sample("laroche-b5")];
  for (const scene of ["morning", "evening"] as const) {
    const r = buildSceneRecommendation(selected, products, ingredients, [], scene);
    assert.ok(r.recommendation);
    assert.ok(finalProducts(r).every((p) => !sceneExclusion(p, scene, ingredients, [])));
    assert.ok(finalProducts(r).every((p) => buildUsagePlan(p, ingredients, 0, false).timing.some((t) => scene === "morning" ? t.includes("早") : /晚|睡前/.test(t))));
    if (scene === "morning") assert.ok(!r.recommendation!.productIds.includes("ordinary-retinol") && !r.recommendation!.productIds.includes("paula-bha"));
    else assert.ok(!r.recommendation!.productIds.includes("elta-md"));
  }
});
test("所有补入阶段仍遵守同一步骤一款，乳液面霜及水喷雾不重复", () => {
  const selected = products.filter((p) => ["精华", "乳液", "面霜", "爽肤水", "喷雾", "防晒"].includes(p.category)).slice(0, 40);
  for (const scene of ["morning", "evening"] as const) {
    const r = buildSceneRecommendation(selected, products, ingredients, ["干燥", "色斑", "出油多", "毛孔粗"], scene);
    const slots = finalProducts(r).map(routineSlot);
    assert.equal(slots.length, new Set(slots).size);
    assert.ok((r.recommendation?.standaloneProductIds ?? []).every((id) => r.recommendation!.productIds.includes(id)));
    assert.ok((r.recommendation?.applyProductIds ?? []).every((id) => r.recommendation!.productIds.includes(id)));
  }
});
test("优先已有：已有适用洁面与面霜不被全库偏好ID替换", () => {
  const selected = [sample("freeplus-cleanser"), sample("cerave-cream"), sample("elta-md")];
  const r = buildSceneRecommendation(selected, products, ingredients, [], "morning");
  assert.ok(r.recommendation!.productIds.includes("freeplus-cleanser"));
  assert.ok(r.recommendation!.productIds.includes("cerave-cream"));
  assert.ok(!r.recommendation!.productIds.includes("cerave-cleanser"));
});
test("晚间酸类与A醇只保留一个分晚主力，不能靠补入重新叠加", () => {
  const selected = [sample("ordinary-retinol"), sample("ordinary-glycolic"), sample("cosrx-bha"), sample("laroche-b5")];
  const r = buildSceneRecommendation(selected, products, ingredients, ["黑头", "纹路"], "evening");
  const active = finalProducts(r).filter((p) => p.ingredientIds.some((id) => ingredients.find((i) => i.id === id)?.tags.some((t) => ["视黄醇", "酸类焕肤"].includes(t))));
  assert.equal(active.length, 1);
  assert.ok(r.alternatives.some((a) => /分晚/.test(a.reason)));
});
test("复合产品无法拆开酸类A醇，未知成分不宣称安全；解析别名一致", () => {
  const compound: Product = { id: "compound", brand: "合成", model: "复合", category: "精华", ingredientIds: ["Retinol", "水杨酸"] };
  assert.match(sceneExclusion(compound, "evening", ingredients, []), /无法按产品拆开/);
  const unknown: Product = { ...compound, id: "unknown", ingredientIds: ["Unlisted"] };
  const r = buildSceneRecommendation([unknown], [unknown], ingredients, [], "evening");
  assert.match(r.recommendation!.reasons.unknown, /信息不完整/);
});
test("不同品类的A醇精华和A醇面霜仍只选一个，显示时段只属于当前场景", () => {
  const r = buildSceneRecommendation([sample("ordinary-retinol"), sample("inbeauty-retinol"), sample("laroche-b5")], products, ingredients, [], "evening");
  assert.equal(finalProducts(r).filter((p) => p.ingredientIds.includes("retinol")).length, 1);
  assert.ok(Object.values(r.recommendation!.usagePlans).every((p) => p.timing.includes("晚间") && p.timing.every((t) => !t.includes("早"))));
});
test("备选替换只变场景结果，原始产品与ID保持原样", () => {
  const selected = [sample("vichy-89"), sample("olay-light"), sample("laroche-b5"), sample("elta-md")];
  const before = JSON.stringify(selected);
  const morning = buildSceneRecommendation(selected, products, ingredients, [], "morning");
  const serum = finalProducts(morning).find((p) => p.category === "精华")!;
  const other = selected.find((p) => p.category === "精华" && p.id !== serum.id)!;
  const replaced = buildSceneRecommendation(selected, products, ingredients, [], "morning", { 精华: other.id });
  assert.ok(replaced.recommendation!.productIds.includes(other.id));
  assert.ok(!replaced.recommendation!.productIds.includes(serum.id));
  assert.deepEqual(buildSceneRecommendation(selected, products, ingredients, [], "evening"), buildSceneRecommendation(selected, products, ingredients, [], "evening"));
  assert.equal(JSON.stringify(selected), before);
});
test("备选里的时段不符和皮肤注意项不提供强行换选入口", () => {
  const r = buildSceneRecommendation([sample("ordinary-retinol"), sample("elta-md")], products, ingredients, ["敏感"], "morning");
  const retinol = r.alternatives.find((a) => a.product.id === "ordinary-retinol")!;
  assert.equal(retinol.canReplace, false);
  assert.ok(!r.recommendation!.productIds.includes("ordinary-retinol"));
});
test("跨品类活性手动换选以最后一次为准，重选旧步骤也可改变优先级", () => {
  const retinol = sample("ordinary-retinol"), acid = sample("ordinary-glycolic"), cream = sample("laroche-b5");
  let choices = selectSceneAlternative({}, retinol);
  choices = selectSceneAlternative(choices, acid);
  let r = buildSceneRecommendation([retinol, acid, cream], products, ingredients, [], "evening", choices);
  assert.ok(r.recommendation!.productIds.includes(acid.id)); assert.ok(!r.recommendation!.productIds.includes(retinol.id));
  choices = selectSceneAlternative(choices, retinol);
  r = buildSceneRecommendation([retinol, acid, cream], products, ingredients, [], "evening", choices);
  assert.ok(r.recommendation!.productIds.includes(retinol.id)); assert.ok(!r.recommendation!.productIds.includes(acid.id));
});
test("覆盖、理由、步骤都从最终场景方案生成，不沿用被筛掉的原始产品", () => {
  const r = buildSceneRecommendation([sample("olay-light"), sample("vichy-89"), sample("elta-md")], products, ingredients, ["干燥", "色斑"], "morning");
  const ids = new Set(r.recommendation!.productIds);
  for (const c of r.recommendation!.concernCoverage) assert.ok(c.productIds.every((id) => ids.has(id)));
  assert.deepEqual(Object.keys(r.recommendation!.usagePlans).sort(), [...ids].sort());
  assert.deepEqual(Object.keys(r.recommendation!.reasons).sort(), [...ids].sort());
  assert.ok(r.alternatives.every((a) => !ids.has(a.product.id)));
});
test("没有适用选择时不伪造全库推荐；不同部位不当作同一步骤", () => {
  assert.equal(buildSceneRecommendation([], products, ingredients, [], "morning").recommendation, null);
  assert.equal(buildSceneRecommendation([sample("elta-md")], products, ingredients, [], "evening").recommendation, null);
  assert.notEqual(routineSlot(sample("cerave-cream")), routineSlot(sample("aveeno-body")));
});
test("产品跨分类搜索，分类只用于浏览，本机产品视图不漏入内置产品", () => {
  const sunscreen = products.find((p) => p.id === "elta-md")!;
  const hits = filterProducts(products, ingredients, { search: sunscreen.model, category: "精华", localOnly: false, localIds: [] });
  assert.ok(hits.some((p) => p.id === sunscreen.id));
  assert.equal(filterProducts(products, ingredients, { search: "", category: "精华", localOnly: true, localIds: [] }).length, 0);
  assert.ok(filterProducts(products, ingredients, { search: "", category: "精华", localOnly: false, localIds: [] }).every((p) => p.category === "精华"));
});
test("继续加载不会永久截断第25项及末项", () => {
  assert.equal(pageItems(products, 1).length, 24);
  assert.equal(pageItems(products, 2).length, 48);
  assert.deepEqual(pageItems(products, Math.ceil(products.length / 24)), products);
});
test("详情URL编码参数，不允许产品编号注入其他参数", () => {
  assert.equal(detailUrl("product", "id&scope=other"), "/pages/product-detail/index?id=id%26scope%3Dother");
});
test("添加草稿重建后保留文本、图片和稳定ID；账号之间隔离", () => {
  const f = memoryFixture(); const a = f.store.read("guest");
  f.store.save({ ...a, brand: "合成", model: "样本", ingredientText: "Niacinamide", image: "wxfile://local" }, "guest");
  const reboot = createProductDraftStore(f.port).read("guest");
  assert.equal(reboot.id, a.id); assert.equal(reboot.model, "样本"); assert.equal(reboot.image, "wxfile://local");
  assert.equal(f.store.read("account-b").model, "");
  assert.throws(() => f.store.save(reboot, "account-b"), /账号已变化/);
});
test("添加草稿读取损坏、权限或写满时不可当空草稿覆盖", () => {
  const f = memoryFixture(); f.memory.set("beauty-mp-product-form-v1:guest", { broken: true });
  assert.throws(() => f.store.read("guest"), /原稿保留/); assert.deepEqual(f.memory.get("beauty-mp-product-form-v1:guest"), { broken: true });
  assert.throws(() => createProductDraftStore({ get: () => { throw Error("permission"); }, set: () => assert.fail("no writes") }).read("guest"), /permission/);
  assert.throws(() => createProductDraftStore({ get: () => "", set: () => { throw Error("quota"); } }).read("guest"), /quota/);
});
test("中英混合、全角分隔与大小写匹配；未知片段及匹配依据保留", () => {
  const r = matchIngredients("成分：烟酰胺；RETINOL、Ceramide NP|Mystery Extract");
  assert.ok(r.matches.some((m) => m.ingredientName === "烟酰胺"));
  assert.ok(r.matches.some((m) => m.matchedAlias.toLowerCase() === "retinol"));
  assert.ok(r.matches.some((m) => m.basis === "英文/INCI 别名"));
  assert.deepEqual(r.unmatchedFragments, ["Mystery Extract"]);
  assert.deepEqual(matchIngredientIds("NotRetinol, NiacinamideLike"), []);
  assert.deepEqual(matchIngredientIds("假烟酰胺衍生物"), []);
});
test("全失败及空文本不会伪造成分", () => {
  assert.equal(matchIngredients("").matches.length, 0);
  assert.deepEqual(matchIngredients("Unlisted Test Compound").unmatchedFragments, ["Unlisted Test Compound"]);
});
test("表单重置写入失败后重试不会重复入库，已入库产品保留成分及选中", () => {
  useGuestDraft(); const f = memoryFixture(); const draft = { ...f.store.read("guest"), brand: "合成验收", model: "仅离线", ingredientText: "Niacinamide" };
  const originalSet = Taro.setStorageSync;
  Taro.setStorageSync = (key, value) => { if (key.startsWith("beauty-mp-product-form")) throw Error("quota"); originalSet(key, value); };
  try {
    assert.equal(commitProductDraft(draft).draftReset, false);
    assert.equal(commitProductDraft(draft).draftReset, false);
    assert.equal(getLocalProducts().filter((p) => p.id === draft.id).length, 1);
    assert.ok(getSelectedIds().includes(draft.id)); assert.ok(getLocalProducts().find((p) => p.id === draft.id)?.ingredientIds.length);
    assert.throws(() => commitProductDraft({ ...draft, model: "不同原稿" }), /内容不同/);
  } finally { Taro.setStorageSync = originalSet; }
});

const actionFixture = (scope = "guest", pending = true, overrides: Partial<SyncActionPort> = {}) => {
  let active = scope;
  const events: string[] = [];
  const port: SyncActionPort = {
    scope: () => active, guestHasChanges: () => pending,
    identity: async () => { events.push("identity"); return { ok: true, data: "owner" }; },
    loginAndRead: async () => { events.push("login-read"); active = "owner"; return { ok: true, message: "读取成功" }; },
    pull: async () => { events.push("read"); active = "owner"; return { ok: true, message: "读取成功" }; },
    push: async () => { events.push("save"); return { ok: true, message: "已保存并回读确认" }; },
    importGuest: async () => { events.push("import"); return { ok: true, message: "本机合并" }; },
    restoreScope: (value) => { events.push(`restore:${value}`); active = value; },
    confirmGuest: async (action) => { events.push(`confirm:${action}`); return true; },
    ...overrides
  };
  return { run: createSyncActionRunner(port), port, events, scope: () => active };
};
test("两个按钮：保存先确认本机归属、读取及合并，最后仅一次上传", async () => {
  const f = actionFixture(); assert.equal((await f.run("save")).ok, true);
  assert.deepEqual(f.events, ["identity", "confirm:save", "read", "import", "save"]);
});
test("两个按钮：读取只合并本机内容，绝不上传；无本机改动不弹确认", async () => {
  const f = actionFixture(); const result = await f.run("read");
  assert.equal(result.ok, true); assert.match(result.message, /尚未上传/);
  assert.deepEqual(f.events, ["identity", "confirm:read", "read", "import"]);
  const clean = actionFixture("guest", false); await clean.run("read");
  assert.deepEqual(clean.events, ["identity", "read"]);
});
test("两个按钮：只有未登录自动登录，登录读取之后再执行保存", async () => {
  const f = actionFixture("guest", false, { identity: async () => ({ ok: false, kind: "unauthenticated", message: "未登录" }) });
  assert.equal((await f.run("save")).ok, true); assert.deepEqual(f.events, ["login-read", "save"]);
});
test("两个按钮：取消归属确认，不登录不读取不上传", async () => {
  const f = actionFixture("guest", true, { confirmGuest: async () => false });
  assert.equal((await f.run("save")).ok, false); assert.deepEqual(f.events, ["identity"]);
  assert.equal(f.scope(), "guest");
});
test("两个按钮：权限、网络、参数及服务故障不可误触登录或上传", async () => {
  for (const kind of ["permission-denied", "network", "invalid-request", "backend-unavailable"]) {
    const f = actionFixture("guest", true, { identity: async () => ({ ok: false, kind, message: kind }) });
    assert.equal((await f.run("save")).ok, false); assert.deepEqual(f.events, []); assert.equal(f.scope(), "guest");
  }
});
test("两个按钮：读取、导入冲突或保存失败后回到原稿，禁止继续上传", async () => {
  for (const stage of ["pull", "importGuest", "push"] as const) {
    const f = actionFixture();
    f.port[stage] = async () => { if (stage === "pull") f.port.restoreScope("owner"); return { ok: false, message: "冲突或失败，原稿保留" }; };
    const result = await f.run("save"); assert.equal(result.ok, false); assert.equal(f.scope(), "guest");
    if (stage !== "push") assert.ok(!f.events.includes("save"));
  }
});
test("两个按钮：旧账号内容不上传给新账号，登录后变号也恢复原账号缓存", async () => {
  const old = actionFixture("previous-owner"); assert.equal((await old.run("save")).ok, false);
  assert.deepEqual(old.events, ["identity"]); assert.equal(old.scope(), "previous-owner");
  const expired = actionFixture("previous-owner", false, { identity: async () => ({ ok: false, kind: "unauthenticated", message: "到期" }) });
  assert.equal((await expired.run("save")).ok, false);
  assert.deepEqual(expired.events, ["login-read", "restore:previous-owner"]); assert.equal(expired.scope(), "previous-owner");
});
test("两个按钮：已有账号保存沿用现有上传门禁，无额外登录与草稿导入", async () => {
  const f = actionFixture("owner"); assert.equal((await f.run("save")).ok, true);
  assert.deepEqual(f.events, ["identity", "save"]);
});
test("两个按钮：确认期间连续点击只启动一条流程", async () => {
  let release!: (value: boolean) => void;
  const f = actionFixture("guest", true, { confirmGuest: () => new Promise((resolve) => { release = resolve; }) });
  const first = f.run("save"); await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await f.run("read")).ok, false); release(false); assert.equal((await first).ok, false);
  assert.deepEqual(f.events, ["identity"]);
});
test("真实storage两按钮闭环：读取零云写，保存回读后完成，游客原稿仍在", async () => {
  const { cloud } = await import("../src/shared/cloud");
  const fixtureCloud = cloud as any;
  const originalFrom = fixtureCloud.database.from;
  const rows: any[] = [];
  let profile: any = null; let writes = 0;
  fixtureCloud.database.from = (table: string) => ({
    select: () => ({ order: async () => ({ data: JSON.parse(JSON.stringify(rows)), error: null }),
      maybeSingle: async () => ({ data: profile && JSON.parse(JSON.stringify(profile)), error: null }) }),
    upsert: async (values: any) => {
      writes++;
      if (table === "user_profiles") profile = JSON.parse(JSON.stringify(values));
      else for (const row of values) {
        const index = rows.findIndex((existing) => existing.product_id === row.product_id);
        if (index < 0) rows.push({ ...row }); else rows[index] = { ...row };
      }
      return { error: null, status: 200 };
    }
  });
  try {
    useGuestDraft(); const guestProducts = getLocalProducts();
    const original = JSON.stringify(Taro.getStorageSync("beauty-mp-state-v1:guest"));
    assert.equal((await runUserSyncAction("read")).ok, true); assert.equal(writes, 0);
    assert.ok(guestProducts.every((p) => getLocalProducts().some((account) => account.id === p.id)));
    assert.equal((await runUserSyncAction("save")).ok, true); assert.ok(writes > 0);
    const state = Taro.getStorageSync("beauty-mp-state-v1:synthetic-owner");
    assert.equal(state.journalId, null);
    assert.equal(JSON.stringify(Taro.getStorageSync("beauty-mp-state-v1:guest")), original);
  } finally { fixtureCloud.database.from = originalFrom; useGuestDraft(); }
});
