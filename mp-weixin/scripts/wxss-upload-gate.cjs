/**
 * 微信 WXSS 上传前硬门禁：扫描产物里微信不接受的语法，命中就**构建失败**。
 *
 * 背景：2026-10-04 一晚上被 `unexpected '◆'` 挡了四次上传。每次报错只给
 * "pos N"，看不出是哪个属性，人工反推位置又慢。微信对 `◆` 的含义是
 * 「**任何**它不接受的属性」—— 一个报错串里的多个 pos 可能指向**不同**语法。
 * 这个脚本把「人工逐轮反推」变成「构建即拦截」。
 *
 * 覆盖清单（均有实测/官方依据）：
 *  - gap                微信全版本不支持
 *  - display: grid      Grid 支持极差
 *  - minmax()           不支持
 *  - hsla(带空格)       Taro 压缩产物形态，微信不认
 *  - CSS 变量 / oklch / color-mix / clamp / sticky / justify-items
 *  - 属性选择器 [xxx]
 *  - 伪元素里的 display:none
 *  - **选择器里的中文标识符** ← 本次上传失败的真正元凶
 *
 * 退出码 1 = 有命中，npm run mp:build 会因此失败。
 */

const fs = require("node:fs");
const path = require("node:path");

const distDir = process.env.BEAUTY_MP_OUTPUT_DIR ? path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR) : path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  console.error("wxss-gate: missing dist/ — run Taro build first.");
  process.exit(1);
}

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".wxss")) out.push(full);
  }
  return out;
};

/** 每条规则：[正则, 说明, 是否只看声明部分] */
const CHECKS = [
  [/(^|[;"{\s])gap\s*:/i, "gap 属性（微信全版本不支持，用子项 margin 替代）"],
  [/display\s*:\s*grid/i, "display:grid（微信 Grid 支持极差，改 flex+wrap）"],
  [/minmax\(/i, "minmax()（不支持，用 1fr）"],
  [/hsla\(\s*-?[\d.]+\s*,\s*[\d.]+%\s*,/i, "带空格的 hsla()（Taro 压缩产物，改 rgba）"],
  [/(^|[;"{\s])--[\w-]+\s*:/i, "CSS 自定义属性 var 支持不稳定"],
  [/\bvar\(\s*--/i, "var(--x) 变量引用（微信支持不稳定）"],
  [/\boklch\(/i, "oklch()（不支持）"],
  [/color-mix\(/i, "color-mix()（不支持）"],
  [/\bclamp\(/i, "clamp()（不支持）"],
  [/position\s*:\s*sticky/i, "position:sticky（改用 sticky-header 组件）"],
  [/justify-items\s*:/i, "justify-items（不支持）"],
  [/[^{};,]*\[[a-z-]+\]\s*\{/i, "属性选择器 [xxx]（微信支持不稳定）"],
  [/::(before|after)\s*\{[^{}]*display\s*:\s*none/i, "伪元素里的 display:none（整条规则被拒）"]
];

const CJK = /[㐀-䶿一-鿿豈-﫿]/;

const problems = [];
const files = walk(distDir);

for (const file of files) {
  const rel = file.replace(distDir, "") || "/";
  const css = fs.readFileSync(file, "utf8");

  for (const [re, label] of CHECKS) {
    const match = css.match(re);
    if (match) {
      problems.push({ rel, label, at: css.slice(0, match.index).length + 1 });
    }
  }

  // 选择器里的中文标识符：逐条规则扫选择器部分
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let rule;
  while ((rule = ruleRe.exec(css)) !== null) {
    const selector = rule[1].split("}").pop().trim();
    if (!CJK.test(selector)) continue;
    const hit = selector.match(new RegExp(`[${CJK.source}]`)) || selector.match(/./g);
    problems.push({
      rel,
      label: `选择器含中文标识符：…${selector.slice(Math.max(0, rule[1].length - 60)).trim()}…`,
      at: rule.index + 1
    });
    break; // 每文件只报一次，避免刷屏
  }
}

console.log("=== wxss upload gate ===");
console.log(`  scanned ${files.length} wxss file(s)`);

if (problems.length === 0) {
  console.log("  ✓ no known-incompatible syntax found");
  process.exit(0);
}

console.log("");
for (const p of problems) {
  console.error(`  ✗ ${p.rel} @${p.at}  ${p.label}`);
}
console.error("");
console.error(`  ${problems.length} problem(s). 微信会报unexpected '◆'，必须先修完再发布。`);
process.exit(1);
