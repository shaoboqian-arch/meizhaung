import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { OCR_ENDPOINT, parseOcrHttpResponse, recognizeIngredientImage } from "../src/shared/ocr";

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

for (const mode of ["compressed", "compression-failed", "empty-image"] as const) {
  test(`OCR 图片链路：${mode}，只上传实际读取的图片`, async () => {
    const originals = {
      compressImage: Taro.compressImage,
      getFileSystemManager: Taro.getFileSystemManager,
      request: Taro.request
    };
    const readPaths: string[] = [];
    const requests: unknown[] = [];
    Object.assign(Taro, {
      compressImage: async (options: { src: string; quality: number }) => {
        assert.deepEqual(options, { src: "synthetic-original.jpg", quality: 40 });
        if (mode === "compression-failed") throw new Error("compression unavailable");
        return { tempFilePath: "synthetic-compressed.jpg", errMsg: "compressImage:ok" };
      },
      getFileSystemManager: () => ({ readFileSync: (path: string, encoding: string) => {
        assert.equal(encoding, "base64");
        readPaths.push(path);
        return mode === "empty-image" ? "" : "synthetic-base64";
      } }),
      request: async (options: unknown) => {
        requests.push(options);
        return { statusCode: 200, data: { ok: true, text: "烟酰胺" } };
      }
    });
    try {
      if (mode === "empty-image") {
        await assert.rejects(recognizeIngredientImage("synthetic-original.jpg"), /图片读取失败/);
        assert.equal(requests.length, 0);
      } else {
        assert.equal(await recognizeIngredientImage("synthetic-original.jpg"), "烟酰胺");
        assert.deepEqual(requests, [{
          url: OCR_ENDPOINT, method: "POST", timeout: 20000,
          header: { "Content-Type": "application/json" }, data: { imageBase64: "synthetic-base64" }
        }]);
      }
      assert.deepEqual(readPaths, [mode === "compression-failed" ? "synthetic-original.jpg" : "synthetic-compressed.jpg"]);
    } finally {
      Object.assign(Taro, originals);
    }
  });
}
