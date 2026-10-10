import Taro from "@tarojs/taro";
// 微信 code 由服务端换取短期处理凭证。openid 本身不授予 OCR 或内容预检权限。
export const SESSION_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/wechat/session";
export const SEC_CHECK_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/sec-check";
export const PROCESSING_SESSION_KEY = "beauty.wx.processing.v1";
type ProcessingSession = { openid: string; processingToken: string; expiresAt: number };
export class ContentBlockedError extends Error {}
export class ContentPendingError extends Error {}
const pendingMessage = "内容校验暂未完成，草稿已保留，请稍后重试。";
export const parseSessionResponse = (statusCode: number, data: unknown): string => {
  const payload = data && typeof data === "object" ? data as { openid?: unknown; error?: unknown } : null;
  if (statusCode === 200 && typeof payload?.openid === "string" && /^[A-Za-z0-9_-]{24,32}$/.test(payload.openid)) return payload.openid;
  throw new Error(typeof payload?.error === "string" ? payload.error : "微信身份获取失败，请稍后再试。");
};
export const parseSecCheckResponse = (statusCode: number, data: unknown): string => {
  const payload = data && typeof data === "object" && !Array.isArray(data) ? data as { ok?: unknown; unchecked?: unknown; pending?: unknown; error?: unknown } : null;
  if (statusCode === 200 && payload?.ok === true && payload.unchecked !== true && payload.pending !== true) return "";
  return typeof payload?.error === "string" ? payload.error : statusCode === 400 ? "内容未通过安全校验，请修改后再保存。" : pendingMessage;
};
function validProcessingSession(value: unknown): value is ProcessingSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as ProcessingSession;
  return typeof s.openid === 'string' && /^[A-Za-z0-9_-]{24,32}$/.test(s.openid)
    && typeof s.processingToken === 'string' && /^wxc_[A-Za-z0-9_-]+\.[0-9a-f]{64}$/.test(s.processingToken)
    && Number.isSafeInteger(s.expiresAt) && s.expiresAt > 0;
}
export async function ensureProcessingSession(): Promise<ProcessingSession> {
  const cached = Taro.getStorageSync(PROCESSING_SESSION_KEY);
  if (cached !== '' && cached !== undefined && cached !== null) {
    if (!validProcessingSession(cached)) throw new Error("本机处理凭证读取异常，草稿与照片已保留，请重试。");
    if (cached.expiresAt > Date.now()) return cached;
  }
  const login = await Taro.login();
  if (!login.code) throw new Error("微信身份获取失败，请重试；草稿与照片已保留。");
  const response = await Taro.request({ url: SESSION_ENDPOINT, method: "POST", timeout: 10000, header: { "Content-Type": "application/json" }, data: { code: login.code } });
  const openid = parseSessionResponse(response.statusCode, response.data);
  const next = { openid, processingToken: (response.data as any).processingToken, expiresAt: (response.data as any).expiresAt };
  if (!validProcessingSession(next) || next.expiresAt <= Date.now()) throw new Error("身份服务尚未返回有效处理凭证，草稿与照片已保留。");
  Taro.setStorageSync(PROCESSING_SESSION_KEY, next);
  const stored = Taro.getStorageSync(PROCESSING_SESSION_KEY);
  if (!validProcessingSession(stored) || stored.processingToken !== next.processingToken || stored.openid !== next.openid || stored.expiresAt !== next.expiresAt) throw new Error("处理凭证保存失败，草稿与照片已保留，请重试。");
  return next;
}
export async function ensureWxOpenid(): Promise<string> { return (await ensureProcessingSession()).openid; }
export async function processingHeaders(): Promise<Record<string, string>> {
  return { "Content-Type": "application/json", Authorization: "Bearer " + (await ensureProcessingSession()).processingToken };
}
export async function checkContentBeforeSave(texts: Array<string | null | undefined>): Promise<void> {
  const content = texts.map(item => String(item ?? "").trim()).filter(Boolean).join("\n");
  if (!content) return;
  if (content.length > 8000) throw new ContentBlockedError("内容过长，请精简后重试；草稿已保留。");
  let response;
  try { response = await Taro.request({ url: SEC_CHECK_ENDPOINT, method: "POST", timeout: 10000, header: await processingHeaders(), data: { content } }); }
  catch { throw new ContentPendingError(pendingMessage); }
  const message = parseSecCheckResponse(response.statusCode, response.data);
  if (message) throw response.statusCode === 400 ? new ContentBlockedError(message) : new ContentPendingError(message);
}
