import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN is required");

const owner = "shaoboqian-arch";
const repository = "meizhaung";
const branch = "main";
const projectRoot = path.resolve(".");
const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
const rootFiles = new Set([
  "capacitor.config.ts", "cloudbaserc.json", "index.html", "IOS_PERSONAL_INSTALL.md", "package.json", "package-lock.json",
  "tsconfig.app.json", "tsconfig.json", "tsconfig.node.json", "vite.config.ts"
]);
const rootDirectories = new Set(["src", "public", "mp-weixin", "ios", "scripts", "tests", "cloudfunctions"]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const request = async (url, options = {}) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "meizhaung-source-publisher",
        ...(options.headers ?? {})
      }
    });
    if (response.ok) return response.json();
    const body = await response.text();
    if (attempt === 3 || (response.status < 500 && response.status !== 429)) {
      throw new Error(`${options.method ?? "GET"} ${url} failed (${response.status}): ${body}`);
    }
    await wait(attempt * 2000);
  }
};

const shouldIgnore = (relativePath) => {
  const normalized = relativePath.replaceAll("\\", "/");
  return normalized.split("/").includes(".git") ||
    normalized.split("/").includes("node_modules") ||
    normalized.includes(".backup-") ||
    normalized.startsWith("mp-weixin/dist/") ||
    normalized.startsWith("mp-weixin/.swc/") ||
    normalized.startsWith("mp-weixin/node_modules/") ||
    normalized.startsWith("ios/App/App/public/");
};

const listDirectory = async (directory, prefix) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = `${prefix}/${entry.name}`;
    if (shouldIgnore(relativePath)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listDirectory(absolutePath, relativePath));
    if (entry.isFile()) files.push({ path: relativePath, absolutePath });
  }
  return files;
};

const files = [];
for (const name of rootFiles) {
  files.push({ path: name, absolutePath: path.join(projectRoot, name) });
}
for (const entry of await readdir(projectRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && rootDirectories.has(entry.name)) {
    files.push(...await listDirectory(path.join(projectRoot, entry.name), entry.name));
  }
  if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("github")) {
    files.push({ path: entry.name, absolutePath: path.join(projectRoot, entry.name) });
  }
}

const uniqueFiles = Array.from(new Map(files.map((file) => [file.path.replaceAll("\\", "/"), file])).values());

const createBlob = async (file) => {
  const content = await readFile(file.absolutePath);
  const blob = await request(`${apiRoot}/git/blobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" })
  });
  return { path: file.path.replaceAll("\\", "/"), mode: "100644", type: "blob", sha: blob.sha };
};

const treeEntries = [];
let cursor = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (cursor < uniqueFiles.length) {
    const file = uniqueFiles[cursor];
    cursor += 1;
    treeEntries.push(await createBlob(file));
  }
});
await Promise.all(workers);

const currentRef = await request(`${apiRoot}/git/ref/heads/${branch}`);
const currentCommit = await request(`${apiRoot}/git/commits/${currentRef.object.sha}`);
const tree = await request(`${apiRoot}/git/trees`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ base_tree: currentCommit.tree.sha, tree: treeEntries })
});
const stamp = new Date().toISOString();
const commit = await request(`${apiRoot}/git/commits`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: `Sync tested local project ${stamp}`, tree: tree.sha, parents: [currentRef.object.sha] })
});
await request(`${apiRoot}/git/refs/heads/${branch}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sha: commit.sha, force: false })
});

console.log(`Synced ${treeEntries.length} files to ${owner}/${repository}@${branch}: ${commit.sha.slice(0, 7)}`);
