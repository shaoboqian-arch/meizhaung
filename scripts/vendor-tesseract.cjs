// M-04：把 tesseract.js 的运行时（worker + core wasm）从 jsdelivr CDN 改为本地自托管。
// 训练数据（traineddata）体积大且不在 npm 包内，由 download 脚本单独处理，见 scripts/download-tessdata.cjs。
// 升级 tesseract.js 版本后重跑本脚本即可同步产物。
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const coreDir = path.join(root, "node_modules", "tesseract.js-core");
const jsDir = path.join(root, "node_modules", "tesseract.js", "dist");
const outCore = path.join(root, "public", "tesseract", "core");
const outRoot = path.join(root, "public", "tesseract");

// createWorker 默认 oem=LSTM_ONLY，运行时只会加载三个 lstm 变体（按设备 SIMD 能力选择）；
// 非 lstm 变体不拷贝，避免仓库与托管体积无谓膨胀。
const coreVariants = ["lstm", "simd-lstm", "relaxedsimd-lstm"];

for (const dir of [outCore, outRoot]) fs.mkdirSync(dir, { recursive: true });

let copied = 0;
for (const variant of coreVariants) {
  for (const ext of [".wasm.js", ".wasm"]) {
    const src = path.join(coreDir, `tesseract-core-${variant}${ext}`);
    const dest = path.join(outCore, `tesseract-core-${variant}${ext}`);
    if (!fs.existsSync(src)) throw new Error(`missing in node_modules: ${path.basename(src)}`);
    fs.copyFileSync(src, dest);
    copied += 1;
  }
}

const workerSrc = path.join(jsDir, "worker.min.js");
if (!fs.existsSync(workerSrc)) throw new Error("missing dist/worker.min.js");
fs.copyFileSync(workerSrc, path.join(outRoot, "worker.min.js"));
copied += 1;

console.log(`VENDOR_OK ${copied} files -> ${path.relative(root, outRoot)}`);
