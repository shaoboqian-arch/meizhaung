// Compile tests into a fresh directory. Real Taro / SDK networking is replaced at the import boundary.
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "../..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "beauty-mp-tests-"));
esbuild.build({
  entryPoints: [path.join(root, "mp-weixin/tests/round1.test.tsx"), path.join(root, "mp-weixin/tests/round2.test.ts"), path.join(root, "mp-weixin/tests/ocr-client.test.ts"), path.join(root, "mp-weixin/tests/wxsession-client.test.ts")],
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
  const result = spawnSync(process.execPath, ["--test", path.join(out, "round1.test.cjs"), path.join(out, "round2.test.cjs"), path.join(out, "ocr-client.test.cjs"), path.join(out, "wxsession-client.test.cjs")], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
}).catch((error) => { console.error(error); process.exitCode = 1; });
