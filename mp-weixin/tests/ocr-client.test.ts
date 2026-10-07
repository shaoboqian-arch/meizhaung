import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOcrHttpResponse } from "../src/shared/ocr";

test("OCR 响应解析：200 且有 text 时原样返回", () => {
  assert.equal(parseOcrHttpResponse(200, { ok: true, text: "Niacinamide\nCeramide NP", itemCount: 2 }), "Niacinamide\nCeramide NP");
  assert.equal(parseOcrHttpResponse(200, { ok: true, text: "", itemCount: 0 }), "");
});

test("OCR 响应解析：限流与错误文案不误导用户", () => {
  assert.throws(() => parseOcrHttpResponse(429, { error: "识别请求过于频繁，请稍后再试。" }), /过于频繁/);
  assert.throws(() => parseOcrHttpResponse(503, { error: "识别服务未配置，请先在云函数环境变量中配置 OCR 密钥。" }), /未配置/);
  assert.throws(() => parseOcrHttpResponse(502, {}), /暂时不可用/);
  assert.throws(() => parseOcrHttpResponse(500, "bad gateway text"), /暂时不可用/);
});
