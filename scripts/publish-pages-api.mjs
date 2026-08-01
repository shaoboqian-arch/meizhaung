import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN is required");

const owner = "shaoboqian-arch";
const repository = "meizhaung-pages";
const branch = "gh-pages";
const distDir = path.resolve("dist");
const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const request = async (url, options = {}) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "meizhaung-pages-publisher",
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

const listFiles = async (directory, prefix = "") => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath, relativePath));
    if (entry.isFile()) files.push({ path: relativePath, absolutePath });
  }
  return files;
};

const files = await listFiles(distDir);
files.push({ path: ".nojekyll", content: Buffer.alloc(0) });

const createBlob = async (file) => {
  const content = file.content ?? await readFile(file.absolutePath);
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
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    treeEntries.push(await createBlob(file));
  }
});
await Promise.all(workers);

const currentRef = await request(`${apiRoot}/git/ref/heads/${branch}`);
const tree = await request(`${apiRoot}/git/trees`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tree: treeEntries })
});
const stamp = new Date().toISOString();
const commit = await request(`${apiRoot}/git/commits`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: `Publish tested web build ${stamp}`, tree: tree.sha, parents: [currentRef.object.sha] })
});
await request(`${apiRoot}/git/refs/heads/${branch}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sha: commit.sha, force: false })
});

console.log(`Published ${treeEntries.length} files to ${owner}/${repository}@${branch}: ${commit.sha.slice(0, 7)}`);
