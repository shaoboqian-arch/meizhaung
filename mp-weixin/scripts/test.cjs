// Compile tests into a fresh directory. Real Taro / SDK networking is replaced at the import boundary.
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "../..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "beauty-mp-tests-"));
esbuild.build({
  entryPoints: [path.join(root, "mp-weixin/tests/round1.test.tsx"), path.join(root, "mp-weixin/tests/round2.test.ts"), path.join(root, "mp-weixin/tests/ocr-client.test.ts"), path.join(root, "mp-weixin/tests/wxsession-client.test.ts"), path.join(root, "mp-weixin/tests/reference-photo.test.ts")],
  bundle: true, platform: "node", format: "cjs", jsx: "automatic",
  outdir: out, outExtension: { ".js": ".cjs" }, tsconfig: path.join(root, "mp-weixin/tsconfig.json"),
  plugins: [{ name: "offline-mini-boundaries", setup(build) {
    const mocks = {
      "@tarojs/taro": "taro.ts",
      "@tarojs/components": "components.tsx",
      "@tencent-ai/workbuddy-cloud-sdk/miniprogram": "sdk.ts"
    };
    build.onResolve({ filter: /^(@tarojs\/(taro|components)|@tencent-ai\/workbuddy-cloud-sdk\/miniprogram)$/ },
      (args) => ({ path: path.join(root, "mp-weixin/tests/mocks", mocks[args.path]) }));
  } }]
}).then(() => {
  console.log(`Offline test bundle: ${out}`);
  // node18 的 --test 子进程 TAP 解析器吃不下中文用例名（ERR_TAP_LEXER_ERROR）；
  // 直接逐个执行 bundle（spec 报告器），聚合失败数作退出码。
  const bundles = ["round1.test.cjs", "round2.test.cjs", "ocr-client.test.cjs", "wxsession-client.test.cjs", "reference-photo.test.cjs"];
  let failed = 0;
  for (const name of bundles) {
    const result = spawnSync(process.execPath, [path.join(out, name)], { stdio: "inherit" });
    if (result.status !== 0) failed += 1;
  }
  process.exitCode = failed ? 1 : 0;
}).catch((error) => { console.error(error); process.exitCode = 1; });
