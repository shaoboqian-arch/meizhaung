// 仅授权本小程序的 OCR / 内容预检；不授权私人产品表或组合编辑。
const crypto = require('crypto');
const { MP_APPID, OPENID_PATTERN } = require('./wxsec');
const TTL_MS = 60 * 60 * 1000;
const sign = (payload, secret) => crypto.createHmac('sha256', secret).update('beauty-processing-v1|' + payload).digest('hex');
function issueProcessingIdentity(openid, secret, now = Date.now()) {
  if (!secret || !OPENID_PATTERN.test(openid || '')) throw new Error('Processing identity unavailable');
  const expiresAt = now + TTL_MS;
  const payload = Buffer.from(JSON.stringify({ v: 1, appId: MP_APPID, openid, issuedAt: now, expiresAt, nonce: crypto.randomBytes(16).toString('hex') })).toString('base64url');
  return { processingToken: 'wxc_' + payload + '.' + sign(payload, secret), expiresAt };
}
function verifyProcessingIdentity(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string' || token.length > 1024) return null;
  const match = /^wxc_([A-Za-z0-9_-]+)\.([0-9a-f]{64})$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1], secret), 'hex'), actual = Buffer.from(match[2], 'hex');
  if (!crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    if (value.v !== 1 || value.appId !== MP_APPID || !OPENID_PATTERN.test(value.openid || '') || !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt)
      || value.expiresAt <= now || value.issuedAt > now || value.expiresAt - value.issuedAt !== TTL_MS || !/^[0-9a-f]{32}$/.test(value.nonce || '')) return null;
    return { openid: value.openid, expiresAt: value.expiresAt };
  } catch { return null; }
}
module.exports = { issueProcessingIdentity, verifyProcessingIdentity, TTL_MS };
