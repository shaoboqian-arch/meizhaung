// Candidate route issues receipts; the PostgreSQL RPC is the independent consumer.
// Signature verification alone is NOT replay protection or write authorization.
const crypto = require('crypto');
const { OPENID_PATTERN } = require('./wxsec');
const { RULE, APPLICATION_ID, ProductReviewError, authorizeProductReview, reviewProductRows, freezeProductRows } = require('./productReview');

const RECEIPT_RULE = 'beauty-product-receipt-v1';
const DATABASE = 'postgres-lgjvhh7s';
const ACTION = 'owned.products.upsert';
const TTL_MS = 120000;
const MAX_BYTES = 256 * 1024;
const REVIEW_DEADLINE_MS = 45000;
const PREFIX = RECEIPT_RULE + '|';
const reject = (code, status) => { throw new ProductReviewError(code, status); };
const validSecret = value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') >= 32;
const mac = (payload, secret) => crypto.createHmac('sha256', secret).update(PREFIX, 'utf8').update(payload, 'utf8').digest('hex');
function freezeVersions(versions, count) {
  if (!Array.isArray(versions) || versions.length !== count || !versions.every(v => Number.isSafeInteger(v) && v >= 0)) {
    reject('PRODUCT_VERSION_REQUIRED', 400);
  }
  return Object.freeze([...versions]);
}

// Only this entry point issues receipts. It performs both actual identity checks
// and the existing authoritative content review; it cannot accept caller proof.
async function reviewAndIssueProductReceipt({ rows, expectedVersions, platformToken, processingToken, publishableKey,
  secret, receiptSecret, fetchImpl = fetch, now = Date.now(), clock = Date.now }) {
  if (!validSecret(receiptSecret) || receiptSecret === secret) reject('RECEIPT_CONFIG_MISSING', 503);
  if (!Number.isSafeInteger(now) || now < 0) reject('RECEIPT_CLOCK_INVALID', 503);
  const fixedRows = freezeProductRows(rows);
  if (!fixedRows.length) reject('PRODUCT_PAYLOAD_INVALID', 400);
  const versions = freezeVersions(expectedVersions, fixedRows.length);
  const deadlineAt=now+REVIEW_DEADLINE_MS;
  const boundedFetch=async(url,options={})=>{
    const remaining=deadlineAt-clock();
    if(!Number.isSafeInteger(remaining)||remaining<=0||remaining>REVIEW_DEADLINE_MS) reject('CONTENT_REVIEW_PENDING',503);
    const signals=[AbortSignal.timeout(remaining)];if(options.signal)signals.push(options.signal);
    return fetchImpl(url,{...options,signal:AbortSignal.any(signals)});
  };
  // Reject the whole large batch before any identity/provider calls. Reserve
  // enough bytes for the fixed envelope fields added below.
  if (Buffer.byteLength(JSON.stringify({ rows: fixedRows, expectedVersions: versions }), 'utf8') > MAX_BYTES - 1024) {
    reject('PRODUCT_PAYLOAD_TOO_LARGE', 400);
  }
  const identity = await authorizeProductReview({ platformToken, processingToken, publishableKey, secret, fetchImpl:boundedFetch, now });
  const reviewed = await reviewProductRows({ identity, rows: fixedRows, secret, fetchImpl:boundedFetch, now, clock });
  const issuedAt = clock();
  if (!Number.isSafeInteger(issuedAt) || issuedAt < now) reject('RECEIPT_CLOCK_INVALID', 503);
  if (issuedAt >= identity.expiresAt) reject('WECHAT_SESSION_REQUIRED', 401);
  if (issuedAt >= deadlineAt) reject('CONTENT_REVIEW_PENDING',503);
  const payload = JSON.stringify({ v: 1, ruleVersion: RECEIPT_RULE, reviewRule: RULE,
    applicationId: APPLICATION_ID, database: DATABASE, action: ACTION, owner: reviewed.owner,
    nonce: crypto.randomBytes(16).toString('hex'), issuedAt, expiresAt: Math.min(issuedAt + TTL_MS, identity.expiresAt),
    rows: reviewed.rows, expectedVersions: versions });
  if (Buffer.byteLength(payload, 'utf8') > MAX_BYTES) reject('PRODUCT_PAYLOAD_TOO_LARGE', 400);
  return Object.freeze({ payload, signature: mac(payload, receiptSecret) });
}

// The future writer must supply owner from its independently verified session,
// then atomically consume nonce + compare versions + write + persist a receipt.
// This function has no database access and never consumes an operation.
function verifyProductReceipt({ receipt, receiptSecret, owner, now = Date.now() }) {
  if (!validSecret(receiptSecret) || typeof owner !== 'string' || !owner.startsWith('wx:') || !OPENID_PATTERN.test(owner.slice(3)) ||
      !Number.isSafeInteger(now) || now < 0 || !receipt || typeof receipt !== 'object' || Array.isArray(receipt) ||
      Object.keys(receipt).sort().join(',') !== 'payload,signature' || typeof receipt.payload !== 'string' ||
      Buffer.byteLength(receipt.payload, 'utf8') > MAX_BYTES || typeof receipt.signature !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.signature)) return null;
  const expected = Buffer.from(mac(receipt.payload, receiptSecret), 'hex');
  if (!crypto.timingSafeEqual(expected, Buffer.from(receipt.signature, 'hex'))) return null;
  try {
    const p = JSON.parse(receipt.payload);
    const fields = ['v','ruleVersion','reviewRule','applicationId','database','action','owner','nonce','issuedAt','expiresAt','rows','expectedVersions'];
    if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).sort().join(',') !== fields.sort().join(',') ||
        p.v !== 1 || p.ruleVersion !== RECEIPT_RULE || p.reviewRule !== RULE || p.applicationId !== APPLICATION_ID ||
        p.database !== DATABASE || p.action !== ACTION || p.owner !== owner || typeof p.nonce !== 'string' || !/^[0-9a-f]{32}$/.test(p.nonce) ||
        !Number.isSafeInteger(p.issuedAt) || p.issuedAt < 0 || p.issuedAt > now || !Number.isSafeInteger(p.expiresAt) ||
        p.expiresAt <= now || p.expiresAt <= p.issuedAt || p.expiresAt - p.issuedAt > TTL_MS) return null;
    const rows = freezeProductRows(p.rows);
    if (!rows.length) return null;
    const expectedVersions = freezeVersions(p.expectedVersions, rows.length);
    return Object.freeze({ ...p, rows, expectedVersions });
  } catch { return null; }
}

module.exports = { RECEIPT_RULE, DATABASE, ACTION, TTL_MS, MAX_BYTES, REVIEW_DEADLINE_MS, reviewAndIssueProductReceipt, verifyProductReceipt };
