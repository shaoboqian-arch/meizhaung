const crypto = require("crypto");
const express = require("express");
const cloudbase = require("@cloudbase/node-sdk");

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

function applyCors(request, response) {
  if (request.get("origin") === "https://shaoboqian-arch.github.io") {
    response.set("Access-Control-Allow-Origin", "https://shaoboqian-arch.github.io");
    response.set("Vary", "Origin");
  }
  response.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
  response.set("Cache-Control", "no-store");
}

server.use((request, response, next) => {
  applyCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();

  const clientKey = request.get("x-forwarded-for")?.split(",")[0]?.trim() || request.ip || "unknown";
  const now = Date.now();
  const window = requestWindows.get(clientKey);
  if (!window || now - window.startedAt > 60_000) {
    requestWindows.set(clientKey, { count: 1, startedAt: now });
  } else {
    window.count += 1;
    if (window.count > 120) return response.status(429).json({ error: "操作过于频繁，请稍后再试。" });
  }
  return next();
});
server.use(express.json({ limit: "512kb" }));

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

function serialize(document) {
  return {
    code: document._id,
    name: document.name,
    version: Number(document.version || 1),
    updatedAt: new Date(document.updatedAt).toISOString(),
    snapshot: sanitizeSnapshot(document.snapshot)
  };
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
    const document = {
      _id: code,
      name,
      version: 1,
      snapshot: sanitizeSnapshot(request.body?.snapshot),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await writeCombination(document);
    return response.status(201).json({ combination: serialize(document) });
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
    return response.json({ combination: serialize(document) });
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

    const baseVersion = Number(request.body?.baseVersion);
    if (!Number.isInteger(baseVersion) || baseVersion !== Number(current.version || 1)) {
      return response.status(409).json({ error: "组合已在另一台设备更新。", combination: serialize(current) });
    }

    const changes = {
      name: cleanText(request.body?.name, 20) || current.name,
      version: baseVersion + 1,
      snapshot: sanitizeSnapshot(request.body?.snapshot),
      updatedAt: new Date()
    };
    const updateResult = await combinations.where({ _id: code, version: baseVersion }).update(changes);
    if (Number(updateResult.updated) !== 1) {
      const latest = await findCombination(code);
      return response.status(409).json({ error: "组合已在另一台设备更新。", combination: serialize(latest) });
    }
    const next = { ...current, ...changes };
    return response.json({ combination: serialize(next) });
  } catch (error) {
    return response.status(500).json({ error: error.message || "保存组合失败。" });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 9000);
  server.listen(port, "0.0.0.0", () => console.log(`Meizhaung sync listening on ${port}`));
}

exports.main = server;
