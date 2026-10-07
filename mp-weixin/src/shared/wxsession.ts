import Taro from "@tarojs/taro";

// 微信身份 + 内容安全预检客户端。
// 契约（与服务端 wxsec.js 对齐）：
// - openid 通过 wx.login code → /wechat/session 换取（session_key 不出服务端），本机缓存。
// - /sec-check 只在微信明确裁决 risky / 身份失效（HTTP 400）时阻断；网络异常、429、5xx
//   一律放行（服务端同为故障放行设计，不让审核通道故障冻结保存主链路）。
// 两个 parse 函数保持纯函数，供离线契约测试覆盖。

export const SESSION_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/wechat/session";
export const SEC_CHECK_ENDPOINT = "https://qianshaobo-d3gjx8wkh621904d1.service.tcloudbase.com/meizhaung-sync/sec-check";
const OPENID_STORAGE_KEY = "beauty.wx.openid.v1";

export class ContentBlockedError extends Error {}

export const parseSessionResponse = (statusCode: number, data: unknown): string => {
  const payload = data && typeof data === "object" ? (data as { openid?: unknown; error?: unknown }) : null;
  if (statusCode === 200 && payload && typeof payload.openid === "string" && payload.openid) return payload.openid;
  throw new Error(typeof payload?.error === "string" ? payload.error : "微信身份获取失败，请稍后再试。");
};

export const parseSecCheckResponse = (statusCode: number, data: unknown): string => {
  if (statusCode === 200) return "";
  if (statusCode === 400) {
    const payload = data && typeof data === "object" ? (data as { error?: unknown }) : null;
    if (payload && typeof payload.error === "string") return payload.error;
    return "内容未通过安全校验，请修改后再保存。";
  }
  return ""; // 429 / 5xx / 网络层失败 → 放行，与故障放行约定一致
};

export async function ensureWxOpenid(): Promise<string> {
  try {
    const cached = Taro.getStorageSync(OPENID_STORAGE_KEY);
    if (typeof cached === "string" && cached) return cached;
  } catch { /* 存储异常视为无缓存 */ }
  const loginResult = await Taro.login();
  if (!loginResult.code) throw new Error("微信登录失败，请稍后再试。");
  const response = await Taro.request({
    url: SESSION_ENDPOINT,
    method: "POST",
    timeout: 10000,
    header: { "Content-Type": "application/json" },
    data: { code: loginResult.code }
  });
  const openid = parseSessionResponse(response.statusCode, response.data);
  try { Taro.setStorageSync(OPENID_STORAGE_KEY, openid); } catch { /* 缓存失败不影响本次请求 */ }
  return openid;
}

// 保存前预检：只在微信裁决违规/身份失效时抛 ContentBlockedError 阻断；
// 其余一切异常（openid 获取失败、网络不通等）静默放行。
export async function checkContentBeforeSave(texts: Array<string | null | undefined>): Promise<void> {
  const content = texts.map((item) => String(item ?? "").trim()).filter(Boolean).join("\n");
  if (!content) return;
  let openid = "";
  try {
    openid = await ensureWxOpenid();
  } catch {
    return; // 身份获取失败 → 放行
  }
  try {
    const response = await Taro.request({
      url: SEC_CHECK_ENDPOINT,
      method: "POST",
      timeout: 10000,
      header: { "Content-Type": "application/json", "X-WX-Openid": openid },
      data: { content }
    });
    const violation = parseSecCheckResponse(response.statusCode, response.data);
    if (violation) throw new ContentBlockedError(violation);
  } catch (error) {
    if (error instanceof ContentBlockedError) throw new Error(error.message);
    // 其余异常（网络层等）→ 放行
  }
}
