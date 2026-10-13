import Taro from "@tarojs/taro";
import { processingHeaders, invalidateRejectedProcessingSession } from "./wxsession";

// 拍照识别成分：照片压缩后经同步云函数 /ocr 转发至腾讯云通用印刷体识别。
// 契约：POST { imageBase64 } → 200 { ok, text, itemCount } | 4xx/5xx { error }。
// 照片不做存储，识别即弃；识别失败时用户仍可手动粘贴成分表。

export const OCR_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/ocr";

export const parseOcrHttpResponse = (statusCode: number, data: unknown): string => {
  const payload = data && typeof data === "object" ? (data as { text?: unknown; error?: unknown }) : null;
  if (statusCode === 200 && payload && typeof payload.text === "string") return payload.text;
  if (statusCode === 429) throw new Error(payload && typeof payload.error === "string" ? payload.error : "识别次数已达上限，请稍后再试；仍可手动填写成分。");
  const fallback = "识别服务暂时不可用，请稍后再试。";
  throw new Error(payload && typeof payload.error === "string" ? payload.error : fallback);
};

export const recognizeIngredientImage = async (savedFilePath: string): Promise<string> => {
  let source = savedFilePath;
  try {
    const compressed = await Taro.compressImage({ src: savedFilePath, quality: 40 });
    if (compressed?.tempFilePath) source = compressed.tempFilePath;
  } catch {
    // 压缩不可用时用原图，由服务端做大小兜底。
  }
  const fileSystem = Taro.getFileSystemManager();
  const imageBase64 = fileSystem.readFileSync(source, "base64") as unknown as string;
  if (!imageBase64) throw new Error("图片读取失败，请重新选择");
  if (imageBase64.length > 4 * Math.ceil(5 * 1024 * 1024 / 3)) throw new Error("照片过大，请换一张更小的照片；参考照片已保留，仍可手动填写成分。");
  const header = await processingHeaders();
  const response = await Taro.request({
    url: OCR_ENDPOINT,
    method: "POST",
    timeout: 20000,
    header,
    data: { imageBase64 }
  });
  if (response.statusCode === 401) {
    invalidateRejectedProcessingSession(header.Authorization);
    throw new Error("微信身份已失效，请重试；草稿与照片已保留。");
  }
  return parseOcrHttpResponse(response.statusCode, response.data);
};

// 从整张包装的 OCR 原文里提取备案"产品名称"与品牌建议（2026-10-13）。
// 国产化妆品标签依规必须印"产品名称:"，是全文里最可靠的结构化锚点，取第一处；
// 品牌用调用方给定的品牌名做最长前缀匹配（内置目录派生），匹配不到就留空——品牌宁缺勿错，始终可手改。
export const extractLabelFields = (text: string, brands: string[]): { brand: string; model: string } => {
  const nameMatch = text.match(/产品名称\s*[:：]\s*([^\n]+)/);
  const model = nameMatch ? nameMatch[1].trim().slice(0, 40) : "";
  if (!model) return { brand: "", model: "" };
  const longest = [...brands].filter(Boolean).sort((a, b) => b.length - a.length)
    .find((brand) => model.startsWith(brand));
  return { brand: longest ?? "", model };
};
