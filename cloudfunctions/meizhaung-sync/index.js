const crypto = require("crypto");
const express = require("express");
const cloudbase = require("@cloudbase/node-sdk");
const {
  inspectEditAccess,
  issueEditAccess,
  publicAccess,
  revokeEditAccess,
  rotateEditAccess
} = require("./accessPolicy");
const { callGeneralBasicOcr, friendlyOcrError, resolveOcrCredentials } = require("./ocr");
const {
  OPENID_PATTERN,
  classifySecCheck,
  codeToSession,
  msgSecCheck,
  resetTokenCache,
  resolveWxSecret
} = require("./wxsec");

const COLLECTION = "meizhaung_user_combinations";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const MAX_LOCAL_PRODUCTS = 50;
const MAX_SELECTED_PRODUCTS = 120;
const ALLOWED_CONCERNS = new Set(["痘多", "干燥", "敏感", "泛红", "出油多", "毛孔粗", "黑头", "暗沉", "色斑", "屏障弱", "颈纹", "松弛", "纹路"]);
const ALLOWED_CATEGORIES = new Set(["卸妆水", "洁面", "爽肤水", "精华", "面霜", "面膜", "防晒", "眼霜", "乳液", "喷雾", "唇部护理", "身体乳", "颈部护理", "祛痘护理"]);
const app = cloudbase.init();
const database = app.database();
const combinations = database.collection(COLLECTION);
const server = express();
const requestWindows = new Map();
// CORS 分两层，按来源互斥、不会重复：
// - tcloudbaseapp.com 前端：由 CloudBase HTTP 访问层自动回显 Access-Control-Allow-Origin；
// - 其他自有前端（GitHub Pages）：访问层不回显，由下方白名单在函数内补头。
// 注意：把访问层已覆盖的域名加入白名单会产生重复头，浏览器将直接拒绝响应
//（2026-08-10 与 2026-08-30 两次实测确认）。
const ALLOWED_ORIGINS = new Set([
  "https://shaoboqian-arch.github.io"
]);

function applyCors(request, response) {
  const origin = request.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
  }
  response.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, X-Routine-Edit-Credential");
  response.set("Cache-Control", "no-store");
}

// 限流窗口按 IP 惰性记录；过期条目堆积只在这里回收，避免 Map 无限增长。
function pruneRateLimitWindows(now) {
  if (requestWindows.size < 500) return;
  for (const [key, window] of requestWindows) {
    if (now - window.startedAt > 60_000) requestWindows.delete(key);
  }
}

// OCR 消耗付费配额，单独限流（每 IP 每分钟 12 次），与通用限流分开计数。
const ocrWindows = new Map();
const OCR_RATE_LIMIT = 12;

function pruneOcrWindows(now) {
  if (ocrWindows.size < 500) return;
  for (const [key, window] of ocrWindows) {
    if (now - window.startedAt > 60_000) ocrWindows.delete(key);
  }
}

// /ocr 需要传图，单独挂 8MB 解析；组合同步接口维持 512kb 上限。
server.use((request, response, next) => {
  if (request.path === "/ocr") return next();
  return express.json({ limit: "512kb" })(request, response, next);
});

server.use((request, response, next) => {
  applyCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();

  const clientKey = request.get("x-forwarded-for")?.split(",")[0]?.trim() || request.ip || "unknown";
  const now = Date.now();
  pruneRateLimitWindows(now);
  const window = requestWindows.get(clientKey);
  if (!window || now - window.startedAt > 60_000) {
    requestWindows.set(clientKey, { count: 1, startedAt: now });
  } else {
    window.count += 1;
    if (window.count > 120) return response.status(429).json({ error: "操作过于频繁，请稍后再试。" });
  }
  return next();
});

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function uniqueStrings(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === "string").map((item) => item.slice(0, maxLength)))].slice(0, maxItems);
}

function sanitizeLocalProduct(product) {
  const category = cleanText(product?.category, 20);
  if (!product || !ALLOWED_CATEGORIES.has(category)) return null;
  const id = cleanText(product.id, 100);
  const brand = cleanText(product.brand, 60);
  const model = cleanText(product.model, 100);
  if (!id || !brand || !model) return null;
  return {
    id,
    brand,
    model,
    category,
    ingredientIds: uniqueStrings(product.ingredientIds, 80, 100),
    notes: cleanText(product.notes, 500)
  };
}

function sanitizeSnapshot(value) {
  const selectedIds = uniqueStrings(value?.selectedIds, MAX_SELECTED_PRODUCTS, 100);
  const skinConcerns = uniqueStrings(value?.skinConcerns, ALLOWED_CONCERNS.size, 20)
    .filter((item) => ALLOWED_CONCERNS.has(item));
  const localProducts = Array.isArray(value?.localProducts)
    ? value.localProducts.map(sanitizeLocalProduct).filter(Boolean).slice(0, MAX_LOCAL_PRODUCTS)
    : [];
  const knownIds = new Set(localProducts.map((product) => product.id));
  return {
    selectedIds: selectedIds.filter((id) => !id.startsWith("manual-") || knownIds.has(id)),
    skinConcerns,
    localProducts
  };
}

function readDocumentData(result) {
  return Array.isArray(result?.data) ? result.data[0] : result?.data;
}

function serialize(document, editCredential) {
  const access = inspectEditAccess(document, editCredential);
  return {
    code: document._id,
    name: document.name,
    version: Number(document.version || 1),
    updatedAt: new Date(document.updatedAt).toISOString(),
    snapshot: sanitizeSnapshot(document.snapshot),
    access: publicAccess(access)
  };
}

function readEditCredential(request) {
  const credential = request.get("x-routine-edit-credential");
  return typeof credential === "string" ? credential : "";
}

function denyEdit(response, inspection) {
  if (inspection.kind === "missing-credential" || inspection.kind === "invalid-credential") {
    return response.status(401).json({ error: "此设备没有有效编辑凭证，组合保持只读。" });
  }
  if (inspection.kind === "legacy-read-only") {
    return response.status(403).json({ error: "旧版 6 位同步码仅可读取；完成拥有者迁移前禁止写入。" });
  }
  if (inspection.kind === "expired") {
    return response.status(403).json({ error: "本机编辑凭证已过期，组合保持只读。" });
  }
  if (inspection.kind === "revoked") {
    return response.status(403).json({ error: "本机编辑凭证已撤销，组合保持只读。" });
  }
  return response.status(403).json({ error: "没有编辑权限。" });
}

function makeCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
}

async function findCombination(code) {
  return readDocumentData(await combinations.doc(code).get());
}

async function writeCombination(document) {
  const { _id, ...writableDocument } = document;
  await combinations.doc(_id).set(writableDocument);
}

async function createUniqueCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = makeCode();
    if (!await findCombination(code)) return code;
  }
  throw new Error("暂时无法生成同步码，请重试。");
}

server.get("/health", (_request, response) => {
  response.json({ ok: true, service: "meizhaung-routine-sync" });
});

server.post("/combinations", async (request, response) => {
  try {
    const name = cleanText(request.body?.name, 20);
    if (!name) return response.status(400).json({ error: "请输入组合名称。" });
    const code = await createUniqueCode();
    const issued = issueEditAccess();
    const document = {
      _id: code,
      name,
      version: 1,
      snapshot: sanitizeSnapshot(request.body?.snapshot),
      access: issued.access,
      accessAudit: [issued.auditEvent],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await writeCombination(document);
    return response.status(201).json({
      combination: serialize(document, issued.credential),
      editCredential: issued.credential
    });
  } catch (error) {
    return response.status(500).json({ error: error.message || "创建组合失败。" });
  }
});

server.get("/combinations/:code", async (request, response) => {
  try {
    const code = String(request.params.code || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return response.status(400).json({ error: "同步码格式不正确。" });
    const document = await findCombination(code);
    if (!document) return response.status(404).json({ error: "没有找到这个用户组合。" });
    return response.json({ combination: serialize(document, readEditCredential(request)) });
  } catch (error) {
    return response.status(500).json({ error: error.message || "读取组合失败。" });
  }
});

server.put("/combinations/:code", async (request, response) => {
  try {
    const code = String(request.params.code || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return response.status(400).json({ error: "同步码格式不正确。" });
    const current = await findCombination(code);
    if (!current) return response.status(404).json({ error: "没有找到这个用户组合。" });
    const credential = readEditCredential(request);
    const inspection = inspectEditAccess(current, credential);
    if (!inspection.canEdit) return denyEdit(response, inspection);

    const baseVersion = Number(request.body?.baseVersion);
    if (!Number.isInteger(baseVersion) || baseVersion !== Number(current.version || 1)) {
      return response.status(409).json({ error: "组合已在另一台设备更新。", combination: serialize(current, credential) });
    }

    const updatedAt = new Date();
    const changes = {
      name: cleanText(request.body?.name, 20) || current.name,
      version: baseVersion + 1,
      snapshot: sanitizeSnapshot(request.body?.snapshot),
      updatedAt
    };
    const updateResult = await combinations.where({ _id: code, version: baseVersion }).update(changes);
    if (Number(updateResult.updated) !== 1) {
      const latest = await findCombination(code);
      return response.status(409).json({ error: "组合已在另一台设备更新。", combination: serialize(latest, credential) });
    }
    const next = { ...current, ...changes };
    return response.json({ combination: serialize(next, credential) });
  } catch (error) {
    return response.status(500).json({ error: error.message || "保存组合失败。" });
  }
});

server.post("/combinations/:code/edit-credential/rotate", async (request, response) => {
  try {
    const code = String(request.params.code || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return response.status(400).json({ error: "同步码格式不正确。" });
    const current = await findCombination(code);
    if (!current) return response.status(404).json({ error: "没有找到这个用户组合。" });
    const credential = readEditCredential(request);
    const inspection = inspectEditAccess(current, credential);
    if (!inspection.canEdit) return denyEdit(response, inspection);

    const rotated = rotateEditAccess(current);
    await combinations.doc(code).update({
      access: rotated.access,
      accessAudit: rotated.accessAudit,
      updatedAt: new Date()
    });
    const next = { ...current, access: rotated.access, accessAudit: rotated.accessAudit, updatedAt: new Date() };
    return response.json({
      combination: serialize(next, rotated.credential),
      editCredential: rotated.credential
    });
  } catch (error) {
    return response.status(500).json({ error: error.message || "更新编辑凭证失败。" });
  }
});

server.delete("/combinations/:code/edit-credential", async (request, response) => {
  try {
    const code = String(request.params.code || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return response.status(400).json({ error: "同步码格式不正确。" });
    const current = await findCombination(code);
    if (!current) return response.status(404).json({ error: "没有找到这个用户组合。" });
    const inspection = inspectEditAccess(current, readEditCredential(request));
    if (!inspection.canEdit) return denyEdit(response, inspection);

    const revoked = revokeEditAccess(current);
    await combinations.doc(code).update({
      access: revoked.access,
      accessAudit: revoked.accessAudit,
      updatedAt: new Date()
    });
    return response.status(204).end();
  } catch (error) {
    return response.status(500).json({ error: error.message || "撤销编辑凭证失败。" });
  }
});

server.post("/ocr", express.json({ limit: "8mb" }), async (request, response) => {
  try {
    const clientKey = request.get("x-forwarded-for")?.split(",")[0]?.trim() || request.ip || "unknown";
    const now = Date.now();
    pruneOcrWindows(now);
    const window = ocrWindows.get(clientKey);
    if (!window || now - window.startedAt > 60_000) {
      ocrWindows.set(clientKey, { count: 1, startedAt: now });
    } else {
      window.count += 1;
      if (window.count > OCR_RATE_LIMIT) return response.status(429).json({ error: "识别请求过于频繁，请稍后再试。" });
    }

    const imageBase64 = request.body?.imageBase64;
    if (typeof imageBase64 !== "string" || imageBase64.length < 64) {
      return response.status(400).json({ error: "请上传图片后重试。" });
    }
    if (imageBase64.length > 7_000_000) {
      return response.status(413).json({ error: "图片过大，请压缩后重试。" });
    }

    const credentials = resolveOcrCredentials();
    if (!credentials) {
      return response.status(503).json({ error: friendlyOcrError("OCR_CREDENTIALS_MISSING") });
    }
    const result = await callGeneralBasicOcr({ imageBase64, credentials });
    return response.json({ ok: true, text: result.text, itemCount: result.itemCount });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "OCR_TIMEOUT") return response.status(504).json({ error: "识别超时，请稍后再试。" });
    if (code === "FailedOperation_ImageNoText") {
      return response.json({ ok: true, text: "", itemCount: 0 });
    }
    if (code.startsWith("LimitExceeded")) return response.status(429).json({ error: friendlyOcrError(code) });
    if (code.startsWith("AuthFailure") || code === "UnauthorizedOperation" || code === "OCR_CREDENTIALS_MISSING") {
      return response.status(503).json({ error: friendlyOcrError(code) });
    }
    if (code.startsWith("FailedOperation") || code === "OCR_MALFORMED_RESPONSE") {
      return response.status(502).json({ error: friendlyOcrError(code) });
    }
    return response.status(500).json({ error: "识别服务暂时不可用，请稍后再试。" });
  }
});

// —— 微信内容安全（msgSecCheck）链路，供小程序保存手输内容前调用 ——
// POST /wechat/session：wx.login 的 code 换 openid（session_key 只留在服务端内存，不回传）。
// POST /sec-check：{content} + X-WX-Openid 头 → 微信审核裁决。
//   * 裁决为 risky / badOpenid → 400 拒绝；rateLimited → 429；
//   * 审核基础设施故障（微信侧 5xx、token 异常）→ 放行并记日志（个人工具向应用，
//     审核通道故障不应冻结全部保存；risky 裁决始终拦截，合规底线不破）。
//   * Web 端无微信身份，不走这两个端点（微信审核只辖小程序内 UGC）。
const SEC_CHECK_MAX_CONTENT = 8000;

server.post("/wechat/session", async (request, response) => {
  try {
    const code = typeof request.body?.code === "string" ? request.body.code.trim() : "";
    if (!code) return response.status(400).json({ error: "缺少微信登录凭证。" });
    const secret = resolveWxSecret();
    if (!secret) return response.status(503).json({ error: "微信登录服务未配置，请稍后再试。" });
    const session = await codeToSession({ code, secret });
    if (session.errcode) {
      // 40029=code 无效/已用；不区分细分原因，客户端统一引导重试。
      return response.status(400).json({ error: "微信登录已过期，请重试。", errcode: session.errcode });
    }
    return response.json({ ok: true, openid: session.openid });
  } catch (error) {
    console.log("[WxSession] error", error instanceof Error ? error.message : "unknown");
    return response.status(502).json({ error: "微信登录服务暂时不可用，请稍后再试。" });
  }
});

server.post("/sec-check", async (request, response) => {
  try {
    const content = typeof request.body?.content === "string" ? request.body.content.trim() : "";
    if (!content) return response.status(400).json({ error: "没有需要审核的内容。" });
    if (content.length > SEC_CHECK_MAX_CONTENT) return response.status(400).json({ error: "内容过长，请精简后再保存。" });
    const openid = request.get("x-wx-openid") || "";
    if (!OPENID_PATTERN.test(openid)) return response.status(400).json({ error: "微信身份已失效，请退出小程序重新进入后再试。" });
    const secret = resolveWxSecret();
    if (!secret) return response.status(503).json({ error: "内容审核服务未配置，请稍后再试。" });

    let data = await msgSecCheck({ content, openid, secret });
    let verdict = classifySecCheck(data);
    if (verdict.verdict === "tokenExpired") {
      resetTokenCache();
      data = await msgSecCheck({ content, openid, secret });
      verdict = classifySecCheck(data);
    }
    if (verdict.verdict === "pass") return response.json({ ok: true });
    if (verdict.verdict === "risky" || verdict.verdict === "badOpenid") return response.status(400).json({ error: verdict.message });
    if (verdict.verdict === "rateLimited") return response.status(429).json({ error: verdict.message });
    console.log("[SecCheck] infra fallback errcode=", Number(data?.errcode ?? -1));
    return response.json({ ok: true, unchecked: true });
  } catch (error) {
    console.log("[SecCheck] error", error instanceof Error ? error.message : "unknown");
    return response.json({ ok: true, unchecked: true });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 9000);
  server.listen(port, "0.0.0.0", () => console.log(`Meizhaung sync listening on ${port}`));
}

exports.main = server;
