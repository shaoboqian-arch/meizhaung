const crypto = require("crypto");

// 微信服务端能力封装：stable_token 获取与缓存、code2Session、msgSecCheck 内容安全。
// 约定：
// - WECHAT_APPSECRET 只从环境变量读取；缺失或格式异常时整组能力关闭（resolveWxSecret 返回 null），
//   由调用方返回明确的降级文案，绝不把密钥写进代码/日志/响应。
// - code2Session 返回的 session_key 只留在服务端内存中随即丢弃，绝不出站、绝不入日志。
// - 所有网络调用允许注入 fetchImpl / 时钟，供契约测试在无网环境验证纯逻辑。

const MP_APPID = process.env.WECHAT_APPID || "wxcdd528f3f224afe3";
const OPENID_PATTERN = /^[A-Za-z0-9_-]{24,32}$/;

function resolveWxSecret(env = process.env) {
  const secret = env.WECHAT_APPSECRET;
  return typeof secret === "string" && secret.length >= 32 ? secret : null;
}

// —— stable_token：微信官方推荐入口，有效期内重复调用返回同一令牌；本地仍缓存以省外呼延迟，
//    提前 5 分钟视为过期，避免边界请求拿到已失效令牌。——
let tokenCache = { token: "", expiresAt: 0 };

function readCachedToken(now = Date.now()) {
  return now < tokenCache.expiresAt ? tokenCache.token : "";
}

function rememberToken(token, expiresIn, now = Date.now()) {
  tokenCache = { token: String(token), expiresAt: now + Math.max(60, (Number(expiresIn) || 7200) - 300) * 1000 };
}

function resetTokenCache() {
  tokenCache = { token: "", expiresAt: 0 };
}

async function fetchStableToken({ appid = MP_APPID, secret, fetchImpl = fetch, now = Date.now() } = {}) {
  const cached = readCachedToken(now);
  if (cached) return cached;
  if (!secret) throw new Error("WX_SECRET_MISSING");
  const response = await fetchImpl("https://api.weixin.qq.com/cgi-bin/stable_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "client_credential", appid, secret })
  });
  if (!response.ok) throw new Error(`WX_TOKEN_HTTP_${response.status}`);
  const data = await response.json();
  if (data && data.errcode) throw new Error(`WX_TOKEN_ERR_${data.errcode}`);
  if (!data || typeof data.access_token !== "string" || !data.access_token) throw new Error("WX_TOKEN_MALFORMED");
  rememberToken(data.access_token, data.expires_in, now);
  return data.access_token;
}

// —— code2Session：wx.login 的 code 换 openid。session_key 出现在响应里但这里只提取 openid，
//    其余字段不透传、不落日志。——
async function codeToSession({ code, appid = MP_APPID, secret, fetchImpl = fetch } = {}) {
  if (!secret) throw new Error("WX_SECRET_MISSING");
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", String(code || ""));
  url.searchParams.set("grant_type", "authorization_code");
  const response = await fetchImpl(url, { method: "GET" });
  if (!response.ok) throw new Error(`WX_SESSION_HTTP_${response.status}`);
  const data = await response.json();
  // 常见业务错误：40029 code 无效 / 45011 频率限制 / 40226 风险拦截；原样交给上层分类。
  if (data && data.errcode) return { errcode: Number(data.errcode), errmsg: String(data.errmsg || "") };
  if (!data || typeof data.openid !== "string" || !data.openid) throw new Error("WX_SESSION_MALFORMED");
  return { openid: data.openid };
}

// —— msgSecCheck v2：version=2 必须带 openid；scene 2=评论（用户发表内容）。
//    返回微信原始响应，由 classifySecCheck 统一分类。——
async function msgSecCheck({ content, openid, secret, fetchImpl = fetch, now = Date.now(), maxContentLength = 250_000 } = {}) {
  const token = await fetchStableToken({ secret, fetchImpl, now });
  const response = await fetchImpl(`https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: 2,
      scene: 2,
      openid,
      content: String(content || "").slice(0, maxContentLength)
    })
  });
  if (!response.ok) throw new Error(`WX_SECCHECK_HTTP_${response.status}`);
  return response.json();
}

// 把微信的 errcode / result.suggest 收敛成四种裁决：
// pass（放行）/ risky（拒绝，带中文文案）/ badOpenid（客户端身份失效，拒绝）/ rateLimited / infra。
function classifySecCheck(data) {
  const errcode = Number(data?.errcode ?? -1);
  if (errcode === 0) {
    const suggest = String(data?.result?.suggest || "pass");
    if (suggest === "risky") return { verdict: "risky", message: "内容包含违规信息，请修改后再保存。" };
    // pass 与 review（疑似）都放行；review 只在日志层面关注。
    return { verdict: "pass", suggest };
  }
  if (errcode === 40003 || errcode === 61010) {
    return { verdict: "badOpenid", message: "微信身份已失效，请退出小程序重新进入后再试。" };
  }
  if (errcode === 40001 || errcode === 42001) return { verdict: "tokenExpired", message: "" };
  if (errcode === 45009 || errcode === 45011) return { verdict: "rateLimited", message: "操作过于频繁，请稍后再试。" };
  return { verdict: "infra", message: "" };
}

module.exports = {
  MP_APPID,
  OPENID_PATTERN,
  classifySecCheck,
  codeToSession,
  fetchStableToken,
  msgSecCheck,
  readCachedToken,
  resetTokenCache,
  resolveWxSecret
};
