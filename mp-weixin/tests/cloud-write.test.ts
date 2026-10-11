import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { cloud, syncTransport } from "../src/shared/cloud";
import { PROCESSING_SESSION_KEY } from "../src/shared/wxsession";
import type { Product } from "@shared/types";

const product = (): Product => ({ id: "manual-1", brand: "合成品牌", model: "合成型号", category: "洁面", ingredientIds: ["synthetic-ingredient"], notes: "待校验备注" });
function fixture() {
  const sdk = cloud as any, from = sdk.database.from, session = sdk.auth.getSession, request = Taro.request;
  let owner = "synthetic-owner", reply: any = { statusCode: 200, data: { ok: true } };
  const writes: any[] = [], reviews: any[] = [];
  Taro.setStorageSync(PROCESSING_SESSION_KEY, { openid: "o".repeat(28), processingToken: "wxc_synthetic." + "a".repeat(64), expiresAt: Date.now() + 60_000 });
  sdk.auth.getSession = async () => ({ data: { user: { id: owner, isAnonymous: false } }, error: null });
  sdk.database.from = (table: string) => ({ upsert: async (rows: any) => { writes.push({ table, rows }); return { error: null, status: 200 }; } });
  Taro.request = (async (options: any) => { reviews.push(options); if (reply instanceof Error) throw reply; if (typeof reply === "function") return reply(); return reply; }) as never;
  return { writes, reviews, setOwner: (value: string) => { owner = value; }, setReply: (value: any) => { reply = value; }, close: () => { sdk.database.from = from; sdk.auth.getSession = session; Taro.request = request; } };
}

test("同步产品全部持久化文本一起校验，通过后才写固定内容", async () => {
  const f = fixture();
  try { const result = await syncTransport.putProducts("synthetic-owner", [product()]); assert.equal(result.ok, true); assert.equal(f.reviews.length, 1); assert.equal(f.reviews[0].data.content, 'manual-1\n合成品牌\n合成型号\n洁面\nsynthetic-ingredient\n待校验备注'); assert.equal(f.writes.length, 1); assert.equal(f.writes[0].rows[0].notes, "待校验备注"); }
  finally { f.close(); }
});

test('导入成分引用中的未审核文本不能绕过预检，超长引用零请求零写入',async()=>{
 const f=fixture(),p=product();p.ingredientIds=['未审核引用'];
 try {
  f.setReply({statusCode:400,data:{error:'内容违规'}});
  assert.equal((await syncTransport.putProducts('synthetic-owner',[p])).ok,false);assert.match(f.reviews[0].data.content,/未审核引用/);assert.equal(f.writes.length,0);
  p.ingredientIds=['甲'.repeat(8001)];
  assert.equal((await syncTransport.putProducts('synthetic-owner',[p])).ok,false);assert.equal(f.reviews.length,1);assert.equal(f.writes.length,0);
 }finally{f.close();}
});

test("审核待处理、旧故障放行、违规和网络故障均零云写入", async () => {
  const f = fixture();
  try { for (const reply of [{ statusCode: 200, data: { ok: true, pending: true } }, { statusCode: 200, data: { ok: true, unchecked: true } }, { statusCode: 503, data: {} }, { statusCode: 400, data: { error: "内容违规" } }, new Error("network down")]) { f.setReply(reply); const result = await syncTransport.putProducts("synthetic-owner", [product()]); assert.equal(result.ok, false); if (!result.ok) assert.match(result.kind, /^content-(pending|blocked)$/); } assert.equal(f.writes.length, 0); }
  finally { f.close(); }
});

test("校验等待期间改账号拒绝旧请求，原产品仍保留", async () => {
  const f = fixture(), p = product(), before = JSON.stringify(p);
  try { f.setReply(() => { f.setOwner("another-owner"); return { statusCode: 200, data: { ok: true } }; }); const result = await syncTransport.putProducts("synthetic-owner", [p]); assert.equal(result.ok, false); assert.equal(f.writes.length, 0); assert.equal(JSON.stringify(p), before); }
  finally { f.close(); }
});

test("外部对象在审核等待期间改变不会变成未经审核的提交", async () => {
  const f = fixture(), p = product();
  try { f.setReply(() => { p.brand = "未审核修改"; p.notes = "未审核备注"; p.ingredientIds.push("unreviewed"); return { statusCode: 200, data: { ok: true } }; }); assert.equal((await syncTransport.putProducts("synthetic-owner", [p])).ok, true); const row = f.writes[0].rows[0]; assert.equal(row.brand, "合成品牌"); assert.equal(row.notes, "待校验备注"); assert.deepEqual(row.ingredient_ids, ["synthetic-ingredient"]); }
  finally { f.close(); }
});

test("非法产品和空批次不发审核请求或云写入", async () => {
  const f = fixture();
  try { assert.equal((await syncTransport.putProducts("synthetic-owner", [])).ok, true); const p = product(); (p as any).brand = null; assert.equal((await syncTransport.putProducts("synthetic-owner", [p])).ok, false); assert.equal(f.reviews.length, 0); assert.equal(f.writes.length, 0); }
  finally { f.close(); }
});

test("批量导入逐项校验；后项待审时前项也不提前写入", async () => {
  const f = fixture(), first = { ...product(), notes: "甲".repeat(5000) }, second = { ...product(), id: "manual-2", notes: "乙".repeat(5000) };
  try {
    f.setReply(() => ({ statusCode: 200, data: f.reviews.length === 2 ? { ok: true, pending: true } : { ok: true } }));
    assert.equal((await syncTransport.putProducts("synthetic-owner", [first, second])).ok, false);
    assert.equal(f.reviews.length, 2); assert.equal(f.writes.length, 0);
    assert.ok(f.reviews.every((r) => r.data.content.length < 8000));
    f.setReply({ statusCode: 200, data: { ok: true } });
    assert.equal((await syncTransport.putProducts("synthetic-owner", [first, second])).ok, true);
    assert.equal(f.writes.length, 1); assert.equal(f.writes[0].rows.length, 2);
  } finally { f.close(); }
});
