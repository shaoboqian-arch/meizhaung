// Read the actual compiled data; do not execute a mini-program bundle or use string-count guesses.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const acorn = require("acorn");
const walk = require("acorn-walk");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "../..");
const output = path.resolve(process.argv[2]);
const source = fs.readFileSync(path.join(root, "src/data/catalog.ts"), "utf8");
const moduleData = { exports: {} };
new Function("module", "exports", esbuild.transformSync(source, { loader: "ts", format: "cjs" }).code)(moduleData, moduleData.exports);
const { products, ingredients } = moduleData.exports;
const readLiteral = (node) => {
  if (node.type === "Literal") return node.value;
  if (node.type === "ArrayExpression") return node.elements.map(readLiteral);
  throw new Error("Not literal catalog data");
};
const compiledProducts = new Map(), compiledIngredients = new Map();
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const stable = (record) => JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b))));
for (const file of files(output).filter((f) => f.endsWith(".js"))) {
  walk.simple(acorn.parse(fs.readFileSync(file, "utf8"), { ecmaVersion: "latest", sourceType: "script" }), {
    ObjectExpression(node) {
      const keys = node.properties.map((p) => p.key?.name ?? p.key?.value);
      const target = ["id", "brand", "model", "category", "ingredientIds"].every((k) => keys.includes(k)) ? compiledProducts
        : ["id", "name", "aliases", "tags", "plainEffect"].every((k) => keys.includes(k)) ? compiledIngredients : null;
      if (!target) return;
      const id = node.properties.find((p) => (p.key?.name ?? p.key?.value) === "id")?.value;
      if (id?.type !== "Literal" || typeof id.value !== "string") return; // Ignore runtime product constructors.
      const value = Object.fromEntries(node.properties.map((p) => [p.key.name ?? p.key.value, readLiteral(p.value)]));
      if (target.has(value.id)) assert.equal(stable(target.get(value.id)), stable(value), `Conflicting compiled record: ${value.id}`);
      target.set(value.id, value);
    }
  });
}
for (const [label, expected, actual] of [["products", products, compiledProducts], ["ingredients", ingredients, compiledIngredients]]) {
  assert.equal(actual.size, expected.length, `${label} count differs`);
  for (const record of expected) assert.equal(stable(actual.get(record.id)), stable(record), `Compiled ${label} differs: ${record.id}`);
}
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
console.log(JSON.stringify({ output, products: compiledProducts.size, ingredients: compiledIngredients.size,
  allRecordsExactlyMatchSource: true, sourceCatalogSha256: sha(source),
  productsSha256: sha(products.map(stable).sort().join("\n")), ingredientsSha256: sha(ingredients.map(stable).sort().join("\n")) }, null, 2));
