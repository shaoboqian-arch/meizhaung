// 微信内容安全链路契约测试：只测纯逻辑（缓存、分类、请求构造），不连微信、不含密钥字面量。
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  OPENID_PATTERN,
  classifySecCheck,
  codeToSession,
  fetchStableToken,
  msgSecCheck,
  readCachedToken,
  resetTokenCache,
  resolveWxSecret
} = require("../cloudfunctions/meizhaung-sync/wxsec.js");

const jsonResponse = (data, ok = true, status = 200) => ({ ok, status, json: async () => data });
const SECRET = "unit-test-secret-unit-test-secret-01"; // 测试专用假值，非真实凭据

test("resolveWxSecret：缺失或过短返回 null，达标才放行", () => {
  assert.equal(resolveWxSecret({}), null);
  assert.equal(resolveWxSecret({ WECHAT_APPSECRET: "short" }), null);
  assert.equal(resolveWxSecret({ WECHAT_APPSECRET: SECRET }), SECRET);
});

test("OPENID_PATTERN：接受常规 openid 形态，拒绝过短与特殊字符", () => {
  assert.ok(OPENID_PATTERN.test("o" + "x".repeat(27)));
  assert.ok(OPENID_PATTERN.test("oABC-_1234567890abcdef123456"));
  assert.equal(OPENID_PATTERN.test("short"), false);
  assert.equal(OPENID_PATTERN.test("o".repeat(28) + ";drop"), false);
  assert.equal(OPENID_PATTERN.test(""), false);
});

test("stable_token：命中缓存不发请求；过期（含 5 分钟缓冲）后重取", async () => {
  resetTokenCache();
  const t0 = 1_000_000_000_000;
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse({ access_token: "TKN", expires_in: 7200 }); };

  const first = await fetchStableToken({ secret: SECRET, fetchImpl, now: t0 });
  assert.equal(first, "TKN");
  assert.equal(calls, 1);
  // 缓冲期内：直接用缓存
  assert.equal(await fetchStableToken({ secret: SECRET, fetchImpl, now: t0 + 600_000 }), "TKN");
  assert.equal(calls, 1);
  // expires_in-300 之后：必须重取
  assert.equal(await fetchStableToken({ secret: SECRET, fetchImpl, now: t0 + (7200 - 299) * 1000 }), "TKN");
  assert.equal(calls, 2);
  assert.equal(readCachedToken(t0 + (7200 - 299) * 1000), "TKN");
  resetTokenCache();
});

test("codeToSession：errcode 原样透传；成功只暴露 openid；请求带上 appid/secret/code", async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(String(url));
    if (seen.length === 1) return jsonResponse({ errcode: 40029, errmsg: "invalid code" });
    return jsonResponse({ openid: "o".repeat(28), session_key: "SK", unionid: "u1" });
  };

  const bad = await codeToSession({ code: "JSCODE", secret: SECRET, fetchImpl });
  assert.deepEqual(bad, { errcode: 40029, errmsg: "invalid code" });

  const good = await codeToSession({ code: "JSCODE2", secret: SECRET, fetchImpl });
  assert.deepEqual(good, { openid: "o".repeat(28) }, "session_key/unionid 不得出服务端");

  const url = new URL(seen[0]);
  assert.equal(url.origin + url.pathname, "https://api.weixin.qq.com/sns/jscode2session");
  assert.equal(url.searchParams.get("js_code"), "JSCODE");
  assert.equal(url.searchParams.get("grant_type"), "authorization_code");
  assert.ok(url.searchParams.get("secret").length >= 32);
});

test("msgSecCheck：v2 请求体带 scene/openid/content，content 超长截断", async () => {
  resetTokenCache();
  let captured = null;
  const fetchImpl = async (url, options) => {
    if (String(url).includes("stable_token")) return jsonResponse({ access_token: "TKN2", expires_in: 7200 });
    captured = { url: String(url), body: JSON.parse(options.body) };
    return jsonResponse({ errcode: 0, result: { suggest: "pass", label: 100 } });
  };
  const data = await msgSecCheck({ content: "x".repeat(300_000), openid: "o".repeat(28), secret: SECRET, fetchImpl });
  assert.equal(data.errcode, 0);
  assert.match(captured.url, /msg_sec_check\?access_token=TKN2$/);
  assert.equal(captured.body.version, 2);
  assert.equal(captured.body.scene, 2);
  assert.equal(captured.body.openid, "o".repeat(28));
  assert.equal(captured.body.content.length, 250_000);
  resetTokenCache();
});

test("classifySecCheck：裁决映射齐全", () => {
  assert.deepEqual(classifySecCheck({ errcode: 0, result: { suggest: "pass" } }).verdict, "pass");
  assert.deepEqual(classifySecCheck({ errcode: 0, result: { suggest: "review" } }).verdict, "pending", "review 疑似也放行");
  assert.equal(classifySecCheck({ errcode: 0, result: { suggest: "risky" } }).verdict, "risky");
  assert.match(classifySecCheck({ errcode: 0, result: { suggest: "risky" } }).message, /违规/);
  assert.equal(classifySecCheck({ errcode: 40003 }).verdict, "badOpenid");
  assert.equal(classifySecCheck({ errcode: 61010 }).verdict, "badOpenid");
  assert.equal(classifySecCheck({ errcode: 42001 }).verdict, "tokenExpired");
  assert.equal(classifySecCheck({ errcode: 45011 }).verdict, "rateLimited");
  assert.equal(classifySecCheck({ errcode: -1 }).verdict, "infra");
  assert.equal(classifySecCheck({ errcode: 99999 }).verdict, "infra");
});
