/**
 * 清理微信 WXSS 编译器不接受的剩余语法。
 *
 * 与 replace-wxss-gap / normalize-wxss-color 同属「构建后处理」系列，
 * 由 package.json 的 mp:build 串在 Taro 构建之后执行。
 *
 * 处理三类：
 *
 * 1) `display: grid` → `flex` + flex-wrap
 *    微信对 CSS Grid 支持极差。.condition-grid 是两列等分列表，
 *    用 flex 换行实现；同步区源码已改为原生 flex，不再补丁转换：
 *    子项设 `width: calc((100% - 总间距) / 列数)`。
 *
 * 2) 纯隐藏用途的伪元素规则（`::after{display:none}`）→ 直接删除
 *    装饰本体必须在源码取消，不能只删隐藏规则后保留本体。
 *    .top 的旧绿色装饰已在源码取消，避免真机重新露出。
 *
 * 3) 真实装饰伪元素（`.top::before` 的径向渐变、`.skin-hero::before`）
 *    **保留不动** —— 它们是页面视觉的一部分，删掉页面会明显变样。
 *    微信对 `::before` 的支持虽弱于标准，但对单个简单装饰元素通常可渲染；
 *    真机若不显示，再按元素包裹的方式改写，不在这里冒险改视觉。
 *
 * 4) 属性选择器 `[disabled]` → 微信对属性选择器支持不稳定，
 *    换成 Taro 会自动生成的 `button[aria-disabled]` 无意义，
 *    这里改为略去透明度差异（同步禁用态由 JS 控制按钮 disabled 属性，
 *    视觉退化可接受），避免整条规则解析失败。
 */

const fs = require("node:fs");
const path = require("node:path");

const distDir = process.env.BEAUTY_MP_OUTPUT_DIR ? path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR) : path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  throw new Error("Missing dist/; run Taro build before normalizing WXSS.");
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

/* ---------- grid → flex ---------- */

/**
 * grid 换 flex 的等分实现。
 * columns=2, gapPx=14 → 子项 width: calc((100% - 28rpx) / 2)
 * columns=3, gapPx=12 → 子项 width: calc((100% - 24rpx) / 3)
 */
const GRID_RULES = [
  { selector: ".condition-grid", columns: 2, gapPx: 14, child: ">.condition-switch" }
];

const replaceGrid = (css) => {
  const additions = [];
  for (const rule of GRID_RULES) {
    const re = new RegExp(
      `${rule.selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`
    );
    const match = css.match(re);
    if (!match) continue;

    let body = match[1];
    if (!/display\s*:\s*grid/.test(body)) continue;

    // display:grid → flex + 换行；删掉 grid-template-columns
    body = body.replace(/display\s*:\s*grid/g, "display:flex;flex-wrap:wrap");
    body = body.replace(/grid-template-columns\s*:[^;}]+;?/g, "");

    css = css.replace(re, `${rule.selector}{${body}}`);

    const totalGap = rule.gapPx * 2 * (rule.columns - 1);
    const width = `calc((100% - ${totalGap}rpx)/${rule.columns})`;
    // 横向间距靠子项 margin-right（奇数列之外的都补）
    const childSel =
      rule.child.startsWith(">")
        ? `${rule.selector}${rule.child}`
        : `${rule.selector}>${rule.child.slice(1)}`;
    additions.push(
      `${childSel}{width:${width};margin-right:${rule.gapPx * 2}rpx}`
    );
    // 末列/末行不补，避免多出宽度
    additions.push(
      `${childSel}:nth-child(${rule.columns}n){margin-right:0}`
    );
  }
  if (additions.length > 0) css = css.trimEnd() + additions.join("");
  return css;
};

/* ---------- 伪元素 / 属性选择器 ---------- */

const stripUnsupported = (css) =>
  css
    // display:none 的伪元素规则 —— 空操作，直接删
    .replace(/[^{};]*::(before|after)\s*\{[^{}]*display\s*:\s*none[^{}]*\}/g, "")
    // 属性选择器：微信支持不稳定，整条删掉
    .replace(/[^{};]*\[disabled\]\s*\{[^{}]*\}/g, "");

let changed = 0;
for (const file of walk(distDir)) {
  const before = fs.readFileSync(file, "utf8");
  let after = stripUnsupported(before);
  after = replaceGrid(after);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
  }
}

/* ---------- 校验 ---------- */

const remaining = { grid: 0, attr: 0, hiddenPseudo: 0 };
for (const file of walk(distDir)) {
  const css = fs.readFileSync(file, "utf8");
  remaining.grid += (css.match(/display\s*:\s*grid/g) || []).length;
  remaining.attr += (css.match(/\[[a-z-]+\]\s*\{/g) || []).length;
  remaining.hiddenPseudo += (css.match(/::(before|after)\s*\{[^{}]*display\s*:\s*none/g) || []).length;
}

console.log(`normalize-wxss-syntax: rewrote ${changed} file(s).`);
console.log(
  `  leftover → display:grid ${remaining.grid}, attribute-selector ${remaining.attr}, hidden-pseudo ${remaining.hiddenPseudo}`
);
