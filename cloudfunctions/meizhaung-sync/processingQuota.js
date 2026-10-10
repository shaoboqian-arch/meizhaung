// 唯一规则源：beandex-sync/processingQuota.js；美妆同名部署副本须按哈希生成。
// 计数在调用供应商之前提交，失败或响应未知不退款，禁止自动重试扩大费用。
const crypto = require('crypto');
const RULE_VERSION = 'processing-budget-v1';
const COLLECTION = 'miniapp_processing_budget';
const DAY = 86400000, OFFSET = 8 * 3600000;
const SETTINGS = {
  matting: { prefix: 'MATTING', burstMs: 3600000, burstLimit: 30, userDailyLimit: 30 },
  ocr: { prefix: 'OCR', burstMs: 60000, burstLimit: 12, userDailyLimit: 60 },
};
function fail(code, statusCode, message, retryAfter = 0) {
  return Object.assign(new Error(message), { code, statusCode, retryAfter });
}
function resolvePolicy(operation, env = process.env) {
  const spec = SETTINGS[operation];
  if (!spec || env.PROCESSING_BUDGET_RULE !== RULE_VERSION) return null;
  const integer = value => typeof value === 'string' && /^[1-9][0-9]{0,7}$/.test(value) && Number(value) <= 10000000 ? Number(value) : null;
  const projectDailyLimit = integer(env[spec.prefix + '_PROJECT_DAILY_LIMIT']);
  const projectMonthlyLimit = integer(env[spec.prefix + '_PROJECT_MONTHLY_LIMIT']);
  return projectDailyLimit && projectMonthlyLimit ? { ...spec, operation, projectDailyLimit, projectMonthlyLimit } : null;
}
function isMissing(error) {
  const text = String(error?.message || error?.errMsg || error);
  if (/collection|集合|permission|权限/i.test(text)) return false;
  return error?.code === 'DOCUMENT_NOT_FOUND' || /document.*(?:not found|not exist)|(?:文档|记录).*不存在/i.test(text);
}
async function readDoc(collection, id) {
  let response;
  try { response = await collection.doc(id).get(); }
  catch (error) { if (isMissing(error)) return null; throw error; }
  if(response?.error || (response?.code !== undefined && response.code !== null && ![0,'0','SUCCESS'].includes(response.code)))throw fail('processingReadFailed',503,'处理配额读取失败，原稿已保留。');
  if (!response || !Object.prototype.hasOwnProperty.call(response, 'data')) throw fail('processingReadUnknown', 503, '处理配额暂不可读取，原稿已保留。');
  if(Array.isArray(response.data) && response.data.length>1)throw fail('processingReadUnknown',503,'处理配额状态不唯一，原稿已保留。');
  if(response.data===null || (Array.isArray(response.data) && response.data.length===0))return null;
  const value = Array.isArray(response.data) ? response.data[0] : response.data;
  if(value===undefined)throw fail('processingReadUnknown',503,'处理配额读取结果未确认，原稿已保留。');
  if (typeof value !== 'object' || Array.isArray(value)) throw fail('processingReadUnknown', 503, '处理配额暂不可读取，原稿已保留。');
  if(value._id !== undefined && value._id !== id)throw fail('processingReadUnknown',503,'处理配额归属无法确认，原稿已保留。');
  const {_id,...record}=value;return record;
}
async function writeAndRead(collection,id,payload) {
  const response=await collection.doc(id).set(payload);
  if(response?.error || (response?.code !== undefined && response.code !== null && ![0,'0','SUCCESS'].includes(response.code)))throw fail('processingWriteFailed',503,'处理配额保存失败，原稿已保留。');
  const read=await readDoc(collection,id);
  if(!read || Object.keys(read).length!==Object.keys(payload).length || Object.keys(payload).some(key=>read[key]!==payload[key]))throw fail('processingWriteUnknown',503,'处理配额保存未确认，原稿已保留。');
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function periods(now, burstMs) {
  const date = new Date(now + OFFSET).toISOString();
  const day = date.slice(0,10), month = date.slice(0,7), burstBucket = Math.floor(now/burstMs);
  const nextDay = Date.parse(day+'T00:00:00.000Z')-OFFSET+DAY;
  const [year, m] = month.split('-').map(Number);
  const nextMonth = Date.UTC(year,m,1)-OFFSET;
  return { day, month, burstBucket, nextDay, nextMonth };
}
const countValid = x => Number.isSafeInteger(x) && x >= 0;
function requireRecord(condition) {
  if (!condition) throw fail('processingLedgerInvalid',503,'处理配额状态异常，原稿已保留，请稍后重试。');
}
async function reserveQuota({ database, operation, authorize, policy = resolvePolicy(operation), now = Date.now() }) {
  if (!policy || policy.operation !== operation || !SETTINGS[operation] || typeof database?.runTransaction !== 'function' || typeof authorize !== 'function') {
    throw fail('processingBudgetNotConfigured',503,'处理额度暂未配置，原稿已保留。');
  }
  for (const key of ['burstMs','burstLimit','userDailyLimit','projectDailyLimit','projectMonthlyLimit']) requireRecord(Number.isSafeInteger(policy[key]) && policy[key] > 0 && policy[key] <= (key === 'burstMs' ? DAY : 10000000));
  requireRecord(Number.isSafeInteger(now) && now >= 0);
  const time = periods(now,policy.burstMs);
  try {
  const result = await database.runTransaction(async transaction => {
    const principal = await authorize(transaction, now);
    if (typeof principal !== 'string' || !principal || principal.length > 180) throw fail('processingUnauthenticated',401,'请先登录后再处理，原稿已保留。');
    const userHash = hash(operation+'|'+principal);
    const projectId = hash('project|'+operation+'|'+time.month);
    const userId = hash('user|'+operation+'|'+userHash+'|'+time.day);
    const collection = transaction.collection(COLLECTION);
    const project = await readDoc(collection,projectId), user = await readDoc(collection,userId);
    if (project) requireRecord(project.ruleVersion === RULE_VERSION && project.operation === operation && project.month === time.month && /^\d{4}-\d{2}-\d{2}$/.test(project.day || '') && project.day <= time.day && project.day.startsWith(time.month) && countValid(project.monthlyCount) && countValid(project.dailyCount) && project.dailyCount <= project.monthlyCount);
    if (user) requireRecord(user.ruleVersion === RULE_VERSION && user.operation === operation && user.userHash === userHash && user.day === time.day && countValid(user.totalCount) && countValid(user.burstBucket) && user.burstBucket <= time.burstBucket && countValid(user.burstCount) && user.burstCount <= user.totalCount);
    const monthCount = project?.monthlyCount || 0;
    const dailyCount = project?.day === time.day ? project.dailyCount : 0;
    const userCount = user?.totalCount || 0;
    const burstCount = user?.burstBucket === time.burstBucket ? user.burstCount : 0;
    const exhausted = (scope, next) => fail('processingQuotaExceeded',429,scope === 'project' ? '今天或本月的处理额度已用完，原稿已保留，请稍后再试。' : '处理次数已达上限，原稿已保留，请稍后再试。',Math.max(1,Math.ceil((next-now)/1000)));
    if (monthCount >= policy.projectMonthlyLimit) throw exhausted('project',time.nextMonth);
    if (dailyCount >= policy.projectDailyLimit) throw exhausted('project',time.nextDay);
    if (userCount >= policy.userDailyLimit) throw exhausted('user',time.nextDay);
    if (burstCount >= policy.burstLimit) throw exhausted('user',(time.burstBucket+1)*policy.burstMs);
    const updatedAt = new Date(now).toISOString();
    await writeAndRead(collection,projectId,{ ruleVersion:RULE_VERSION,operation,month:time.month,day:time.day,monthlyCount:monthCount+1,dailyCount:dailyCount+1,updatedAt });
    await writeAndRead(collection,userId,{ ruleVersion:RULE_VERSION,operation,userHash,day:time.day,totalCount:userCount+1,burstBucket:time.burstBucket,burstCount:burstCount+1,updatedAt });
    return { ok:true, ruleVersion:RULE_VERSION };
  });
  const receipt=result?.result ?? result;
  if(receipt?.ok!==true || receipt.ruleVersion!==RULE_VERSION)throw fail('processingCommitUnknown',503,'处理配额提交未确认，原稿已保留。');
  return receipt;
  } catch(error) {
    if(error?.statusCode) throw error;
    throw Object.assign(fail('processingUnavailable',503,'处理配额暂不可读取，原稿已保留，请稍后再试。'),{cause:error});
  }
}
module.exports = { RULE_VERSION, COLLECTION, resolvePolicy, reserveQuota };
