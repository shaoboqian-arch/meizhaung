// Read-only artifact identity and high-confidence secret scan. Never reads auth files or databases.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
const candidate = path.resolve(process.argv[2]);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const file = path.join(dir, e.name);
  return e.isDirectory() ? walk(file) : [file];
});
const manifest = (files, base) => files.map((file) => ({
  path: path.relative(base, file).replaceAll("\\", "/"), bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file))
})).sort((a, b) => a.path.localeCompare(b.path));
const outputFiles = walk(candidate);
const outputs = manifest(outputFiles, candidate);
const sourceFiles = ["mp-weixin/src", "mp-weixin/config", "mp-weixin/scripts", "mp-weixin/tests", "src/data", "src/types"]
  .flatMap((dir) => walk(path.join(root, dir))).concat(["package.json", "package-lock.json", "mp-weixin/tsconfig.json",
    "mp-weixin/.wbapp_t1U4NdF6I0IZdm8LzoMLq6.privacy.json"].map((file) => path.join(root, file)));
const sources = manifest(sourceFiles, root);
const checks = {
  "private-key": /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----/,
  "cloud-secret-id": /AKID[A-Za-z0-9]{28,}/,
  "private-session-token": /(?:wbrt|wbsk)_[A-Za-z0-9_-]{20,}/,
  "jwt-value": /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}/
};
const hits = [];
for (const file of [...sourceFiles, ...outputFiles]) {
  if (!/\.(?:js|cjs|mjs|ts|tsx|json|css|wxss|wxml)$/.test(file)) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const [rule, re] of Object.entries(checks)) if (re.test(content)) hits.push({ file: path.relative(root, file), rule });
}
const bytes = outputs.reduce((sum, file) => sum + file.bytes, 0);
if (bytes > 2 * 1024 * 1024) throw new Error(`Main-package budget exceeded: ${bytes}`);
if (hits.length) throw new Error(`Potential secrets (values not printed): ${JSON.stringify(hits)}`);
const config = JSON.parse(fs.readFileSync(path.join(candidate, "project.config.json"), "utf8"));
if (config.miniprogramRoot !== "./") throw new Error("Candidate must be a self-contained artifact directory");
if (!fs.existsSync(path.join(candidate, ".wbapp_t1U4NdF6I0IZdm8LzoMLq6.privacy.json"))) throw new Error("Missing privacy manifest");
console.log(JSON.stringify({ candidate, files: outputs.length, totalBytes: bytes, maxBytes: 2 * 1024 * 1024,
  artifactManifestSha256: sha(JSON.stringify(outputs)), sourceManifestSha256: sha(JSON.stringify(sources)),
  sourceFiles: sources.length, secretScanHits: hits, publicKeyPolicy: "Existing wbpk publishable key allowed; no private credentials scanned/read",
  keyFiles: outputs.filter((f) => ["app.js", "app.json", "common.js", "common.wxss", "vendors.js", "pages/analysis/index.js"].includes(f.path))
}, null, 2));
