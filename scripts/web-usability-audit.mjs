import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.argv[2] ?? "http://127.0.0.1:5173/";
const outputDir = path.resolve("output/playwright");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const issues = [];
const steps = [];
let syncCode = "";

const recordStep = async (page, number, name) => {
  const filename = `${String(number).padStart(2, "0")}-${name}.png`;
  await page.waitForFunction(
    () => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
    undefined,
    { timeout: 20_000 }
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outputDir, filename), animations: "disabled" });
  steps.push({ number, name, screenshot: filename, health: "通过" });
};

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "zh-CN",
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => issues.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`));

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "情况", level: 1 }).waitFor();
  await page.getByPlaceholder("输入名称，如：日常护理").fill(`自动回归${Date.now()}`);
  await page.getByRole("checkbox", { name: "带入本机现有选择" }).uncheck();
  await page.getByRole("button", { name: "新建组合" }).click();
  const routineButton = page.locator(".routine-name-button");
  await routineButton.waitFor();
  syncCode = (await routineButton.locator("small").textContent())?.match(/[A-HJ-NP-Z2-9]{6}/)?.[0] ?? "";
  assert.match(syncCode, /^[A-HJ-NP-Z2-9]{6}$/, "未生成有效同步码");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, "情况页存在横向溢出");
  await recordStep(page, 1, "conditions-mobile");

  await page.getByRole("button", { name: /痘多/ }).click();
  await page.getByRole("button", { name: /暗沉/ }).click();
  await page.getByRole("button", { name: /敏感/ }).click();

  await page.getByRole("button", { name: /产品库/ }).click();
  await page.getByRole("heading", { name: "产品库", level: 1 }).waitFor();
  assert.equal(await page.evaluate(() => window.scrollY), 0, "切换到产品库后未回到顶部");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, "产品库存在横向溢出");
  await page.getByPlaceholder("搜索当前分类内的品牌、产品或成分").fill("维生素C");
  assert.ok(await page.locator(".product-card").count(), "产品库搜索无结果");
  await page.getByPlaceholder("搜索当前分类内的品牌、产品或成分").fill("");
  await recordStep(page, 2, "products-mobile");

  await page.getByPlaceholder("从 Open Beauty Facts 查询产品").fill("CeraVe");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await page.locator(".external-status").filter({ hasNotText: "查询中" }).waitFor({ timeout: 30_000 });
  assert.notEqual(await page.locator(".external-status").textContent(), "外部查询失败", "Open Beauty Facts 查询失败");

  const uploadFile = path.join(outputDir, "upload-test.png");
  await writeFile(uploadFile, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXsAAAAASUVORK5CYII=", "base64"));
  await page.locator('input[type="file"]').setInputFiles(uploadFile);
  await page.getByPlaceholder("品牌", { exact: true }).fill("回归测试品牌");
  await page.getByPlaceholder("型号/产品名", { exact: true }).fill("回归测试产品");
  await page.getByPlaceholder(/粘贴或手输成分表/).fill("Niacinamide, Ceramide NP");
  await page.getByRole("button", { name: /添加到产品库/ }).click();
  await page.getByRole("button", { name: /分析/ }).click();
  await page.getByRole("heading", { name: "搭配助手", level: 1 }).waitFor();
  assert.equal(await page.evaluate(() => window.scrollY), 0, "切换到分析页后未回到顶部");
  await page.getByText("回归测试品牌 回归测试产品", { exact: true }).first().waitFor();
  await page.getByRole("heading", { name: "推荐组合" }).waitFor();
  await recordStep(page, 3, "analysis-mobile");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".routine-name-button").waitFor();
  await page.getByRole("button", { name: /分析/ }).click();
  await page.getByText("回归测试品牌 回归测试产品", { exact: true }).first().waitFor();

  await page.getByRole("button", { name: /成分库/ }).click();
  await page.getByRole("heading", { name: "成分库", level: 1 }).waitFor();
  await page.getByPlaceholder("搜索成分、英文名、功效或风险").fill("烟酰胺");
  await page.getByText("烟酰胺", { exact: true }).first().waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, "成分库存在横向溢出");
  await recordStep(page, 4, "ingredients-mobile");

  await page.getByRole("button", { name: /分析/ }).click();
  const currentRows = page.locator(".selected-list").first().locator("button");
  while (await currentRows.count()) await currentRows.first().click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /分析/ }).click();
  assert.equal(await page.getByRole("heading", { name: "推荐组合" }).count(), 0, "空组合仍显示推荐组合");
  await recordStep(page, 5, "empty-combination-mobile");

  await page.evaluate(() => localStorage.clear());
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "zh-CN" });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await desktopPage.getByRole("heading", { name: "情况", level: 1 }).waitFor();
  await desktopPage.getByPlaceholder("6 位同步码").fill(syncCode);
  await desktopPage.getByRole("button", { name: "打开组合" }).click();
  await desktopPage.locator(".routine-name-button").waitFor();
  assert.equal(await desktopPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, "桌面端存在横向溢出");
  await recordStep(desktopPage, 6, "conditions-desktop");
  await desktop.close();
} finally {
  await browser.close();
}

const ignoredIssuePatterns = [
  /favicon\.ico/i,
  /requestfailed: .*net::ERR_ABORTED/i
];
const actionableIssues = issues.filter((issue) => !ignoredIssuePatterns.some((pattern) => pattern.test(issue)));
const report = { targetUrl, passed: actionableIssues.length === 0, steps, issues: actionableIssues };
await writeFile(path.join(outputDir, "web-usability-report.json"), JSON.stringify(report, null, 2), "utf8");
assert.deepEqual(actionableIssues, [], `浏览器发现错误：\n${actionableIssues.join("\n")}`);
console.log(`Web usability audit passed: ${steps.length} steps, ${targetUrl}`);
