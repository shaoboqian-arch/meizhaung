# 美妆私人云写入 v1 候选

仅适用 `wbapp_t1U4NdF6I0IZdm8LzoMLq6` / `postgres-lgjvhh7s`，操作账号
`cloudbase_postgres_postgres_lgjvhh7s`。当前文件为候选，生成文件不代表线上生效。

## 写入规则

服务端分别核验 WorkBuddy 登录会话和微信处理凭证，只对审核通过的原文、目标账号、
预期版本签发 120 秒 HMAC 凭据。PostgreSQL 独立核对真实 `auth.uid()`、内容签名、
版本和 nonce，在一个事务内写入产品、版本记录和操作回执。版本冲突不自动覆盖；
审核、网络或回读失败均保留客户端原稿及照片。

资料仅允许目录产品、本人产品编号及封闭的肤质选项；不允许绕过审核写入自由文本。
管理员 DML 也更新同一版本表；TRUNCATE 被阻止，以避免抹掉版本依据。
既有行从版本 1 开始，无需重写。辅助表不保存全文，操作回执保存内容摘要及结果版本。

类别、肤质、目录编号来自客户端现有常量和目录，通过
`scripts/generate-product-write-rules.mjs` 生成；`--check` 检查漂移。
`prepare.sql` 由 `scripts/build-owned-product-migration.mjs` 生成。

## 上线顺序与授权门禁

本轮后台和数据库写操作必须另获明确授权。小程序体验版由用户更新。

1. 先用 `preflight.sql` 只读重查实际数据库、表定义、所有者、RLS、约束、角色继承和权限。
   对照封存的生产原始证据；任何漂移先停止受影响操作，不能用本地通过代替。
2. `build-owned-product-plan.mjs --out <新的绝对目录>` 生成带目标检查的单条 DO。
   WorkBuddy `workbuddy_cloudservice_db_exec_sql` 必须显式指定应用，每次一条语句、`mode:migrate`。
   先执行 prepare；新建私有 schema、pgcrypto、4 张辅助表、4 个公开 RPC、版本及防清空触发器。
3. 在受控凭证位置生成独立随机审核签名密钥。私有 config 表和云函数使用同一密钥，
   不复用微信 AppSecret，不写日志、公开清单或源码。配置语句单独审批范围内执行。
4. 通过 `tcb` 部署 `meizhaung-sync`。合并保留全部现有环境变量（含 OCR 额度、微信、OCR 凭证），
   加 `BEAUTY_PRODUCT_RECEIPT_SECRET`、`BEAUTY_WORKBUDDY_PUBLISHABLE_KEY`、`MEIZHAUNG_SOURCE_SHA`。
   SCF 环境变量更新为全量语义，禁止只提交新增键。
5. 完成真实网关身份、签名 RPC、版本冲突和回读验收后，执行 cutover 收回普通角色的
   表级及列级直写权限。保留本人 RLS 读权限、RPC 执行权限和全部原数据。
6. 用户更新小程序体验版；真实微信端同步验收后再将 M01 标记完成。

旧体验版在 cutover 后直接表写会被拒绝，客户端原稿保留；需要协调体验版更新窗口。
本方案不读写或迁移 `meizhaung_user_combinations` 的 18 条 Web 最终组合，不变更 HHID、抠图服务。

## 验证边界与恢复

嵌入 PostgreSQL + pgcrypto 执行真实 SQL，验证目标守卫、权限、版本、签名及事务回滚。
本机 HTTP 使用真实 Express 路由、隔离云端身份/审核响应。两者都不证明生产网关或真机已通过，
单连接 PostgreSQL 验证也不等于真实多连接锁竞争验证。

失败时停止下一阶段；prepare 不收回旧权限。cutover 后不得自动恢复不安全直写；
恢复权限需独立明确授权并使用事前留存的真实 ACL。恢复云函数使用上一版本包与完整环境配置。
禁止以 DROP、清空辅助表或删除用户原稿作为自动回滚。
