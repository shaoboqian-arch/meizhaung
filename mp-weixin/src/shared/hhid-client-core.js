// HHID WorkBuddy client v1. Canonical source; the beauty copy is generated and hash checked.
// No business data, owner claims, recovery codes or passwords are written to storage.
const RULE = 'hhid-workbuddy-v1'
const ENDPOINT = 'https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/beandex-sync/qsb/auth'
const UID = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
const TOKEN = /^qsb_[0-9a-f]{48}$/
const MESSAGES = {
  unavailable: '共用账号暂不可用，请稍后重试；本机记录保留',
  outdated: '共用账号服务待更新，输入和本机记录已保留',
  storage: 'HHID 登录状态保存或读取失败，请保留恢复码并重试',
  changed: '微信账号已变化，旧账号操作已停止',
  busy: '账号操作进行中，请稍候',
  unauthenticated: 'HHID 会话已失效，请输入 HHID 和口令重新连接',
  wechatUnauthenticated: '请先微信登录，再连接 HHID',
  explicitLoginRequired: '账号恢复后，请输入 HHID 和口令重新连接',
  badCredentials: 'HHID 或口令不正确',
  badPassword: '口令需为 8 到 64 位',
  badRecovery: 'HHID 或恢复码不正确',
  accountLocked: '失败次数过多，请 15 分钟后再试',
  bindingConflict: '当前微信或 HHID 已关联其他账号，已停止操作',
  openidAlreadyBound: '当前微信已关联 HHID，请使用原账号登录',
  recoveryUnavailable: '账号恢复暂未开放，输入和本机记录已保留'
}
function issue(code) { return Object.assign(new Error(MESSAGES[code] || MESSAGES.unavailable), { code }) }
function empty(value) { return value === '' || value === undefined || value === null }
function valid(session) {
  return session && typeof session === 'object' && !Array.isArray(session) && UID.test(session.uid) &&
    TOKEN.test(session.token) && typeof session.expiresAt === 'string' && Number.isFinite(Date.parse(session.expiresAt))
}
function createHhidClient({ appId, storage, request, getProviderProof, getProviderOwner, now = Date.now }) {
  if (!['xunji', 'meizhaung'].includes(appId)) throw issue('unavailable')
  let busy = false, epoch = 0
  // Pending server receipts survive a failed local save within this runtime. Recovery code never goes to disk.
  const pending = new Map()
  const key = owner => 'hhid.shared.session.v1:' + appId + ':' + encodeURIComponent(owner)
  const outKey = owner => key(owner) + ':signedOut'
  const assert = (owner, generation) => {
    if (generation !== epoch || getProviderOwner() !== owner) throw issue('changed')
  }
  function read(owner) {
    try {
      const value = storage.get(key(owner))
      if (empty(value)) return null
      if (!valid(value)) throw issue('storage')
      return { uid: value.uid, token: value.token, expiresAt: value.expiresAt }
    } catch { throw issue('storage') }
  }
  function signedOut(owner) {
    try {
      const value = storage.get(outKey(owner))
      if (empty(value) || value === false) return false
      if (value === true) return true
      throw issue('storage')
    } catch { throw issue('storage') }
  }
  function write(owner, generation, session) {
    if (!valid(session) || Date.parse(session.expiresAt) <= now()) throw issue('unavailable')
    assert(owner, generation); read(owner); signedOut(owner)
    try {
      storage.set(key(owner), { uid: session.uid, token: session.token, expiresAt: session.expiresAt })
      assert(owner, generation)
      const saved = read(owner)
      if (!saved || saved.uid !== session.uid || saved.token !== session.token || saved.expiresAt !== session.expiresAt) throw issue('storage')
      storage.set(outKey(owner), false)
      if (signedOut(owner)) throw issue('storage')
    } catch (error) { if (error.code === 'changed') throw error; throw issue('storage') }
  }
  function clear(owner, generation) {
    assert(owner, generation); read(owner); signedOut(owner)
    try {
      storage.set(outKey(owner), true)
      if (!signedOut(owner)) throw issue('storage')
      storage.remove(key(owner))
      if (read(owner)) throw issue('storage')
    } catch { throw issue('storage') }
    pending.delete(owner)
  }
  async function call(proof, generation, action, payload = {}) {
    assert(proof.owner, generation)
    let response
    try { response = await request({ url: ENDPOINT, method: 'POST', timeout: 20000,
      header: { 'content-type': 'application/json', 'x-workbuddy-token': proof.token },
      data: { ...payload, action, appId } }) }
    catch { assert(proof.owner, generation); throw issue('unavailable') }
    assert(proof.owner, generation)
    const result = response && response.data
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw issue('unavailable')
    if (result.error) throw issue(Object.prototype.hasOwnProperty.call(MESSAGES, result.error) ? result.error : 'unavailable')
    if (response.statusCode !== 200 || !['ok', 'unbound'].includes(result.status)) throw issue('unavailable')
    return result
  }
  function saveReceipt(proof, generation, receipt) {
    assert(proof.owner, generation)
    if (!valid(receipt)) throw issue('unavailable')
    if (receipt.recoveryCode !== undefined && !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/.test(receipt.recoveryCode)) throw issue('unavailable')
    pending.set(proof.owner, receipt)
    try { write(proof.owner, generation, receipt) }
    catch (error) {
      if (error.code !== 'storage') throw error
      return { phase: 'save-pending', uid: receipt.uid, recoveryCode: receipt.recoveryCode || '', message: error.message }
    }
    if (!receipt.recoveryCode) pending.delete(proof.owner)
    return { phase: 'connected', uid: receipt.uid, recoveryCode: receipt.recoveryCode || '', message: 'HHID 已连接；现有记录保留在原分区' }
  }
  async function operate(action, payload = {}) {
    if (busy) throw issue('busy')
    busy = true
    const generation = epoch
    try {
      const proof = await getProviderProof()
      if (!proof || typeof proof.owner !== 'string' || !proof.owner || typeof proof.token !== 'string' || !proof.token) throw issue('wechatUnauthenticated')
      assert(proof.owner, generation)
      // Read before the first server mutation. Unknown storage is never treated as empty.
      const stored = read(proof.owner), session = action === 'logout' ? pending.get(proof.owner) || stored : stored,
        explicitlyOut = signedOut(proof.owner)
      if (action === 'refresh' && pending.has(proof.owner)) return saveReceipt(proof, generation, pending.get(proof.owner))
      if (action === 'logout' && !session) { clear(proof.owner, generation); return { phase: 'unbound', message: '已断开 HHID；本机记录保留' } }
      if (action === 'refresh' && explicitlyOut) return { phase: 'unbound', message: '已断开 HHID，可输入原账号重新连接' }
      const ping = await call(proof, generation, 'ping')
      if (ping.workbuddyBridgeRule !== RULE) throw issue('outdated')
      if (action === 'recoverAccount' && ping.recoveryEnabled !== true) throw issue('recoveryUnavailable')
      if (action === 'refresh') {
        if (session) {
          try {
            const result = await call(proof, generation, 'whoami', { token: session.token })
            if (result.uid !== session.uid) throw issue('unavailable')
            return saveReceipt(proof, generation, { ...result, token: session.token })
          } catch (error) { if (error.code !== 'unauthenticated') throw error }
        }
        const result = await call(proof, generation, 'wechatLogin')
        if (result.status === 'unbound') return { phase: 'unbound', message: '尚未关联 HHID；有拼豆账号可直接连接' }
        return saveReceipt(proof, generation, result)
      }
      if (action === 'logout') {
        try { await call(proof, generation, 'logout', { token: session.token }) }
        catch (error) { if (error.code !== 'unauthenticated') throw error }
        // A confirmed expired/revoked HHID is also a valid local sign-out verdict.
        if ((pending.get(proof.owner) || read(proof.owner))?.token !== session.token) throw issue('changed')
        clear(proof.owner, generation)
        return { phase: 'unbound', message: '已断开 HHID；本机记录保留' }
      }
      if (pending.has(proof.owner)) return saveReceipt(proof, generation, pending.get(proof.owner))
      if (!['createAccount', 'loginWithPassword', 'recoverAccount'].includes(action)) throw issue('unavailable')
      const result = await call(proof, generation, action, payload)
      return saveReceipt(proof, generation, result)
    } finally { busy = false }
  }
  return {
    refresh: () => operate('refresh'),
    create: password => operate('createAccount', { password }),
    login: (uid, password) => operate('loginWithPassword', { uid: String(uid).trim().toUpperCase(), password }),
    recover: (uid, recoveryCode, newPassword) => operate('recoverAccount', { uid: String(uid).trim().toUpperCase(), recoveryCode, newPassword }),
    logout: () => operate('logout'),
    async credential() {
      // Internal data transport only. Never return this object to Page.setData or a React view.
      const generation=epoch,proof=await getProviderProof()
      assert(proof.owner,generation)
      const session=read(proof.owner)
      if(signedOut(proof.owner) || !session || Date.parse(session.expiresAt)<=now()) throw issue('unauthenticated')
      return {owner:proof.owner,uid:session.uid,token:session.token}
    },
    invalidate: () => { epoch++ },
    acknowledgeRecovery: () => { const owner = getProviderOwner(); pending.delete(owner) }
  }
}
module.exports = { createHhidClient, RULE, ENDPOINT }
