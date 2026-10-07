import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildOcrRequest, friendlyOcrError, normalizeOcrResponse, resolveOcrCredentials } = require("../cloudfunctions/meizhaung-sync/ocr.js");

// 凭证解析：显式优先，回退 SCF 注入凭证，都没有则 null。
assert.equal(resolveOcrCredentials({ OCR_SECRET_ID: "id", OCR_SECRET_KEY: "key" })?.source, "explicit");
const ambient = resolveOcrCredentials({ TENCENTCLOUD_SECRETID: "id", TENCENTCLOUD_SECRETKEY: "key", TENCENTCLOUD_TOKEN: "tok" });
assert.equal(ambient?.source, "ambient");
assert.equal(ambient?.token, "tok");
assert.equal(resolveOcrCredentials({}), null);

// TC3 请求构造：头齐全、确定性、时间戳参与签名。
const request = buildOcrRequest({ imageBase64: "aGVsbG8=", credentials: { secretId: "ID", secretKey: "KEY" }, timestamp: 1788600000 });
assert.equal(request.host, "ocr.tencentcloudapi.com");
assert.equal(request.headers["X-TC-Action"], "GeneralBasicOCR");
assert.equal(request.headers["X-TC-Timestamp"], "1788600000");
assert.match(request.headers.Authorization, /^TC3-HMAC-SHA256 Credential=ID\/2026-09-05\/ocr\/tc3_request/);
assert.ok(request.body.includes("ImageBase64"));
const repeat = buildOcrRequest({ imageBase64: "aGVsbG8=", credentials: { secretId: "ID", secretKey: "KEY" }, timestamp: 1788600000 });
assert.equal(request.headers.Authorization, repeat.headers.Authorization);
const shifted = buildOcrRequest({ imageBase64: "aGVsbG8=", credentials: { secretId: "ID", secretKey: "KEY" }, timestamp: 1788600060 });
assert.notEqual(request.headers.Authorization, shifted.headers.Authorization);

// 响应规整：正常文本按行拼接；错误码抛出。
const normalized = normalizeOcrResponse({ Response: { TextDetections: [{ DetectedText: "Niacinamide" }, { DetectedText: " Ceramide NP " }, {}], Language: "zh" } });
assert.equal(normalized.text, "Niacinamide\nCeramide NP");
assert.equal(normalized.itemCount, 2);
assert.equal(normalized.language, "zh");
assert.throws(() => normalizeOcrResponse({ Response: { Error: { Code: "LimitExceeded" } } }), /LimitExceeded/);
assert.throws(() => normalizeOcrResponse(null), /OCR_MALFORMED_RESPONSE/);

// 错误文案映射：已知码与未知码都有兜底。
assert.match(friendlyOcrError("OCR_CREDENTIALS_MISSING"), /未配置/);
assert.match(friendlyOcrError("FailedOperation_ImageNoText"), /没有识别到文字/);
assert.match(friendlyOcrError("AuthFailure_SignatureFailure"), /密钥/);
assert.match(friendlyOcrError("SomethingNew"), /稍后再试/);

console.log("OCR contract passed.");
