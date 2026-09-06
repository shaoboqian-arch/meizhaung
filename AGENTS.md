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

## 工具链拉平通报（2026-09-06，三项目跨仓库事实）

与健身/拼豆共用同一环境，以下为拉平后的统一口径：

- **凭证同源**：`~/.config/.cloudbase/auth.json` 为 `tcb` CLI 与插件 MCP 共用。新版独立 MCP（`@cloudbase/cloudbase-mcp@2.33.0+`）写回会升级为 domestic 分槽结构，CLI 3.7.0 与插件 MCP 2.23.11 读不懂 → "No valid identity"/REQUIRED。**开工哨兵：`tcb env list`**，报错即备份后把 `credential.domestic` 展平回 `credential`。
- **进程缓存**：运行中的 MCP 进程缓存认证状态，修完凭证本会话内仍报 REQUIRED 属预期，新会话自动恢复。
- **版本钉死**：插件 MCP 固定 2.23.11；禁止 `npx @latest` 独立 MCP 碰凭证；cloudbase-skills 仅用于只读诊断（日志/NoSQL 查询/环境信息），写操作一律走上面的 tcb 命令。
- **GitHub**：直连 443 挂起，push 走 `git -c http.proxy=http://127.0.0.1:7897 push`（先探测端口）。
- Git 状态：main 已与远端同步（15450c3）；工作区 ` .npmrc` 本地改动属既有状态（npmmirror + legacy-peer-deps），保持不提交。

## 挂账（按优先级）

1. M-04：tesseract.js WASM/模型自托管进 `public/`（消除 CDN 未锁版风险）。
2. 可达性：`--muted` #8b7469 对比度 3.9:1 < AA 4.5:1。
3. 低优先：CLS 日志明文记录 `X-Routine-Edit-Credential` 请求头（保留 7 天，需网关脱敏或改凭证传递）。
4. 搁置（用户决策）：Taro 链路升级、iOS `NSCameraUsageDescription`。
