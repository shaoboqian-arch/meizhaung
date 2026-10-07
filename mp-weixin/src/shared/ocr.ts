import Taro from "@tarojs/taro";

// 拍照识别成分：照片压缩后经同步云函数 /ocr 转发至腾讯云通用印刷体识别。
// 契约：POST { imageBase64 } → 200 { ok, text, itemCount } | 4xx/5xx { error }。
// 照片不做存储，识别即弃；识别失败时用户仍可手动粘贴成分表。

export const OCR_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/ocr";

export const parseOcrHttpResponse = (statusCode: number, data: unknown): string => {
  const payload = data && typeof data === "object" ? (data as { text?: unknown; error?: unknown }) : null;
  if (statusCode === 200 && payload && typeof payload.text === "string") return payload.text;
  if (statusCode === 429) throw new Error("识别请求过于频繁，请稍后再试。");
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
  const response = await Taro.request({
    url: OCR_ENDPOINT,
    method: "POST",
    timeout: 20000,
    header: { "Content-Type": "application/json" },
    data: { imageBase64 }
  });
  return parseOcrHttpResponse(response.statusCode, response.data);
};
