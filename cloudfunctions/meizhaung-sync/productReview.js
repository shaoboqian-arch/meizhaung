// Candidate only: no route imports this module until the private writer is accepted.
const { verifyProcessingIdentity } = require('./processingIdentity');
const { OPENID_PATTERN, msgSecCheck, classifySecCheck } = require('./wxsec');

const RULE = 'beauty-product-review-v1';
const APPLICATION_ID = 'wbapp_t1U4NdF6I0IZdm8LzoMLq6';
const USER_URL = 'https://mp-api.app.workbuddy.host/.cloud/auth/v1/user/me';
class ProductReviewError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}
const reject = (code, status) => { throw new ProductReviewError(code, status); };

// The platform verifies its bearer remotely. The processing token alone grants no write authority.
async function authorizeProductReview({ platformToken, processingToken, publishableKey, secret, fetchImpl = fetch, now = Date.now() }) {
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('wbpk_t1U4NdF6I0IZdm8LzoMLq6_')) reject('REVIEW_CONFIG_MISSING', 503);
  if (typeof platformToken !== 'string' || !platformToken || platformToken.length > 8192 || /\s/.test(platformToken)) reject('PLATFORM_SESSION_REQUIRED', 401);
  const processing = verifyProcessingIdentity(processingToken, secret, now);
  if (!processing) reject('WECHAT_SESSION_REQUIRED', 401);
  let response;
  try {
    response = await fetchImpl(USER_URL, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + platformToken, 'x-wb-webapp-access-key': publishableKey }
    });
  } catch { reject('PLATFORM_IDENTITY_UNAVAILABLE', 503); }
  if (response.status === 401 || response.status === 403) reject('PLATFORM_SESSION_REJECTED', 401);
  if (!response.ok) reject('PLATFORM_IDENTITY_UNAVAILABLE', 503);
  let raw;
  try { raw = await response.json(); } catch { reject('PLATFORM_IDENTITY_MALFORMED', 503); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) reject('PLATFORM_IDENTITY_MALFORMED', 503);
  // These are the raw wire fields parsed by the installed SDK's parseUser, not SDK result.user.id.
  if (raw.is_anonymous === true || raw.scope === 'anonymous') reject('PLATFORM_SESSION_REJECTED', 401);
  const owner = typeof raw.sub === 'string' ? raw.sub : typeof raw.uid === 'string' ? raw.uid : '';
  if (typeof raw.sub === 'string' && typeof raw.uid === 'string' && raw.sub !== raw.uid) reject('PLATFORM_IDENTITY_MALFORMED', 503);
  if (owner !== 'wx:' + processing.openid) reject('IDENTITY_MISMATCH', 403);
  return Object.freeze({ ruleVersion: RULE, applicationId: APPLICATION_ID, owner, openid: processing.openid, expiresAt: processing.expiresAt });
}

// Review exactly the projected, immutable text submitted to the future private writer.
// This function does not approve arbitrary image/product_json columns and never writes a table.
async function reviewProductRows({ identity, rows, secret, fetchImpl = fetch, now = Date.now(), clock = Date.now }) {
  if (!identity || identity.ruleVersion !== RULE || identity.applicationId !== APPLICATION_ID ||
      !OPENID_PATTERN.test(identity.openid || '') || identity.owner !== 'wx:' + identity.openid || identity.expiresAt <= now) reject('REVIEW_IDENTITY_REQUIRED', 401);
  const frozen = freezeProductRows(rows);
  // Validate the whole batch first; rejected later rows must not spend earlier review calls.
  for (const row of frozen) {
    const content = rowContent(row);
    let decision;
    try { decision = classifySecCheck(await msgSecCheck({ content, openid: identity.openid, secret, fetchImpl, now })); }
    catch { reject('CONTENT_REVIEW_UNAVAILABLE', 503); }
    if (decision.verdict !== 'pass') reject(decision.verdict === 'risky' ? 'CONTENT_REJECTED' : 'CONTENT_REVIEW_PENDING', decision.verdict === 'risky' ? 400 : 503);
    if (identity.expiresAt <= clock()) reject('WECHAT_SESSION_REQUIRED', 401);
  }
  return Object.freeze({ ruleVersion: RULE, owner: identity.owner, rows: frozen });
}

// A receipt issuer also freezes caller input before remote identity validation.
// Keep field projection and validation in this one implementation.
function freezeProductRows(rows) {
  if (!Array.isArray(rows) || rows.length > 50) reject('PRODUCT_PAYLOAD_INVALID', 400);
  const ids = new Set();
  const frozen = rows.map(row => {
    const fields = ['product_id', 'brand', 'model', 'category', 'ingredient_ids', 'notes'];
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).some(key => !fields.includes(key)) ||
        !['product_id', 'brand', 'model', 'category'].every(key => typeof row[key] === 'string') || !row.product_id ||
        !Array.isArray(row.ingredient_ids) || !row.ingredient_ids.every(id => typeof id === 'string') ||
        !(row.notes === undefined || row.notes === null || typeof row.notes === 'string') || ids.has(row.product_id)) reject('PRODUCT_PAYLOAD_INVALID', 400);
    ids.add(row.product_id);
    const fixed = { product_id: row.product_id, brand: row.brand, model: row.model, category: row.category,
      ingredient_ids: Object.freeze([...row.ingredient_ids]), notes: row.notes ?? null };
    if (Buffer.byteLength(JSON.stringify(fixed), 'utf8') > 32768 || rowContent(fixed).length > 8000) reject('PRODUCT_PAYLOAD_TOO_LARGE', 400);
    return Object.freeze(fixed);
  });
  return Object.freeze(frozen);
}

// Include all stored strings; forged category/reference ids must not become an unreviewed text channel.
function rowContent(row) {
  return [row.product_id, row.brand, row.model, row.category, ...row.ingredient_ids, row.notes || ''].join('\n');
}

module.exports = { RULE, APPLICATION_ID, USER_URL, ProductReviewError, authorizeProductReview, reviewProductRows, freezeProductRows };
