import assert from "node:assert/strict";
import { test } from "node:test";
import Taro from "@tarojs/taro";
import { PROCESSING_SESSION_KEY } from "../src/shared/wxsession";
import { extractLabelFields, OCR_ENDPOINT, parseOcrHttpResponse, recognizeIngredientImage } from "../src/shared/ocr";

test("标签字段提取：产品名称锚点 + 品牌最长前缀，无锚点留空", () => {
  const tubeText = [
    "L'ORÉAL MEN EXPERT BRIGHT REVIVE",
    "欧莱雅男士耀白净油洗面奶",
    "成分: 水、甘油、烟酰胺",
    "产品名称:欧莱雅男士耀白净油洗面奶",
    "净含量:50ml"
  ].join("\n");
  assert.deepEqual(extractLabelFields(tubeText, ["欧莱雅", "欧莱雅男士", "兰蔻"]), { brand: "欧莱雅男士", model: "欧莱雅男士耀白净油洗面奶" });
  assert.deepEqual(extractLabelFields("产品名称：某品牌面霜", ["某品牌"]), { brand: "某品牌", model: "某品牌面霜" });
  assert.deepEqual(extractLabelFields("产品名称:目录外新品水", ["欧莱雅"]), { brand: "", model: "目录外新品水" });
  assert.deepEqual(extractLabelFields("没有锚点的包装文本", ["欧莱雅"]), { brand: "", model: "" });
});

test("OCR 响应解析：200 且有 text 时原样返回", () => {
  assert.equal(parseOcrHttpResponse(200, { ok: true, text: "Niacinamide\nCeramide NP", itemCount: 2 }), "Niacinamide\nCeramide NP");
  assert.equal(parseOcrHttpResponse(200, { ok: true, text: "", itemCount: 0 }), "");
});

test("OCR 响应解析：限流与错误文案不误导用户，运维细节不透出", () => {
  assert.throws(() => parseOcrHttpResponse(429, { error: "识别请求过于频繁，请稍后再试。" }), /过于频繁/);
  assert.throws(() => parseOcrHttpResponse(503, { error: "识别服务暂时不可用，请稍后再试。" }), /暂时不可用/);
  assert.throws(() => parseOcrHttpResponse(503, { error: "OCR 密钥无效，请检查环境变量中的密钥配置。" }), /请检查环境变量/); // 历史服务端返回的运维文案仍原样透出（客户端不加工），升级服务端后消失
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
    const token = "wxc_synthetic." + "a".repeat(64);
    Taro.setStorageSync(PROCESSING_SESSION_KEY, { openid: "o".repeat(28), processingToken: token, expiresAt: Date.now()+60_000 });
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
          header: { "Content-Type": "application/json", Authorization: "Bearer " + token }, data: { imageBase64: "synthetic-base64" }
        }]);
      }
      assert.deepEqual(readPaths, [mode === "compression-failed" ? "synthetic-original.jpg" : "synthetic-compressed.jpg"]);
    } finally {
      Object.assign(Taro, originals);
    }
  });
}


test('OCR quota exhaustion retains the specific server explanation',()=>{
 assert.throws(()=>parseOcrHttpResponse(429,{error:'今天的识别额度已用完，仍可手动填写成分。'}),/今天的识别额度/);
});
test('oversized local image never requests a processing identity or paid OCR',async()=>{
 const originals={compressImage:Taro.compressImage,getFileSystemManager:Taro.getFileSystemManager,request:Taro.request};let calls=0;
 Object.assign(Taro,{compressImage:async()=>({tempFilePath:'compressed'}),getFileSystemManager:()=>({readFileSync:()=> 'a'.repeat(7000000)}),request:async()=>{calls++;throw new Error('must not request');}});
 try{await assert.rejects(recognizeIngredientImage('original'),/照片过大.*保留/);assert.equal(calls,0);}finally{Object.assign(Taro,originals);}
});

test('OCR401清除被拒凭证且不自动重试，迟到401保留新凭证，限流保留有效身份',async()=>{
 const originals={compressImage:Taro.compressImage,getFileSystemManager:Taro.getFileSystemManager,request:Taro.request};
 const old={openid:'o'.repeat(28),processingToken:'wxc_old.'+'a'.repeat(64),expiresAt:Date.now()+60000};
 const next={...old,processingToken:'wxc_new.'+'b'.repeat(64)};
 Object.assign(Taro,{compressImage:async()=>({tempFilePath:'compressed'}),getFileSystemManager:()=>({readFileSync:()=> 'synthetic-base64'})});
 try {
  for(const mode of ['rejected','late','limited']) {
   Taro.setStorageSync(PROCESSING_SESSION_KEY,old);let calls=0;
   Taro.request=(async()=>{calls++;if(mode==='late')Taro.setStorageSync(PROCESSING_SESSION_KEY,next);return {statusCode:mode==='limited'?429:401,data:{error:'今天识别额度已用完'}};}) as never;
   await assert.rejects(recognizeIngredientImage('original'),mode==='limited'?/额度已用完/:/身份已失效.*照片已保留/);
   assert.equal(calls,1);assert.deepEqual(Taro.getStorageSync(PROCESSING_SESSION_KEY),mode==='rejected'?'':mode==='late'?next:old);
  }
 } finally {Object.assign(Taro,originals);}
});
