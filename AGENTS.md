# 美妆项目 开发维护规则

成分搭配助手：React 18 + Vite 5 + TypeScript，浏览器端 OCR（tesseract.js），CloudBase 云函数跨设备同步。只面向浏览器（PC+移动响应式）；Taro 小程序 / iOS 搁置。真身工程根即本仓库。

## 当前权威基线

- CloudBase 环境（唯一）：`qianshaobo-d3gjx8wkh621904d1`（个人版，2026-09-29 到期、自动续费已开，与健身/拼豆共用，生产集合操作只读优先）。
- 线上：`https://qianshaobo-d3gjx8wkh621904d1-1456392181.tcloudbaseapp.com/`，产物以部署回读为准（当前 CSS 指纹 index-B98pSYEU.css）。
- 云函数：`meizhaung-sync`（HTTP，Nodejs20.19）；health 端点回读验证。
- 数据：`meizhaung_user_combinations` 当前 **18 条为用户拍板的最终状态，一律保留勿删**（含「Codex验收/视觉验收/发布验收/双设备验收」「123」「波/少波/兰」系列——不是垃圾）。

## 部署口径

命令一律用 `tcb`（旧入口 `cloudbase` 凭证刷新失效）；Node22 PATH 前缀 `export PATH="/c/Users/admin/AppData/Local/nodejs22:$PATH"`。本地开发必须 `VITE_ROUTINE_SYNC_API` 防写生产。

```bash
node --check cloudfunctions/meizhaung-sync/index.js   # 语法检查
node tests/cloud-sync-auth-contract.mjs               # 契约测试
tcb functions:deploy meizhaung-sync -e qianshaobo-d3gjx8wkh621904d1 --force
npx vite build                                        # 产物 dist/
tcb hosting:deploy dist -e qianshaobo-d3gjx8wkh621904d1
```

## CORS 两层机制（勿再踩，两次实测教训）

- 访问层对 `*.tcloudbaseapp.com` Origin 自动回显 `Access-Control-Allow-Origin`；
- 外部 Origin（GitHub Pages 等）由函数内白名单补头，**白名单只留 `https://shaoboqian-arch.github.io`**；
- 把 tcloudbase 域名加进函数白名单会产生重复头 → 浏览器直接拒绝。函数 index.js 顶部有注释。

## 云服务接入（2026-10-04，WorkBuddy Cloud Service）

小程序端的跨设备同步已接入 WorkBuddy 云服务（**取代**原先只在 Web 端可用的 `cloudfunctions/meizhaung-sync`）。

- 应用：`wbapp_t1U4NdF6I0IZdm8LzoMLq6`「成分搭配助手」，`billingStatus: normal` / `provisionStatus: assigned`。
  `publicConfig.endpoint` = 小程序固定网关 `https://mp-api.app.workbuddy.host`（**所有小程序共用**，
  不是应用自有域名；微信域名白名单由发布流程幂等注册，无需手工配）。
- **SDK 必须走 `/miniprogram` 子路径**：
  `@tencent-ai/workbuddy-cloud-sdk`（`@dev` 通道，勿钉版本、勿用 `@latest`）→
  `createMiniProgramWorkBuddyCloud({ endpoint, publishableKey, wx: createDiagnosticWx(Taro) })`。
  ⚠ 小程序无 `location.origin`，**没有同源回落**，`endpoint` 必传。Taro 构建会把 SDK 打进 `dist/vendors.js`。
- 代码位置：
  - `src/shared/cloud.ts` —— **唯一的 SDK 初始化点**，含登录态门禁与按 `error.kind` 判别的错误文案。
  - `src/shared/workbuddy-cloud-diagnostics.js` —— 诊断适配器（从技能 assets 原样拷贝，勿改）。
    真机 vConsole 可看 `[WorkBuddy Cloud] initialized` / `request failed`。
  - `src/shared/storage.ts` —— 云同步层（**本地优先、云端增强**：读不等网络；云端只在「本机还没有内容」时灌入，
    `beauty-cloud-synced-at` 标记 +5 分钟节流）。
  - `src/pages/conditions/index.tsx` —— 「登录并同步 / 上传到云端 / 从云端恢复」三按钮入口。
  - `src/pages/products/index.tsx` —— 增删产品后静默推云。
- **数据库表**（均为 owner-scoped，RLS 已开，8 条策略全为 `owner_id = auth.uid()`）：
  - `user_products` —— 手动添加的产品，`UNIQUE(owner_id, product_id)`，客户端 upsert 用 `onConflict: "owner_id,product_id"`，**不传 owner_id**（由 `DEFAULT auth.uid()` 填）。
  - `user_profiles` —— 肤质 + 选中组合，`UNIQUE(owner_id)`，upsert 用 `onConflict: "owner_id"`。
  建表/策略一律走 `workbuddy_cloudservice_db_exec_sql`，**一条语句一次调用**，`mode: migrate`；管理工具需显式传 `applicationId`（与技能文档所述「服务端注入」不符，以实际 schema 为准）。
- ⚠ **`cloud.storage` 在小程序端不可用**（适配层 fetch 不支持 `Blob`/`arrayBuffer`）——
  `cloud.auth` / `database` / `llm` 不受影响。要传图只能走 `cloud.database` 存文本路径或另找方案。
- 登录走 `wx.login` + `cloud.auth.signInWithWechat(code, 运行时 appid)`；**运行时 appid 不能写死**（试用版与正式版是两个小程序）。

## 微信内容安全链路（2026-10-07 接线，等正确 AppSecret 激活）

msgSecCheck（免费）已接入，架构是**独立审核端点**而非内联组合同步路由——因为小程序的组合同步走 WorkBuddy 云，不经过 meizhaung-sync：

- `cloudfunctions/meizhaung-sync/wxsec.js`：stable_token（缓存、提前 5 分钟过期）+ code2Session + msgSecCheck v2 + errcode 分类。**WECHAT_APPSECRET 只从环境变量读**（缺失=能力关闭）；session_key 只留在服务端内存，不回传不落日志。
- 端点：`POST /wechat/session {code} → {openid}`；`POST /sec-check {content}` + `X-WX-Openid` 头 → 200 放行 / 400 违规或身份失效（中文文案）/ 429 限流。
- **故障放行原则**：审核基础设施故障（token 异常、微信 5xx、网络）→ 放行并记日志；只有微信明确裁决 risky / badOpenid 才阻断。合规底线=risky 必拦，可用性底线=审核通道故障不冻结保存主链路。
- 小程序端：`src/shared/wxsession.ts`（openid 缓存键 `beauty.wx.openid.v1` + `checkContentBeforeSave`），已挂 product-add 提交（brand/model/ingredientText 三手输字段）。Web 端不走此链路（无微信身份，微信审核只辖小程序内 UGC）。
- 契约测试：`tests/wxsec-contract.mjs`（6 例）+ `mp-weixin/tests/*`（随 `mp-weixin/scripts/test.cjs` 逐 bundle 直跑聚合；2026-10-10 起 runner 改直跑，node18 默认环境可用）。
- **包体结论（2026-10-10 实测，勿重复推导）**：单包 1.6MB/2MB（80%）可接受；`src/assets/illustrations` 18 张 PNG 已是 pal8 调色板优化图（ffmpeg palette 重编码反而增大），非 tab 四页（conditions/product-add/product-detail/ingredient-detail）产物合计仅 ~55KB（3.4%），**分包不划算**——图片与 common/taro/vendors 运行时被 tab 页钉死在主包。真正的下一杠杆=hero 图 CDN 化（需 downloadFile 白名单）或视觉裁决删图。
- ✅ **AppSecret 已激活（2026-10-08 凌晨）**：第二串密钥 `09426e36...` 经 stable_token 验证有效，但**属于 `wx94fbe5333a32ecd0`（护肤成分搭配助手）——这才是美妆小程序真身**。根因：project.config.json 曾写死的 `wxcdd528f3f224afe3` 是陈旧错误值（不是用户实际运行的小程序），导致前两轮"密钥无效"误判——密钥本身一直是对的，验真时对照的 appid 错了。铁证：该控制台名称/简介=美妆内容、开发管理"已托管给第三方"（WorkBuddy）、wx94f+两串密钥 stable_token 双双 TOKEN_OK。环境变量现为四键（OCR_SECRET_ID/KEY + WECHAT_APPID=wx94fbe5333a32ecd0 + WECHAT_APPSECRET），wxsec.js 默认 appid 同步改真身。**四项验证全过**：health 200；/wechat/session 假 code → 40029（密钥正确铁证）；/sec-check 假 openid → 400 中文拒答（token+审核全链路通）；/ocr 502 回归不变（OCR 密钥完好）。注意：SCF UpdateFunctionConfiguration 是**全量替换语义**，改环境变量必须带全四键。客户端预检（product-add 保存前审核）已提交，随下一版体验版生效。

## 正式版上线（2026-10-05）

**体验版已发布可用；正式版被微信拦截，原因是小程序后台未完成初始化。**

报错原文：「小程序尚未完成初始化，请先在微信后台完善昵称、头像、简介和服务类目」。

⚠ **这是账号资质问题，不是代码问题** —— 代码侧 `scripts/wxss-upload-gate.cjs` 门禁已全绿。
四项基础信息只能在 mp.weixin.qq.com 后台填，AI 无法代做（涉及账号资质审核）。

**已备好的后台文案（供复制）**：
| 字段 | 建议填写 |
|---|---|
| 昵称 | 成分搭配助手 |
| 简介 | 记录肤质，查看 700+ 护肤品成分，帮你避开刺激叠加、搭对护肤步骤。（仅作护肤参考，不构成医疗建议） |
| 类目 | 工具类下与「健康管理 / 美容护肤」最接近的一项（后台以下拉列表实际选项为准） |
| 头像 | 正方形图片 |

**产品实际规模**（写简介别夸大，核实自 `src/data/catalog.ts`）：产品 **766 款**、成分 **222 种**。
四大功能页：`我的`（肤质记录）/ `产品库` / `成分库` / `搭配`（分析）。
应用内已有免责声明：「仅作为护肤搭配参考，不构成医疗建议」—— 简介里带上这句可降低审核风险。

**⚠ 正式版还需先完成小程序备案**（腾讯 + 工信部流程，通常 1–20 工作日）。
备案未完成时提交审核会**直接被拒且不消耗提审额度**（当前显示"本周剩余 3 次"）。
昵称每年仅可改 2 次 —— 若「成分搭配助手」已被占用，改名前先确认。

## 小程序上线（2026-10-04 打通，此前搁置）

Taro 小程序链路已恢复可用，**不再搁置**（原「搁置（用户决策）」条目已于 2026-10-04 由用户重启）。iOS 仍搁置。

- **⚠️ 发布目录必须是 `mp-weixin/dist/`（产物目录），不是 `mp-weixin/`（Taro 工程根）。**
  2026-10-04 踩坑实录：最初把发布目录登记成工程根（其 `project.config.json` 里`miniprogramRoot: "dist/"`），
  平台每次上传要自己解析 + 构建，**中间有缓存** —— 磁盘上 22:27 修好的代码，它一直上传 22:19 的旧包，
  报错位置一字不变（`common.wxss(1:2770)`）。**排查办法（可复用）**：把产物用 rgba→hsla 反向压回旧形态，
  看报错 pos 是否正好落在 hsla 上；落上了就证明平台用的是旧包。
  改为直接发布 `mp-weixin/dist/`（该目录自洽：`miniprogramRoot: "./"`、零外部依赖、页面组件引用全有效）后问题消失。
  重新登记方式：`workbuddy_sites_deploy` 的 `directory` 传`mp-weixin/dist`，并先对该目录跑一次
  `workbuddy_cloud_service action=activate applicationMode=reuse`（同一 applicationId，environment 不变）。
- **构建一条龙（发布前必须完整跑完，七步）**：`npm run mp:build` ——
  1) `taro build --type weapp` 2) `normalize-wxss-color.cjs`（hsla→rgba、minmax→1fr）
  3) `replace-wxss-gap.cjs`（gap→子项 margin） 4) `normalize-wxss-syntax.cjs`（grid→flex、删空伪元素、去属性选择器）
  5) `verify-mp-runtime.cjs`（注册自检，`Component()` 必须 ≥1） 6) **`wxss-upload-gate.cjs`（上传硬门禁，不兼容语法直接失败）**
  7) 同步隐私清单进 `dist/`。产物目录里必须带 `.wbapp_t1U4NdF6I0IZdm8LzoMLq6.privacy.json`。
- **微信 WXSS 语法兼容清单（2026-10-04 挡了四次上传换来的，新增样式前先查这张表）**：
  | 语法 | 微信 | 说明 |
  |---|---|---|
  | **选择器里的中文标识符**（`.risk-高` / `.暂未覆盖`） | ✗ | **唯一从头到尾都在拦上传的那个**。动态 `className` 里灌中文值（`` `risk-${level}` ``、`` `${status}` ``）是常见来源。**类名必须英文，显示文案可以中文** —— 用映射表分离。 |
  | `gap: 8rpx` | ✗ | 小程序全版本不支持，用子项 margin 替代。 |
  | `hsla(8,75%,64%,.42)` | ✗ | Taro CSS 管线把带透明度的彩色 `rgba()` 压成带空格 hsla。源码 87 处 rgba 有 30 处被转。 |
  | `display: grid` | ✗ | Grid 支持极差。等分列表改 flex+wrap。 |
  | `repeat(N, minmax(0,1fr))` | ✗ | `minmax()` 不支持。 |
  | `[disabled]` 属性选择器 | ✗ | 属性选择器支持不稳定，整条规则解析失败。 |
  | `::before`/`::after` 里的 `display:none` | ✗ | 这类"隐藏"规则会被拒（已删；均为空操作）。 |
  | `var(--x)` / `oklch()` / `color-mix()` / `clamp()` / `position:sticky` / `justify-items` | ✗ | 当前产物 0 命中，**新增前先查这张表** |
  | `::before`/`::after` 作装饰 | △ | 简单装饰通常可渲染。`.top::before`、`.skin-hero::before` 是真实视觉，**保留**。 |
- **⚠ 有硬门禁，别绕过**：`mp:build` 倒数第二步跑 `scripts/wxss-upload-gate.cjs`，
  扫出上表任一语法（含中文选择器）就**直接构建失败、退出码 1**，并打印文件 + 位置 + 说明。
  已做过反向测试（注入 `.测试中文{}` → 立刻拦截）。**下次加样式先跑它，别等上传失败才发现。**
- ⚠ **不要试图在 config 里关转换**：`mini.postcss.css.minify.colormin` 与顶层 `minify.csso.enable:false` 都试过，**无效** —— 转换发生在 css-loader 之前的 postcss 阶段，只能在产物上后处理。
- **排查 `unexpected '◆'` 的方法（可复用）**：
  1. `◆` 是「**任何**不认的属性」的通用标记，**一个报错串里的多个 pos 可能指向不同语法** —— 不要当成同一个问题的坐标。
  2. `pos N` 是压缩合并后的偏移，去原文件读该位置往往完全正常；**真正要看的是 N 指向的那个 token**。
  3. 想确认平台是否用了旧包：把产物反向压回旧形态，看 pos 是否正好落在可疑 token 上。
  4. 「位置没变」**不能**证明是缓存 —— 两个不同问题可能恰好位置接近。
  5. 改完 gap 类样式，用 `scripts/list-gap-rules.cjs` 核对父规则是否都补了 margin。
- **中文类名的正确写法（示例见`pages/ingredients/index.tsx`、`pages/analysis/index.tsx`）**：
  ```ts
  const riskClassMap = { 高: "high", 中: "mid", 低: "low" };
  const riskClass = (level: string) => riskClassMap[level] ?? "unknown";
  // 类名走映射（英文），文案照旧显示中文
  <Text className={`tag risk-${riskClass(level)}`}>风险{level}</Text>
  ```
- **⚠ `src/shared/page.css`（11.7KB）是小程序独立副本**，Web 端 `src/styles.css` 另有 41KB、只借了插画图片。
  所以改小程序样式**不影响 Web 端**，可以放心改。
- **改完产物代码务必跑运行时实测**：`node mp-weixin/scripts/verify-mp-runtime.cjs` ——
  它用 wx mock 加载 dist 并统计 `App()`/`Page()`/`Component()` 调用数，能抓出静态检查发现不了的注册级问题。
  **`Component()` 为 0 就是白屏**，别再靠读代码猜。
- **包体红线：主包 ≤ 2MB。** 2026-10-04 首轮构建 2.12MB **超限 123KB**，原因是 18 张插画 PNG 占 1.7MB。
  解法：`sharp` 的 `png({quality:88, compressionLevel:9, effort:10, palette:true})` 重压 → 1631KB 降到 637KB（省 61%），
  包体降到 1.15MB。**视觉无损**（已出 before/after 对比图肉眼核对）。
  源码在 `mp-weixin/src/assets/illustrations/`，全部被 git 跟踪，`git checkout` 可完整回滚。
  加图前先测包体；若再逼近上限，备选是转 WebP q82（117KB，更省但需改 import 扩展名与 Taro loader 配置）。
- 发布：走 WorkBuddy 应用面板（appId `wbapp_t1U4NdF6I0IZdm8LzoMLq6`，名「成分搭配助手」）。
  **发布目录取 `mp-weixin/dist/`（产物目录），不是 `mp-weixin/`。**
  扫码绑定 → 上传 → 提审 → 发布都在面板右上角「分享」里，不走微信开发者工具。
- **小程序端零网络请求**（`grep tcloudbaseapp|wx.request|fetch` 在 `mp-weixin/src` 命中 0）：数据来自 `src/data/catalog` + 本地 storage，
  因此不依赖服务器域名备案；**2026-10-04 接云服务后这条已不成立**——现在会请求 `mp-api.app.workbuddy.host`。
  云函数 `meizhaung-sync` 的跨设备同步在小程序端仍不可用，已由 WorkBuddy 云服务接管。
- **AppID = `wx94fbe5333a32ecd0`（护肤成分搭配助手），已更正到 `project.config.json`（2026-10-08 实证，见上文"AppSecret 已激活"节）。**
  曾写死的 `wxcdd528f3f224afe3` 是陈旧错误值——WorkBuddy 上传不受它影响（上传走扫码授权绑定的账号），
  但本地开发者工具/预览会用错身份。**2026-10-04 已解除「微搭低代码」第三方授权（原 2026/08/09 授出）。**
  后续若再遇「未取得相关权限，平台无法代你上传代码与提审」，九成是「设置 → 第三方授权管理」里
  又被某个第三方平台占用（微信规定一个小程序同时只能授权一个第三方平台）—— **先查那张表，别改代码**。
  扫码授权时必须勾选「开发管理与数据分析权限」，缺该项会报同样的错。
  ⚠ 解绑微搭的连带影响：微搭侧无法再向本小程序发布；已发布版本不受影响；Web 端 CloudBase 那条线独立、不受影响。
- **提审隐私声明（重要，2026-10-04 踩坑修正）**：
  ⚠️ **`requiredPrivateInfos` 不是通用隐私声明字段** —— 它只接受 8 个**地理位置**接口：
  `chooseAddress` / `chooseLocation` / `choosePoi` / `getFuzzyLocation` / `getLocation` /
  `onLocationChange` / `startLocationUpdate` / `startLocationUpdateBackground`。
  写任何其他值（如 `chooseMedia`）会让**上传直接失败**：
  `app.json: requiredPrivateInfos[0] 字段需为 chooseAddress,chooseLocation,choosePoi,...`。
  2026-10-04 我误加 `requiredPrivateInfos: ["chooseMedia"]` 导致首次上传失败，已移除。
  **本工程不使用任何位置接口**（`grep getLocation|chooseLocation|chooseAddress|choosePoi|... src/` = 0 命中），
  所以**不需要也不应该**有 `requiredPrivateInfos` 这个键。
  相册/相机走微信后台「用户隐私保护指引」表单声明，与 `app.json` 无关。
- 云同步代码对首屏无影响：`storage.ts` 用的是动态 `await import("./cloud")`，不阻塞页面渲染。

## 工具链拉平通报（2026-09-06，三项目跨仓库事实）

与健身/拼豆共用同一环境，以下为拉平后的统一口径：

- **凭证同源**：`~/.config/.cloudbase/auth.json` 为 `tcb` CLI 与插件 MCP 共用。新版独立 MCP（`@cloudbase/cloudbase-mcp@2.33.0+`）写回会升级为 domestic 分槽结构，CLI 3.7.0 与插件 MCP 2.23.11 读不懂 → "No valid identity"/REQUIRED。**开工哨兵：`tcb env list`**，报错即备份后把 `credential.domestic` 展平回 `credential`。
- **进程缓存**：运行中的 MCP 进程缓存认证状态，修完凭证本会话内仍报 REQUIRED 属预期，新会话自动恢复。
- **版本钉死**：插件 MCP 固定 2.23.11；禁止 `npx @latest` 独立 MCP 碰凭证；cloudbase-skills 仅用于只读诊断（日志/NoSQL 查询/环境信息），写操作一律走上面的 tcb 命令。
- **GitHub**：直连 443 挂起，push 走 `git -c http.proxy=http://127.0.0.1:7897 push`（先探测端口）。
- 依赖安装配置：`.npmrc` 的 npmmirror 镜像与 `legacy-peer-deps` 属项目有效配置，按用户 2026-10-07 的收口要求纳入版本控制；不得包含凭据。

## 挂账（按优先级）

1. ~~M-04：tesseract.js WASM/模型自托管进 `public/`（消除 CDN 未锁版风险）~~。**已完成（2026-10-07，提交 4256144）**：worker/core wasm/训练数据全部进 `public/tesseract/`（`scripts/vendor-tesseract.cjs` + `scripts/download-tessdata.cjs` 生成，升级 tesseract 后重跑），`localOcr.ts` 显式传 `workerPath/corePath/langPath`；线上端到端验证通过（canvas 合成成分表 → 87% 置信度全文本识别，零第三方 CDN 依赖）。
2. 可达性：`--muted` #8b7469 对比度 3.9:1 < AA 4.5:1。
3. 低优先：CLS 日志明文记录 `X-Routine-Edit-Credential` 请求头（保留 7 天，需网关脱敏或改凭证传递）。
4. 搁置（用户决策）：iOS `NSCameraUsageDescription`。（Taro 小程序已于 2026-10-04 解搁置，见上文）
