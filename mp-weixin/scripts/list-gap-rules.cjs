// 列出产物里所有 gap 声明所属的规则，用于评估替换方案
const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve(__dirname, "../dist");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".wxss")) out.push(full);
  }
  return out;
}

const RULE_RE = /([^{}]+)\{([^{}]*)\}/g;

for (const file of walk(distDir)) {
  const css = fs.readFileSync(file, "utf8");
  let match;
  while ((match = RULE_RE.exec(css)) !== null) {
    const body = match[2];
    const gapMatch = body.match(/gap\s*:\s*([^;}]+)/);
    if (!gapMatch) continue;
    const selector = match[1].split("}").pop().trim().slice(-70);
    const display = /display\s*:\s*grid/.test(body) ? "grid" : "flex";
    const gap = gapMatch[1].trim();
    console.log(
      (file.replace(distDir, "") || "/").padEnd(32) +
        display.padEnd(6) +
        ("gap:" + gap).padEnd(14) +
        " ← " + selector
    );
  }
}