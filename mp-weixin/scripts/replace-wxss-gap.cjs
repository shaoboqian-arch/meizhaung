/**
 * 把产物 WXSS 里的 `gap` 换成等价的子项 margin。
 *
 * 起因：微信 WXSS 编译器不支持 `gap`，上传时以 `unexpected '◆'` 失败。
 * 报错位置会精确落在 `gap:` 那个字符上（实测 pos 2770 / 1185 都落在 gap 上）。
 *
 * 为什么不能直接删：gap 是布局语义，删掉会让子项贴死。
 * 所以为每个用gap 的父规则**补一条完整选择器的 margin 规则**（父 + 子都写全），
 * 视觉效果等价，且选择器作用域明确、不会互相污染。
 *
 * 值取自源码里同规则的 gap（px），乘 2 换算成 rpx（750 设计稿）。
 * 逐条人工核对过源码结构；不写通用模式匹配 —— 多行 flex 上通用做法会产生
 * 与 gap 不一致的间距，比留gap 更糟。
 */

const fs = require("node:fs");
const path = require("node:path");

const distDir = process.env.BEAUTY_MP_OUTPUT_DIR ? path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR) : path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  throw new Error("Missing dist/; run Taro build before rewriting gap.");
}

const px = (n) => `${n * 2}rpx`;

/**
 * 规则表。每一项 = 一个父规则补一条 margin 规则。
 * childFull 是**完整**选择器（从父选择器起写），保证作用域精确。
 */
const RULES = [
  // ---------- page.css ----------
  // .card-head:单行 flex + space-between，gap 只做最小间隔 → 补右间距
  {
    parent: ".card-head",
    childFull: ".card-head>view:not(:last-child),.card-head>text:not(:last-child)",
    decls: [["margin-right", px(18)]]
  },
  // .tag-row: 多行 flex → 右 + 下间距
  {
    parent: ".tag-row",
    childFull: ".tag-row>view:not(:last-child),.tag-row>text:not(:last-child)",
    decls: [
      ["margin-right", px(8)],
      ["margin-bottom", px(6)]
    ]
  },
  // .ingredient-filter-row: 多行 flex
  {
    parent: ".ingredient-filter-row",
    childFull: ".ingredient-filter-row>view:not(:last-child),.ingredient-filter-row>text:not(:last-child)",
    decls: [
      ["margin-right", px(10)],
      ["margin-bottom", px(10)]
    ]
  },
  // .grid-tabs: 多行 flex
  {
    parent: ".grid-tabs",
    childFull: ".grid-tabs>view:not(:last-child),.grid-tabs>text:not(:last-child)",
    decls: [
      ["margin-right", px(12)],
      ["margin-bottom", px(12)]
    ]
  },

  // ---------- pages/analysis ----------
  {
    parent: ".coverage-head",
    childFull: ".coverage-head>view:not(:last-child),.coverage-head>text:not(:last-child)",
    decls: [["margin-right", px(8)]]
  },

  // ---------- pages/conditions ----------
  // .condition-grid / .cloud-actions 是 grid，横向间距由 normalize-wxss-syntax.cjs
  // 统一转 flex 等分时一并处理（子项 width + margin-right），此处不重复注入，
  // 否则会出现双倍间距。
  // Condition card / caption spacing is explicit in source CSS (no gap).
  // Do not inject the retired fixed margins over the image-first layout.

  // ---------- pages/products ----------
  {
    parent: ".product-actions",
    childFull: ".product-actions>view:not(:last-child),.product-actions>button:not(:last-child)",
    decls: [["margin-right", px(12)]]
  },
  {
    parent: ".upload-empty",
    childFull: ".upload-empty>view:not(:last-child),.upload-empty>text:not(:last-child)",
    decls: [["margin-right", px(12)]]
  }
];

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".wxss")) out.push(full);
  }
  return out;
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let gapCount = 0;
let injected = 0;
const skipped = [];
const files = walk(distDir);

for (const file of files) {
  let css = fs.readFileSync(file, "utf8");
  const original = css;

  // 1) 去掉所有 gap 声明
  gapCount += (css.match(/(^|[;"{\s])gap\s*:/g) || []).length;
  css = css.replace(/(^|[;"{\s])gap\s*:\s*[^;}]+;?/g, "$1");

  // 2) 逐条补margin 规则（插在文件末尾，避免影响前面的匹配）
  const additions = [];
  for (const rule of RULES) {
    const parentRe = new RegExp(`(?:^|[}{;])${escapeRe(rule.parent)}\\s*\\{`);
    if (!parentRe.test(css)) continue; // 该文件里没有这个父规则

    const body = rule.decls.map(([p, v]) => `${p}:${v}`).join(";");
    const line = `${rule.childFull}{${body}}`;
    if (css.includes(line)) continue; // 已补过
    additions.push(line);
  }

  if (additions.length > 0) {
    css = css.trimEnd() + additions.join("");
    injected += additions.length;
  }

  if (css !== original) fs.writeFileSync(file, css);
}

/* 校验：产物里不该再出现以 > 开头的悬空选择器 */
const files2 = walk(distDir);
const dangling = [];
for (const file of files2) {
  const css = fs.readFileSync(file, "utf8");
  if (/[}{;]>/.test(css)) dangling.push(file.replace(distDir, ""));
}

console.log(`replace-wxss-gap: removed ${gapCount} gap, injected ${injected} margin rule(s) across ${files.length} file(s).`);
if (dangling.length > 0) {
  console.warn(`  ⚠ dangling child selectors remain in: ${dangling.join(", ")}`);
} else {
  console.log("  ✓ no dangling child selectors");
}
