const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "beauty-mp-interactions-"));
const miniOutput = process.env.BEAUTY_MP_OUTPUT_DIR;
if (!miniOutput) throw new Error("Set BEAUTY_MP_OUTPUT_DIR to the verified fresh mini-program output; source CSS is not acceptance evidence");
const postcss = require("postcss");
const cssFiles = ["app.wxss", "pages/analysis/index.wxss", "pages/products/index.wxss", "pages/conditions/index.wxss"]
  .map((file) => path.join(miniOutput, file)).filter((file) => fs.existsSync(file));
if (!cssFiles.length) throw new Error("Missing compiled WXSS");
const importedCssFiles = new Set();
const inlineCss = (file) => {
  if (importedCssFiles.has(file)) return "";
  importedCssFiles.add(file);
  const css = postcss.parse(fs.readFileSync(file, "utf8"));
  css.walkAtRules("import", (rule) => {
    const match = rule.params.match(/^["']([^"']+)["']$/);
    if (!match || !match[1].startsWith(".")) throw new Error(`Unexpected CSS import: ${rule.params}`);
    const target = path.resolve(path.dirname(file), match[1]);
    if (!target.startsWith(path.resolve(miniOutput) + path.sep)) throw new Error("CSS import escaped candidate");
    rule.replaceWith(postcss.parse(inlineCss(target)).nodes);
  });
  return css.toString();
};
const productionCss = cssFiles.map(inlineCss).join("\n");
const previewCss = (width) => {
  const css = postcss.parse(productionCss);
  const tags = { view: "div", text: "span", image: "img", page: "body", picker: "select" };
  css.walkRules((rule) => { rule.selector = rule.selector.replace(/(?<![\w.#-])(view|text|image|page|picker)(?![\w-])/g, (tag) => tags[tag]); });
  return css.toString().replace(/(-?\d*\.?\d+)rpx/g, (_match, value) => `${Number(value) * Math.min(width, 430) / 750}px`);
};
(async () => {
  await esbuild.build({
    entryPoints: [path.join(root, "mp-weixin/tests/interaction-preview.tsx")],
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    outfile: path.join(out, "preview.js"), loader: { ".png": "file" },
    tsconfig: path.join(root, "mp-weixin/tsconfig.json"),
    plugins: [{ name: "offline-mini-boundaries", setup(build) {
      const mocks = { "@tarojs/taro": "taro.ts", "@tarojs/components": "components.tsx",
        "@tencent-ai/workbuddy-cloud-sdk/miniprogram": "sdk.ts" };
      build.onResolve({ filter: /^(@tarojs\/(taro|components)|@tencent-ai\/workbuddy-cloud-sdk\/miniprogram)$/ },
        (args) => ({ path: path.join(root, "mp-weixin/tests/mocks", mocks[args.path]) }));
    } }]
  });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const name = url.pathname;
    if (name === "/mini.css") { res.setHeader("Content-Type", "text/css"); res.end(previewCss(Number(url.searchParams.get("width")) || 390)); return; }
    if (name === "/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      // Native button defaults BEFORE the real compiled WXSS: the old test's border:0 masked WeChat's ::after outline.
      res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小程序组件交互模拟</title><style>body{margin:0;background:#fbf6ef;color:#322721;font-family:sans-serif}#root{max-width:430px;margin:auto}*{box-sizing:border-box}button{position:relative;display:block;margin-left:auto;margin-right:auto;padding:0 14px;border:0;border-radius:5px;line-height:2.55555556;background:#f8f8f8;text-align:center}button::after{content:" ";position:absolute;top:0;left:0;width:200%;height:200%;transform:scale(.5);transform-origin:0 0;border:1px solid rgba(0,0,0,.2);border-radius:10px;box-sizing:border-box}</style><link rel="stylesheet" href="/mini.css?width=${Number(url.searchParams.get("width")) || 390}"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>`);
      return;
    }
    if (name === "/favicon.ico") { res.writeHead(204); res.end(); return; }
    const file = path.resolve(out, `.${name}`);
    if (!file.startsWith(out + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader("Content-Type", file.endsWith(".css") ? "text/css" : file.endsWith(".png") ? "image/png" : "application/javascript");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = []; const externalRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.route("**/*", (route) => {
        if (new URL(route.request().url()).hostname !== "127.0.0.1") { externalRequests.push(route.request().url()); return route.abort(); }
        return route.continue();
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/?width=${width}`);
      await page.locator(".analysis-group.caution").waitFor();
      await page.locator(".page").evaluate(async (e) => { await Promise.all(e.getAnimations({ subtree: true }).filter((a) => a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished)); });
      const disclosureGeometry = await page.locator(".disclosure-toggle").evaluateAll((buttons) => buttons.map((button) => {
        const label = button.querySelector(".disclosure-label"); const a = button.getBoundingClientRect(); const b = label.getBoundingClientRect();
        return { right: b.right, centerDelta: Math.abs((a.top + a.bottom - b.top - b.bottom) / 2), border: getComputedStyle(button, "::after").borderTopWidth };
      }));
      assert.ok(disclosureGeometry.every((g) => Math.abs(g.right - disclosureGeometry[0].right) < 1 && g.centerDelta < 1 && g.border === "0px"), JSON.stringify(disclosureGeometry));
      const flatRows = await page.locator(".analysis-group,.coverage-card,.recommend-card").evaluateAll((rows) => rows.every((row) => ["Top", "Right", "Bottom", "Left"].every((edge) => getComputedStyle(row)[`border${edge}Width`] === "0px") && getComputedStyle(row).boxShadow === "none"));
      assert.equal(flatRows, true);
      assert.equal(await page.locator(".top").evaluate((e) => getComputedStyle(e, "::after").content), "none");
      const counts = await page.locator(".panel").evaluateAll((panels) => panels.filter((p) => /^(白话分析|针对情况的推荐)/.test(p.textContent)).map((p) => p.querySelector(".section-title").lastChild.textContent));
      assert.ok(counts.length === 2 && counts.every((s) => /^共 \d+ 项$/.test(s)));
      assert.equal(await page.locator(".disclosure-body").count(), 0);
      assert.equal(await page.locator(".scene-recommendation .disclosure").count(), 0);
      assert.equal(await page.locator(".scene-recommendation .alternative-row,.scene-recommendation .selection-explanation,.scene-recommendation .scene-advantages").count(), 0);
      assert.equal(await page.locator(".scene-other-notes").count(), 1);
      assert.equal(await page.locator(".scene-other-notes .disclosure-toggle").count(), 1);
      assert.equal(await page.locator(".scene-other-notes .disclosure-body").count(), 0);
      assert.ok(await page.locator(".scene-other-notes").evaluate((e) => e.previousElementSibling.classList.contains("scene-recommendation")));
      const originalSelection = await page.locator(".selected-row .card-title").allTextContents();
      const recommendationNames = () => page.locator(".recommend-card > .card-head > .card-title").allTextContents();
      const morningNames = await recommendationNames();
      await page.getByRole("button", { name: "晚间", exact: true }).click();
      await page.getByText("晚间推荐组合", { exact: true }).waitFor();
      assert.deepEqual(await page.locator(".selected-row .card-title").allTextContents(), originalSelection);
      assert.ok(!(await page.locator(".recommend-card .card-meta").allTextContents()).includes("防晒"));
      assert.equal(await page.locator(".disclosure-body").count(), 0);
      await page.screenshot({ path: path.join(out, `evening-${width}.png`), fullPage: true, animations: "disabled" });
      await page.locator(".scene-other-disclosure > .disclosure-toggle").click();
      await page.locator(".scene-other-notes .selection-explanation .other-note-heading").waitFor();
      // An empty advantages list must not be padded with a fictitious explanation.
      const advantages = page.locator(".scene-other-notes .scene-advantages");
      if (await advantages.count()) {
        await advantages.locator(".other-note-heading").waitFor();
        assert.ok(await advantages.locator(".advantage").count() > 0);
      }
      await page.locator(".scene-other-notes .scene-alternatives .other-note-heading").waitFor();
      assert.equal(await page.locator(".scene-other-notes .disclosure-toggle").count(), 1, "Do not introduce nested explanation switches");
      const noteLayout = await page.locator(".scene-other-notes").evaluate((panel) => {
        const sections = [...panel.querySelectorAll(".other-note-section")];
        const rows = [...panel.querySelectorAll(".other-selection-row,.alternative-row")];
        return {
          sectionGaps: sections.slice(1).map((section, index) => section.getBoundingClientRect().top - sections[index].getBoundingClientRect().bottom),
          rows: rows.map((row) => {
            const head = row.querySelector(".other-product-head"), title = row.querySelector(".other-product-name"), body = row.querySelector(".other-note-body");
            const a = head.getBoundingClientRect(), b = body.getBoundingClientRect();
            const heading = row.parentElement.querySelector(".other-note-heading");
            const button = row.querySelector(".alternative-replace");
            return { titleBelowGroup: title.getBoundingClientRect().top > heading.getBoundingClientRect().bottom,
              fontHierarchy: parseFloat(getComputedStyle(heading).fontSize) > parseFloat(getComputedStyle(title).fontSize) && parseFloat(getComputedStyle(title).fontSize) > parseFloat(getComputedStyle(body).fontSize),
              bodyOnNewLine: b.top - a.bottom >= 3, bodyAligned: Math.abs(b.left - a.left) < 1,
              categorySeparate: Boolean(head.querySelector(".other-product-category")),
              bodyFits: body.scrollWidth <= body.clientWidth + 1,
              noFrame: getComputedStyle(row).borderTopWidth === "0px" && getComputedStyle(row).boxShadow === "none",
              actionNextToName: !button || (button.getBoundingClientRect().left - title.getBoundingClientRect().right >= 4 && button.getBoundingClientRect().left - title.getBoundingClientRect().right <= 10),
              actionBeforeCategory: !button || button.getBoundingClientRect().right <= head.querySelector(".other-product-category").getBoundingClientRect().left + 1,
              actionInTitleRow: !button || head.contains(button),
              actionTextOnly: !button || (getComputedStyle(button).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(button).borderRadius === "0px" && getComputedStyle(button, "::after").borderTopWidth === "0px"),
              actionRecognizable: !button || getComputedStyle(button).textDecorationLine.includes("underline") };
          })
        };
      });
      assert.ok(noteLayout.sectionGaps.every((gap) => gap >= 16), JSON.stringify(noteLayout));
      assert.ok(noteLayout.rows.every((row) => Object.values(row).every(Boolean)), JSON.stringify(noteLayout));
      await page.locator(".scene-other-notes").screenshot({ path: path.join(out, `other-notes-expanded-${width}.png`), animations: "disabled" });
      const replacement = page.locator(".alternative-row").filter({ has: page.getByRole("button", { name: "改用这款", exact: true }) }).first();
      const replacementName = await replacement.locator(".card-title").textContent();
      await replacement.getByRole("button", { name: "改用这款", exact: true }).click();
      assert.ok((await recommendationNames()).includes(replacementName));
      assert.deepEqual(await page.locator(".selected-row .card-title").allTextContents(), originalSelection);
      await page.getByRole("button", { name: "早间", exact: true }).click();
      assert.deepEqual(await recommendationNames(), morningNames);
      assert.equal(await page.locator(".disclosure-body").count(), 0);
      await page.getByRole("button", { name: "晚间", exact: true }).click();
      assert.ok((await recommendationNames()).includes(replacementName));
      await page.locator(".scene-other-disclosure > .disclosure-toggle").click();
      await page.getByRole("button", { name: "恢复自动取舍", exact: true }).click();
      await page.getByRole("button", { name: "早间", exact: true }).click();
      const cautionY = await page.locator(".analysis-group.caution").evaluate((e) => e.getBoundingClientRect().top);
      const cooperationY = await page.locator(".analysis-group.match").evaluate((e) => e.getBoundingClientRect().top);
      assert.ok(cautionY < cooperationY);
      const statuses = await page.locator(".coverage-card .card-title").allTextContents();
      const rank = (s) => s.includes("推荐补入") ? 0 : s.includes("暂未覆盖") ? 1 : 2;
      assert.deepEqual(statuses.map(rank), [...statuses.map(rank)].sort((a, b) => a - b));
      await page.locator(".analysis-group.caution button").click();
      assert.ok(await page.locator(".analysis-group.caution .disclosure-body").isVisible());
      await page.locator(".analysis-group.caution button").click();
      assert.equal(await page.locator(".disclosure-body").count(), 0);
      await page.locator(".analysis-group.match button").click();
      assert.ok(await page.locator(".analysis-group.match .disclosure-body").isVisible());
      await page.locator(".analysis-group.match button").click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      assert.equal(overflow, false);
      await page.screenshot({ path: path.join(out, `analysis-${width}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "我的", exact: true }).click();
      await page.getByText("账号与同步", { exact: true }).waitFor();
      await page.getByRole("button", { name: "保存", exact: true }).waitFor();
      await page.getByRole("button", { name: "读取", exact: true }).waitFor();
      assert.deepEqual(await page.locator(".account-panel button").allTextContents(), ["保存", "读取"]);
      await page.screenshot({ path: path.join(out, `account-initial-${width}.png`), fullPage: true, animations: "disabled" });
      const originalConcerns = await page.locator(".condition-switch.active .condition-name").allTextContents();
      // The SDK mock refuses actual database traffic: exercise failure retention on both real UI actions.
      for (const action of ["保存", "读取"]) {
        await page.getByRole("button", { name: action, exact: true }).click();
        await page.getByRole("button", { name: action, exact: true }).waitFor({ state: "visible" });
        await page.waitForFunction(() => [...document.querySelectorAll(".account-panel button")].every((button) => !button.disabled));
        assert.deepEqual(await page.locator(".condition-switch.active .condition-name").allTextContents(), originalConcerns);
        assert.match(await page.locator(".cloud-status").textContent(), /失败|保留|不可用/);
      }
      const pair = await page.locator(".cloud-pair .cloud-action").evaluateAll((buttons) => buttons.map((b) => ({ width: b.getBoundingClientRect().width, top: b.getBoundingClientRect().top })));
      assert.ok(Math.abs(pair[0].width - pair[1].width) < 1 && Math.abs(pair[0].top - pair[1].top) < 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await page.locator(".page").evaluate(async (e) => { await Promise.all(e.getAnimations({ subtree: true }).filter((a) => a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished)); });
      const conditionCards = await page.locator(".condition-grid > .condition-switch").evaluateAll((cards) => cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      }));
      assert.ok(conditionCards.length > 4);
      assert.ok(conditionCards[0].right < conditionCards[1].left, "Keep two distinct columns");
      const conditionRowGaps = conditionCards.slice(2).map((card, index) => {
        assert.ok(Math.abs(card.left - conditionCards[index].left) < 1, "Preserve column alignment");
        return card.top - conditionCards[index].bottom;
      });
      assert.ok(conditionRowGaps.every((gap) => gap >= 9), `Condition rows touch: ${JSON.stringify(conditionRowGaps)}`);
      const conditionImageLayout = await page.locator(".condition-grid > .condition-switch").evaluateAll((cards) => cards.map((card) => {
        const rect = card.getBoundingClientRect();
        const frame = card.querySelector(".condition-illustration").getBoundingClientRect();
        const copy = card.querySelector(".condition-copy");
        const name = card.querySelector(".condition-name").getBoundingClientRect();
        const desc = card.querySelector(".condition-desc");
        const description = desc.getBoundingClientRect();
        const image = card.querySelector(".condition-image");
        return { imageWidthRatio: frame.width / rect.width, imageHeightRatio: frame.height / rect.height,
          imageAboveCopy: frame.bottom <= name.top,
          textCentered: getComputedStyle(copy).textAlign === "center" && getComputedStyle(desc).textAlign === "center" &&
            Math.abs((name.left + name.right - rect.left - rect.right) / 2) < 1,
          captionInside: description.bottom <= rect.bottom && description.right <= rect.right,
          noReservedDescriptionRow: getComputedStyle(desc).minHeight === "0px",
          imageFillsFrame: getComputedStyle(image).objectFit === "cover",
          bottomPaddingPx: rect.bottom - description.bottom,
          descriptionUnclipped: desc.scrollWidth <= desc.clientWidth + 1 && desc.scrollHeight <= desc.clientHeight + 1 };
      }));
      assert.ok(conditionImageLayout.every((card) => card.imageWidthRatio >= 0.9 && card.imageHeightRatio >= 0.7 &&
        card.imageAboveCopy && card.textCentered && card.captionInside && card.descriptionUnclipped &&
        card.noReservedDescriptionRow && card.imageFillsFrame && card.bottomPaddingPx <= 9),
        `Image-first card layout failed: ${JSON.stringify(conditionImageLayout)}`);
      await page.screenshot({ path: path.join(out, `account-${width}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "产品", exact: true }).click();
      await page.locator(".product-card").first().waitFor();
      assert.equal(await page.locator(".product-card").count(), 24);
      await page.getByText("766 个", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "查看产品详情", exact: true }).count(), 0);
      assert.equal(await page.locator(".product-title-link").count(), 24);
      await page.screenshot({ path: path.join(out, `products-${width}.png`), fullPage: false, animations: "disabled" });
      await page.getByRole("button", { name: "继续加载", exact: true }).click();
      assert.equal(await page.locator(".product-card").count(), 48);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await page.getByRole("button", { name: "防晒", exact: true }).click();
      assert.ok((await page.locator(".product-card .card-meta").allTextContents()).every((s) => s === "防晒"));
      await page.getByPlaceholder("跨分类搜索品牌、产品或成分").fill("Retinol");
      assert.ok(await page.locator(".product-card").count() > 0);
      assert.ok((await page.locator(".product-card .card-meta").allTextContents()).some((s) => s !== "防晒"));
      await page.getByPlaceholder("跨分类搜索品牌、产品或成分").fill("阿达帕林");
      const medicine = page.locator(".product-card").filter({ hasText: "达芙文 阿达帕林凝胶0.1%" });
      await medicine.getByText("用药信息待核对 · 不参与自动推荐", { exact: true }).waitFor();
      await medicine.locator(".select-corner").click();
      await medicine.getByRole("button", { name: "达芙文 阿达帕林凝胶0.1%", exact: true }).click();
      await page.locator(".recommendation-restriction").waitFor();
      assert.match(await page.locator(".recommendation-restriction").textContent(), /不参与自动护肤推荐/);
      await page.getByRole("button", { name: "从当前搭配移除", exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await page.getByRole("button", { name: "搭配", exact: true }).click();
      const medicineName = "达芙文 阿达帕林凝胶0.1%";
      await page.locator(".selected-row").filter({ hasText: medicineName }).waitFor();
      for (const scene of ["早间", "晚间"]) {
        await page.getByRole("button", { name: scene, exact: true }).click();
        assert.ok(!(await recommendationNames()).includes(medicineName));
        await page.getByText("已选条目中有用药信息待核对项，仅保留记录，不排入早晚护肤方案；白话分析不构成用药建议。", { exact: true }).waitFor();
        await page.locator(".scene-other-disclosure > .disclosure-toggle").click();
        const blocked = page.locator(".alternative-row").filter({ hasText: medicineName });
        assert.match(await blocked.textContent(), /不参与自动护肤推荐/);
        assert.equal(await blocked.getByRole("button", { name: "改用这款", exact: true }).count(), 0);
      }
      await page.screenshot({ path: path.join(out, `medicine-gate-${width}.png`), fullPage: true, animations: "disabled" });
      await page.getByRole("button", { name: "产品", exact: true }).click();
      await page.getByRole("button", { name: "添加我的产品", exact: true }).click();
      await page.getByPlaceholder("品牌", { exact: true }).fill("合成测试");
      await page.getByPlaceholder("型号/产品名", { exact: true }).fill("本机结构验收");
      const textField = page.getByPlaceholder("粘贴或手输成分表，例如：Niacinamide, Retinol, Ceramide NP");
      await textField.fill("Niacinamide; Mystery Extract");
      await page.getByText("未识别片段不会参与分析，请核对修正", { exact: true }).waitFor();
      await page.getByRole("button", { name: "产品", exact: true }).click();
      await page.getByRole("button", { name: "添加我的产品", exact: true }).click();
      assert.equal(await page.getByPlaceholder("型号/产品名", { exact: true }).inputValue(), "本机结构验收");
      assert.equal(await textField.inputValue(), "Niacinamide; Mystery Extract");
      await textField.fill("Niacinamide, Retinol, Ceramide NP");
      assert.equal(await page.getByText("未识别片段不会参与分析，请核对修正", { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(out, `add-${width}.png`), fullPage: true, animations: "disabled" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await page.getByRole("button", { name: "确认成分并入库", exact: true }).click();
      await page.getByRole("button", { name: "我的添加", exact: true }).click();
      const manual = page.locator(".product-card").filter({ hasText: "本机结构验收" });
      await manual.waitFor();
      await manual.getByRole("button", { name: "合成测试 本机结构验收", exact: true }).click();
      await page.getByRole("button", { name: "从当前搭配移除", exact: true }).waitFor();
      await page.getByRole("button", { name: "烟酰胺 · 查看详情", exact: true }).click();
      await page.locator(".ingredient-detail-card").waitFor();
      await page.screenshot({ path: path.join(out, `ingredient-detail-${width}.png`), fullPage: true, animations: "disabled" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await page.getByRole("button", { name: "成分", exact: true }).click();
      await page.getByPlaceholder("搜索成分、英文名、功效或风险").fill("NoSuchIngredientSynthetic");
      await page.getByText("没有匹配成分", { exact: true }).waitFor();
      assert.equal(await page.locator(".ingredient-detail-card").count(), 0);
      await page.getByRole("button", { name: "搭配", exact: true }).click();
      await page.getByText("合成测试 本机结构验收", { exact: true }).first().waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
      // Independent real catalog selections exercise the non-empty advantages branch.
      // Only this offline fixture changes; do not invent advantages in production data.
      const notesPage = await browser.newPage({ viewport: { width, height: 844 } });
      notesPage.on("pageerror", (error) => errors.push(error.message));
      notesPage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await notesPage.route("**/*", (route) => {
        if (new URL(route.request().url()).hostname !== "127.0.0.1") { externalRequests.push(route.request().url()); return route.abort(); }
        return route.continue();
      });
      await notesPage.goto(`http://127.0.0.1:${server.address().port}/?width=${width}&fixture=notes-basic`);
      await notesPage.locator(".scene-other-disclosure > .disclosure-toggle").click();
      const fullGroups = await notesPage.locator(".scene-other-notes .other-note-heading").allTextContents();
      assert.deepEqual(fullGroups, ["取舍依据", "组合说明", "备选"]);
      const numbers = await notesPage.locator(".other-advantage-index").allTextContents();
      assert.ok(numbers.length > 0); assert.deepEqual(numbers, numbers.map((_n, index) => `${index + 1}.`));
      const advantageLayout = await notesPage.locator(".other-advantage-row").evaluateAll((rows) => rows.every((row) => {
        const number = row.querySelector(".other-advantage-index"), body = row.querySelector(".other-note-body");
        const a = number.getBoundingClientRect(), b = body.getBoundingClientRect();
        return b.left >= a.right && Math.abs(b.top - a.top) < 1 && body.scrollWidth <= body.clientWidth + 1;
      }));
      assert.equal(advantageLayout, true);
      assert.equal(await notesPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
      await notesPage.locator(".scene-other-notes").screenshot({ path: path.join(out, `other-notes-all-sections-${width}.png`), animations: "disabled" });
      await notesPage.close();
      assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
      results.push({ width, defaultCollapsed: true, cautionFirst: true, coverageSorted: true,
        expandCollapse: true, productPagination: true, globalSearch: true, durableAddDraft: true,
        correctedIngredientsToProductToAnalysis: true, productAndIngredientDetails: true, emptySearchNoWrongDetail: true,
        alignedDisclosure: true, flatAnalysisRecommendationRows: true, consistentCountLabels: true,
        noNativeButtonOutline: true, noGreenHeroDecoration: true, accountPairAligned: true, productNameNavigation: true,
        exactlyTwoSyncButtons: true, syncFailureRetainsVisibleDraft: true,
        sceneSwitching: true, alternativesReplaceAndReset: true, originalSelectionPreserved: true,
        independentSceneChoices: true, eveningNoSunscreen: true,
        recommendationContainsNoExplanationOrAlternatives: true, separateOtherNotesPanel: true,
        otherNotesSingleDefaultCollapsedEntry: true, availableNoteGroupsAccessible: true, emptyAdvantagesNotFabricated: true,
        otherNotesTypographyHierarchy: true, otherNotesAlignedDescriptionsAndActions: true, otherNotesNoInnerFrames: true,
        alternativeActionInlineAndTextOnly: true,
        alternativeActionImmediatelyAfterName: true,
        allThreeNotesSectionsAndNumberedAdvantages: true,
        expandedCatalog766: true, medicationLibraryAndDetailWarning: true, medicationNotRecommendedInEitherScene: true,
        medicationSelectionRetained: true, medicationOverrideNotOffered: true,
        conditionRowSpacing: true, minConditionRowGapPx: Math.min(...conditionRowGaps), conditionRowGaps,
        conditionImageLayout,
        overflow, consoleErrors: errors.length, externalRequests: externalRequests.length });
      await page.close();
    }
    const receipt = { scope: "Offline React/Taro simulation with actual postprocessed WXSS + native button default model, NOT WeChat runtime", miniOutput, cssFiles: [...importedCssFiles], output: out, results };
    fs.writeFileSync(path.join(out, "receipt.json"), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt, null, 2));
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
