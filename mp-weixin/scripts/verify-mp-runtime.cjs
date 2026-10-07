/**
 * 小程序产物运行时自检。
 *
 * 用途：静态检查（读 app.json / wxss / 找不兼容语法）抓不到「注册级」问题。
 * 本脚本用最小 wx mock 真正 require 一遍 dist，统计三个注册函数被调用了几次：
 *   App()  期望 1  —— 小程序入口
 *   Page()  期望 = app.json 里 pages 的条数
 *   Component()  期望 ≥1 —— Taro 4.x 的内建运行时组件；**为 0 就是白屏**
 *
 * 2026-10-24 实测：历史脚本 scripts/fix-custom-wrapper.cjs 把 comp 改名成 custom-wrapper，
 * 造成 base.wxml ↔ custom-wrapper.wxml 循环引用，App/Page 都正常但 Component() = 0，
 * 页面全白。删掉该脚本后 Component() 恢复为 1。
 *
 * 用法：node scripts/verify-mp-runtime.cjs
 * 退出码 0 = 通过，1 = 有注册缺失。
 */

const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");

const distDir = process.env.BEAUTY_MP_OUTPUT_DIR ? path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR) : path.resolve(__dirname, "../dist");

// The package is a self-contained CommonJS mini-program, even when the fresh output
// directory is under the Web repository's type:module scope. Execute its actual bytes;
// do not rename generated files or insert a package.json into the delivery package.
const moduleCache = new Map();
const loadMiniModule = (filename) => {
  const full = path.resolve(filename);
  if (!full.startsWith(distDir + path.sep)) throw new Error("module escaped mini-program output directory");
  if (moduleCache.has(full)) return moduleCache.get(full).exports;
  const mod = { exports: {} };
  moduleCache.set(full, mod);
  const localRequire = (request) => {
    if (!request.startsWith(".")) throw new Error(`unexpected external module: ${request}`);
    let resolved = path.resolve(path.dirname(full), request);
    if (!path.extname(resolved)) resolved += ".js";
    return loadMiniModule(resolved);
  };
  if (full.endsWith(".json")) mod.exports = JSON.parse(fs.readFileSync(full, "utf8"));
  else {
    const wrapped = `(function(exports, require, module, __filename, __dirname) {${fs.readFileSync(full, "utf8")}\n})`;
    new vm.Script(wrapped, { filename: full }).runInThisContext()(mod.exports, localRequire, mod, full, path.dirname(full));
  }
  return mod.exports;
};

if (!fs.existsSync(path.join(distDir, "app.js"))) {
  console.error("Missing dist/app.js — run `npm run mp:build` first.");
  process.exit(1);
}

/* ---------- 最小 wx / 全局 mock ---------- */

const noop = () => ({});
const counts = { App: 0, Page: 0, Component: 0 };

global.wx = {
  webpackJsonp: [],
  getSystemInfoSync: () => ({
    SDKVersion: "3.16.1",
    platform: "devtools",
    windowWidth: 375,
    windowHeight: 667,
    pixelRatio: 2,
    safeArea: { top: 20, bottom: 667, left: 0, right: 375, width: 375, height: 647 },
    statusBarHeight: 20,
    screenWidth: 375,
    screenHeight: 667,
    language: "zh_CN",
    version: "8.0.0",
    theme: "light",
    fontSizeSetting: 16,
    SDK: "3.16.1",
    host: { appId: "wx0000000000000000", env: "development" }
  }),
  getSystemInfo: () => ({ SDKVersion: "3.16.1" }),
  getAccountInfoSync: () => ({
    miniProgram: { appId: "wx0000000000000000", envVersion: "trial" }
  }),
  getStorageSync: () => "",
  setStorageSync: noop,
  removeStorageSync: noop,
  createSelectorQuery: () => ({
    in: () => ({ select: () => ({ boundingClientRect: () => ({ exec: noop }) }) })
  }),
  nextTick: noop,
  request: noop,
  login: noop,
  showToast: () => ({}),
  getNetworkType: () => ({ networkType: "wifi" }),
  onError: noop,
  onUnhandledRejection: noop,
  onPageNotFound: noop,
  env: () => ({ USER_DATA_PATH: path.join(require("node:os").tmpdir(), "mp-verify") }),
  getFileSystemManager: () => ({
    access: noop,
    saveFile: noop,
    removeSavedFile: noop,
    writeFile: noop,
    readFile: noop
  }),
  getUpdateManager: () => ({ onCheckForUpdate: noop, onUpdateReady: noop, applyUpdate: noop }),
  canIUse: () => true,
  setKeepScreenOn: noop,
  vibrateShort: noop,
  stopPullDownRefresh: noop,
  hideTabBar: noop,
  showTabBar: noop,
  setTabBarStyle: noop
};

global.App = (cfg) => { counts.App += 1; global.__app = cfg; };
global.Page = () => { counts.Page += 1; };
global.Component = () => { counts.Component += 1; };
global.Behavior = (cfg) => cfg;
global.getApp = () => global.__app || {};
global.getCurrentPages = () => [];

/** 消费 Taro 的 webpack chunk 队列，否则模块不会真正执行。 */
const drainChunks = () => {
  wx.webpackJsonp.splice(0).forEach((chunk) => {
    try {
      if (typeof chunk === "function") chunk();
    } catch {
      /* chunk 内部错误由各模块自己的断言暴露 */
    }
  });
};

/* ---------- 加载 ---------- */

const appJson = JSON.parse(fs.readFileSync(path.join(distDir, "app.json"), "utf8"));
const expectedPages = appJson.pages.length;
const hasComp = fs.existsSync(path.join(distDir, "comp.js"));

try {
  loadMiniModule(path.join(distDir, "app.js"));
  drainChunks();

  for (const pagePath of appJson.pages) {
    const entry = path.join(distDir, `${pagePath}.js`);
    if (!fs.existsSync(entry)) throw new Error(`missing page entry: ${pagePath}.js`);
    loadMiniModule(entry);
    drainChunks();
  }

  if (hasComp) {
    loadMiniModule(path.join(distDir, "comp.js"));
    drainChunks();
  }
} catch (error) {
  console.error(`✗ dist failed to load: ${error.message}`);
  console.error(error.stack.split("\n").slice(1, 4).join("\n"));
  process.exit(1);
}

/* ---------- 断言 ---------- */

const problems = [];
if (counts.App !== 1) problems.push(`App() called ${counts.App}, expected 1`);
if (counts.Page !== expectedPages) {
  problems.push(`Page() called ${counts.Page}, expected ${expectedPages} (app.json pages)`);
}
if (counts.Component === 0) {
  problems.push(
    "Component() called 0 — the built-in runtime component never registered, which renders a blank page. " +
      "Check that src/app.config.ts does NOT declare usingComponents.custom-wrapper, and that no post-build " +
      "script rewrites comp into custom-wrapper (scripts/fix-custom-wrapper.cjs used to do that)."
  );
}

console.log("=== mp runtime self-check ===");
console.log(`  App()       : ${counts.App}`);
console.log(`  Page()      : ${counts.Page} / ${expectedPages} expected`);
console.log(`  Component() : ${counts.Component}`);
console.log(`  comp.js     : ${hasComp ? "present" : "absent (fine if this project has no custom components)"}`);

if (problems.length > 0) {
  console.log("");
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log("");
console.log("  ✓ registration looks complete");
