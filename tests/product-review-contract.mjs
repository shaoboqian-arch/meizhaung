import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { authorizeProductReview, reviewProductRows, USER_URL } = require('../cloudfunctions/meizhaung-sync/productReview.js');
const { issueProcessingIdentity } = require('../cloudfunctions/meizhaung-sync/processingIdentity.js');
const { resetTokenCache } = require('../cloudfunctions/meizhaung-sync/wxsec.js');
const secret = 'unit-test-product-review-secret-0001', openid = 'o' + 'x'.repeat(27), now = 1800000000000;
const parameters = () => ({ platformToken: 'test-platform-session', processingToken: issueProcessingIdentity(openid, secret, now).processingToken,
  publishableKey: 'wbpk_t1U4NdF6I0IZdm8LzoMLq6_test', secret, now });
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fail = code => error => error.code === code && !error.message.includes('test-platform-session');
const identity = () => authorizeProductReview({ ...parameters(), fetchImpl: async () => response({ sub: 'wx:' + openid }) });
const row = () => ({ product_id: 'local-one', brand: 'brand', model: 'model', category: '精华', ingredient_ids: ['niacinamide'], notes: 'note' });

test('remote identity uses the installed SDK wire endpoint, fixed application key and no redirect', async () => {
  let request;
  const id = await authorizeProductReview({ ...parameters(), fetchImpl: async (url, init) => { request = { url, init }; return response({ sub: 'wx:' + openid }); } });
  assert.equal(request.url, USER_URL); assert.equal(request.init.redirect, 'error');
  assert.equal(request.init.headers['x-wb-webapp-access-key'], parameters().publishableKey);
  assert.equal(request.init.headers.Authorization, 'Bearer test-platform-session');
  assert.equal(id.owner, 'wx:' + openid); assert.equal(Object.isFrozen(id), true);
  assert.equal(Object.values(id).includes(parameters().platformToken), false);
});
test('raw uid compatibility follows the installed SDK; conflicting raw identity fails closed', async () => {
  assert.equal((await authorizeProductReview({ ...parameters(), fetchImpl: async () => response({ uid: 'wx:' + openid }) })).owner, 'wx:' + openid);
  await assert.rejects(authorizeProductReview({ ...parameters(), fetchImpl: async () => response({ sub: 'wx:' + openid, uid: 'other' }) }), fail('PLATFORM_IDENTITY_MALFORMED'));
});
test('local SDK-shaped id, anonymous identity and different WeChat owner cannot authorize', async () => {
  for (const body of [{ id: 'wx:' + openid }, { sub: 'wx:' + openid, is_anonymous: true }, { sub: 'wx:' + openid, scope: 'anonymous' }, { sub: 'wx:' + 'y'.repeat(28) }]) {
    await assert.rejects(authorizeProductReview({ ...parameters(), fetchImpl: async () => response(body) }));
  }
});
test('unconfigured key, expired processing token and token without platform proof perform zero remote calls', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; throw Error('unexpected'); };
  for (const change of [{ publishableKey: 'wbpk_other_test' }, { platformToken: '' }, { platformToken: 'header\r\ninjection' }, { now: now + 3600001 }, { processingToken: 'forged' }]) {
    await assert.rejects(authorizeProductReview({ ...parameters(), ...change, fetchImpl }));
  }
  assert.equal(calls, 0);
});
test('revoked credentials differ from remote outage and malformed response; no retries', async () => {
  for (const status of [401, 403, 429, 500]) {
    let calls = 0;
    await assert.rejects(authorizeProductReview({ ...parameters(), fetchImpl: async () => { calls++; return response({}, status); } }), fail(status < 404 ? 'PLATFORM_SESSION_REJECTED' : 'PLATFORM_IDENTITY_UNAVAILABLE'));
    assert.equal(calls, 1);
  }
  await assert.rejects(authorizeProductReview({ ...parameters(), fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw Error('private wire body'); } }) }), fail('PLATFORM_IDENTITY_MALFORMED'));
});
test('all payload validation precedes remote review; owner and unreviewed extra columns rejected', async () => {
  const id = await identity(); let calls = 0;
  const fetchImpl = async () => { calls++; throw Error('unexpected'); };
  for (const invalid of [{ ...row(), owner_id: id.owner }, { ...row(), product_json: 'unreviewed' }, { ...row(), image: 'unreviewed' }, { ...row(), notes: 3 }]) {
    await assert.rejects(reviewProductRows({ identity: id, rows: [row(), invalid], secret, fetchImpl, now }));
  }
  await assert.rejects(reviewProductRows({ identity: id, rows: [row(), row()], secret, fetchImpl, now }));
  await assert.rejects(reviewProductRows({ identity: id, rows: [{ ...row(), notes: 'x'.repeat(8000) }], secret, fetchImpl, now }));
  assert.equal(calls, 0);
});
test('review freezes the exact input before asynchronous provider calls', async () => {
  resetTokenCache(); const id = await identity(), draft = row(), sent = [];
  const accepted = await reviewProductRows({ identity: id, rows: [draft], secret, now, fetchImpl: async (url, init) => {
    if (url.includes('stable_token')) { draft.notes = 'changed after review began'; draft.ingredient_ids.push('injected'); return response({ access_token: 'test-provider-token', expires_in: 7200 }); }
    sent.push(JSON.parse(init.body)); return response({ errcode: 0, result: { suggest: 'pass' } });
  } });
  assert.equal(sent[0].content, 'local-one\nbrand\nmodel\n精华\nniacinamide\nnote'); assert.equal(accepted.rows[0].notes, 'note');
  assert.deepEqual(accepted.rows[0].ingredient_ids, ['niacinamide']);
  assert.ok(Object.isFrozen(accepted.rows) && Object.isFrozen(accepted.rows[0].ingredient_ids)); resetTokenCache();
});
test('risky, pending, malformed and provider errors never yield a save candidate', async () => {
  const id = await identity();
  for (const body of [{ errcode: 0, result: { suggest: 'risky' } }, { errcode: 0, result: { suggest: 'review' } }, { errcode: 0 }, { errcode: 45011 }]) {
    resetTokenCache(); await assert.rejects(reviewProductRows({ identity: id, rows: [row()], secret, now, fetchImpl: async url => url.includes('stable_token') ? response({ access_token: 'test', expires_in: 7200 }) : response(body) }));
  }
  resetTokenCache(); await assert.rejects(reviewProductRows({ identity: id, rows: [row()], secret, now, fetchImpl: async () => { throw Error('private provider error'); } }), fail('CONTENT_REVIEW_UNAVAILABLE'));
});
test('expired or mismatched review identity cannot spend review calls', async () => {
  const id = await identity(); let calls = 0;
  for (const altered of [{ ...id, owner: 'wx:other' }, { ...id, expiresAt: now }, { ...id, applicationId: 'other' }]) {
    await assert.rejects(reviewProductRows({ identity: altered, rows: [row()], secret, now, fetchImpl: async () => { calls++; } }), fail('REVIEW_IDENTITY_REQUIRED'));
  }
  assert.equal(calls, 0);
});
test('identity expiring during review does not yield a save candidate', async () => {
  resetTokenCache(); const id = await identity();
  await assert.rejects(reviewProductRows({ identity: id, rows: [row()], secret, now, clock: () => id.expiresAt,
    fetchImpl: async url => url.includes('stable_token') ? response({ access_token: 'test', expires_in: 7200 }) : response({ errcode: 0, result: { suggest: 'pass' } }) }), fail('WECHAT_SESSION_REQUIRED'));
  resetTokenCache();
});
