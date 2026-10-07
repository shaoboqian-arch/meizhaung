// 微信身份 + 内容安全客户端契约：解析纯函数 + checkContentBeforeSave 阻断/放行矩阵。
// Taro 在测试运行器里被替换为 tests/mocks/taro.ts（内存存储 + 合成 login code）。
import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { ContentBlockedError, checkContentBeforeSave, parseSecCheckResponse, parseSessionResponse } from "../src/shared/wxsession";

test("session 解析：200 且有 openid 原样返回；错误透出服务端文案", () => {
  assert.equal(parseSessionResponse(200, { ok: true, openid: "o".repeat(28) }), "o".repeat(28));
  assert.throws(() => parseSessionResponse(400, { error: "微信登录已过期，请重试。" }), /已过期/);
  assert.throws(() => parseSessionResponse(503, { error: "微信登录服务未配置，请稍后再试。" }), /未配置/);
  assert.throws(() => parseSessionResponse(200, {}), /身份获取失败/);
  assert.throws(() => parseSessionResponse(200, { openid: "" }), /身份获取失败/);
});

test("sec-check 解析：200 放行；400 阻断并透出文案；其余状态一律放行", () => {
  assert.equal(parseSecCheckResponse(200, { ok: true }), "");
  assert.equal(parseSecCheckResponse(400, { error: "内容包含违规信息，请修改后再保存。" }), "内容包含违规信息，请修改后再保存。");
  assert.equal(parseSecCheckResponse(400, {}), "内容未通过安全校验，请修改后再保存。");
  assert.equal(parseSecCheckResponse(429, { error: "操作过于频繁，请稍后再试。" }), "", "限流放行，与故障放行约定一致");
  assert.equal(parseSecCheckResponse(502, null), "");
});

test("checkContentBeforeSave：空内容直接放行，不发请求", async () => {
  const requests: unknown[] = [];
  const original = Taro.request;
  Taro.request = (async (options: never) => { requests.push(options); return { statusCode: 200, data: { ok: true } }; }) as never;
  try {
    await checkContentBeforeSave(["", "  ", null, undefined]);
    assert.equal(requests.length, 0);
  } finally { Taro.request = original; }
});

test("checkContentBeforeSave：微信裁决违规时阻断并带文案；故障放行", async () => {
  const original = Taro.request;
  // 违规：/sec-check 返回 400 risky → 抛 ContentBlockedError（session 端点正常发 openid）
  Taro.request = (async (options: { url: string }) => {
    if (options.url.includes("/wechat/session")) return { statusCode: 200, data: { ok: true, openid: "o" + "x".repeat(27) } };
    return { statusCode: 400, data: { error: "内容包含违规信息，请修改后再保存。" } };
  }) as never;
  try {
    await checkContentBeforeSave(["违规产品"]).then(
      () => assert.fail("应当阻断"),
      (error) => { assert.ok(error instanceof Error); assert.match(error.message, /违规/); }
    );
  } finally { Taro.request = original; }
  // 网络异常 → 放行不抛
  Taro.request = (async () => { throw new Error("request:fail"); }) as never;
  try {
    await checkContentBeforeSave(["正常产品"]);
  } finally { Taro.request = original; }
  // 5xx → 放行
  Taro.request = (async () => ({ statusCode: 502, data: {} })) as never;
  try {
    await checkContentBeforeSave(["正常产品"]);
  } finally { Taro.request = original; }
});

test("checkContentBeforeSave：openid 缓存命中后请求带 X-WX-Openid 头", async () => {
  const original = Taro.request;
  const seen: Array<Record<string, unknown>> = [];
  Taro.request = (async (options: { url: string; header?: Record<string, string>; data?: unknown }) => {
    seen.push({ url: options.url, header: options.header ?? {}, data: options.data });
    if (options.url.includes("/wechat/session")) return { statusCode: 200, data: { ok: true, openid: "o" + "x".repeat(27) } };
    return { statusCode: 200, data: { ok: true } };
  }) as never;
  try {
    // 先清缓存（mock 的 storage 是内存 Map，写入一个已知键覆盖即可）
    Taro.setStorageSync("beauty.wx.openid.v1", "o" + "x".repeat(27));
    await checkContentBeforeSave(["品牌A", "型号B"]);
    assert.equal(seen.length, 1, "缓存命中时不得再调 /wechat/session");
    assert.match(seen[0].url as string, /\/sec-check$/);
    assert.equal((seen[0].header as Record<string, string>)["X-WX-Openid"], "o" + "x".repeat(27));
    assert.equal((seen[0].data as { content: string }).content, "品牌A\n型号B");
  } finally {
    Taro.request = original;
  }
});
