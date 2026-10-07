// M-04：下载 tesseract 训练数据（createWorker 默认 LSTM_ONLY → jsdelivr 的 4.0.0_best_int 版）。
// 下载后进 public/tesseract/lang/，随静态托管分发，运行时不再访问 tessdata CDN。
// 用法：node scripts/download-tessdata.cjs
const fs = require("node:fs");
const path = require("node:path");

const outDir = path.resolve(__dirname, "..", "public", "tesseract", "lang");
fs.mkdirSync(outDir, { recursive: true });

const sources = [
  // jsdelivr 语义：/npm/@scope/pkg/<包内目录>/<文件名>（版本省略取 latest）
  ["eng", "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"],
  ["chi_sim", "https://cdn.jsdelivr.net/npm/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz"],
];

const minBytes = 1024 * 1024; // 训练数据至少应是 MB 级，防止把 CDN 错误页存成文件

async function main() {
  for (const [lang, url] of sources) {
    const dest = path.join(outDir, `${lang}.traineddata.gz`);
    if (fs.existsSync(dest) && fs.statSync(dest).size >= minBytes) {
      console.log(`SKIP ${lang} (${(fs.statSync(dest).size / 1048576).toFixed(1)} MB already present)`);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minBytes) throw new Error(`${lang}: response too small (${buf.length} B)`);
    fs.writeFileSync(dest, buf);
    console.log(`OK ${lang} ${(buf.length / 1048576).toFixed(1)} MB`);
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
