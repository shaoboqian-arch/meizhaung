/**
 * 构建后处理：把 WXSS 里的 hsla() 还原成等价的 rgba()。
 *
 * 起因：Taro 4.2 的 CSS 管线会把带透明度的彩色 rgba() 压缩成 hsla(H,S%,L%,A)，
 * 例如 rgba(232,111,92,0.42) → hsla(8,75%,64%,.42)。微信 WXSS 编译器不认这种
 * 带空格的 hsla 语法，上传时以 `unexpected '◆'` 失败。
 *
 * 为什么不在 config 里关压缩：试过 mini.postcss.css.minify.colormin 与顶层
 * minify.csso.enable=false，都不是该转换的执行点（转换在 css-loader 之前的
 * postcss 阶段完成），所以改为在产物上做等价还原 —— 只改颜色表达形式，
 * 视觉完全一致，不动布局与尺寸。
 *
 * 同时把 CSS Grid 的 `repeat(N, minmax(0,1fr))` 换成 `repeat(N, 1fr)` ——
 * 微信 WXSS 编译器不认 minmax()，会同样以解析失败告终。
 *
 * 由 package.json 的 mp:build / mp:dev 在 Taro 构建之后自动执行。
 */

const fs = require("node:fs");
const path = require("node:path");

const distDir = process.env.BEAUTY_MP_OUTPUT_DIR ? path.resolve(process.env.BEAUTY_MP_OUTPUT_DIR) : path.resolve(__dirname, "../dist");

if (!fs.existsSync(distDir)) {
  throw new Error("Missing dist/; run Taro build before normalizing WXSS colors.");
}

/** HSL（h:0-360, s/l:0-100, a:0-1）→ 十六进制 RGB。 */
function hslToRgb(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n) => {
    const value = light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return channel(0) + channel(8) + channel(4);
}

/**
 * 匹配 hsla(...) 并还原为 rgba(r,g,b,a)。
 * 覆盖压缩器可能产出的几种写法：
 *   hsla(8,75%,64%,.42)hsla(8, 75%, 64%, 0.42)hsla(8,75%,64%,42%)
 *   hsla(210,50%,50%,100%)
 */
const HSLA_PATTERN = /hsla\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d*\.?\d+)\s*\)/gi;

const convertCss = (css) =>
  css
    .replace(HSLA_PATTERN, (match, h, s, l, a) => {
      // 饱和度为 0 时是无彩色，直接给灰度值，省去四舍五入误差
      if (Number(s) === 0) {
        const gray = Math.round((Number(l) / 100) * 255);
        const g = gray.toString(16).padStart(2, "0");
        return `rgba(${gray},${gray},${gray},${a})`;
      }
      const rgb = hslToRgb(Number(h), Number(s), Number(l));
      return `rgba(${parseInt(rgb.slice(0, 2), 16)},${parseInt(rgb.slice(2, 4), 16)},${parseInt(rgb.slice(4, 6), 16)},${Number(a)})`;
    })
    // 微信 WXSS 编译器不认 CSS Grid 的 minmax()，repeat(N, minmax(0,1fr)) 直接解析失败。
    // 等价替换为 repeat(N, 1fr)：这里只用于等分列，minmax(0,…) 的防溢出语义不影响布局。
    .replace(/repeat\(\s*(\d+)\s*,\s*minmax\(\s*0(?:px)?\s*,\s*1fr\s*\)\s*\)/g, "repeat($1, 1fr)");

const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".wxss")) out.push(full);
  }
  return out;
};

const files = walk(distDir);
let touched = 0;
let replacements = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = convertCss(before);
  if (after !== before) {
    const count = (before.match(/hsla\(/gi) || []).length;
    replacements += count;
    fs.writeFileSync(file, after);
    touched += 1;
  }
}

if (replacements > 0) {
  console.log(`normalize-wxss-color: rewrote ${replacements} hsla() -> rgba() across ${touched} file(s).`);
} else {
  console.log("normalize-wxss-color: no hsla() found, nothing to do.");
}
