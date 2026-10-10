const crypto = require("crypto");

// 腾讯云 OCR（通用印刷体识别）调用与响应规整。
// 凭证优先级：显式环境变量 OCR_SECRET_ID/OCR_SECRET_KEY →
// SCF 注入的角色临时凭证 TENCENTCLOUD_SECRETID/SECRETKEY/TOKEN。
// 未配置或无权限时由调用方返回明确的降级文案，不中断组合同步主链路。

const hashSha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hmacSha256 = (key, value) => crypto.createHmac("sha256", key).update(value).digest();

function resolveOcrCredentials(env = process.env) {
  const explicitId = env.OCR_SECRET_ID;
  const explicitKey = env.OCR_SECRET_KEY;
  if (explicitId && explicitKey) {
    return { secretId: explicitId, secretKey: explicitKey, token: undefined, source: "explicit" };
  }
  const ambientId = env.TENCENTCLOUD_SECRETID;
  const ambientKey = env.TENCENTCLOUD_SECRETKEY;
  if (ambientId && ambientKey) {
    return { secretId: ambientId, secretKey: ambientKey, token: env.TENCENTCLOUD_TOKEN, source: "ambient" };
  }
  return null;
}

function buildOcrRequest({ imageBase64, credentials, region = "ap-shanghai", timestamp = Math.floor(Date.now() / 1000) }) {
  if (!credentials) throw new Error("OCR_CREDENTIALS_MISSING");
  const host = "ocr.tencentcloudapi.com";
  const body = JSON.stringify({ ImageBase64: imageBase64 });
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashSha256(body)}`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/ocr/tc3_request\n${hashSha256(canonicalRequest)}`;
  const kDate = hmacSha256(`TC3${credentials.secretKey}`, date);
  const kService = hmacSha256(kDate, "ocr");
  const kSigning = hmacSha256(kService, "tc3_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-TC-Action": "GeneralBasicOCR",
    "X-TC-Version": "2018-11-19",
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Region": region,
    Authorization: `TC3-HMAC-SHA256 Credential=${credentials.secretId}/${date}/ocr/tc3_request, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
  if (credentials.token) headers["X-TC-Token"] = credentials.token;
  return { host, headers, body };
}

// 把 OCR 原始响应规整为 { text, itemCount, language }；错误形态规整为 Error(code)。
function normalizeOcrResponse(payload) {
  const response = payload && typeof payload === "object" ? payload.Response : undefined;
  if (!response) throw new Error("OCR_MALFORMED_RESPONSE");
  if (response.Error) {
    const error = new Error(response.Error.Code || "OCR_UNKNOWN_ERROR");
    error.ocrMessage = response.Error.Message;
    throw error;
  }
  const detections = Array.isArray(response.TextDetections) ? response.TextDetections : [];
  const lines = detections
    .map((item) => (item && typeof item.DetectedText === "string" ? item.DetectedText.trim() : ""))
    .filter(Boolean);
  return { text: lines.join("\n"), itemCount: lines.length, language: response.Language || "" };
}

// 面向用户的文案一律不暴露运维细节（密钥/权限/环境变量属服务端事务）；
// 凭证与权限类故障对用户表现统一为"服务暂不可用"，排障信息走服务端日志。
const FRIENDLY_ERRORS = {
  OCR_CREDENTIALS_MISSING: "识别服务暂时不可用，请稍后再试。",
  AuthFailure_SignatureFailure: "识别服务暂时不可用，请稍后再试。",
  AuthFailure_UnauthorizedOperation: "识别服务暂时不可用，请稍后再试。",
  UnauthorizedOperation: "识别服务暂时不可用，请稍后再试。",
  LimitExceeded: "识别调用超出限额，请稍后再试。",
  RequestSizeLimitExceeded: "图片过大，请压缩后重试。",
  FailedOperation_ImageNoText: "没有识别到文字，请换一张更清晰、正对成分表的图片。",
  FailedOperation_ImageDecodeFailed: "图片解析失败，请换一张清晰的原图重试。"
};

function friendlyOcrError(code) {
  if (!code) return "识别服务暂时不可用，请稍后再试。";
  if (FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
  if (code.startsWith("AuthFailure")) return "识别服务暂时不可用，请稍后再试。";
  if (code.startsWith("LimitExceeded")) return "识别调用超出限额，请稍后再试。";
  if (code.startsWith("FailedOperation")) return "识别失败，请换一张更清晰、正对成分表的图片。";
  return "识别服务暂时不可用，请稍后再试。";
}

async function callGeneralBasicOcr({ imageBase64, credentials, region = "ap-shanghai", timeoutMs = 8000 }) {
  const { host, headers, body } = buildOcrRequest({ imageBase64, credentials, region });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://${host}/`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    return normalizeOcrResponse(payload);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("OCR_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildOcrRequest,
  callGeneralBasicOcr,
  friendlyOcrError,
  normalizeOcrResponse,
  resolveOcrCredentials
};
