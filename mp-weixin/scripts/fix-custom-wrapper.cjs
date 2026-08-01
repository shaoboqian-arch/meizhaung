const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve(__dirname, "../dist");
const requiredFiles = ["comp.js", "comp.wxml"];

for (const file of requiredFiles) {
  const source = path.join(distDir, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing ${file}; run Taro build before fixing custom-wrapper.`);
  }
}

fs.copyFileSync(path.join(distDir, "comp.js"), path.join(distDir, "custom-wrapper.js"));
fs.copyFileSync(path.join(distDir, "comp.wxml"), path.join(distDir, "custom-wrapper.wxml"));

fs.writeFileSync(
  path.join(distDir, "custom-wrapper.json"),
  JSON.stringify({
    component: true,
    styleIsolation: "apply-shared",
    usingComponents: {}
  })
);

fs.writeFileSync(
  path.join(distDir, "comp.json"),
  JSON.stringify({
    component: true,
    styleIsolation: "apply-shared",
    usingComponents: {}
  })
);

const pagesDir = path.join(distDir, "pages");
const walkJsonFiles = (dir) => {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files;
};

for (const jsonPath of walkJsonFiles(pagesDir)) {
  const config = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (config.usingComponents?.comp) {
    delete config.usingComponents.comp;
    fs.writeFileSync(jsonPath, JSON.stringify(config));
  }
}

console.log("custom-wrapper files generated and component refs normalized.");
