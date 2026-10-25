// 可选浏览器回归：使用外部已有的 Playwright，不给插件添加运行依赖。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const { catalogFor, getMessage } = require("../tests/helpers/i18n.cjs");
const root = path.join(__dirname, "..");
const fixture = JSON.parse(fs.readFileSync(path.join(root, "fixtures/term-events.json"), "utf8"));
const scripts = ["locales.js", "i18n.js", "parser.js", "ics.js", "offline.js", "week-view.js", "content.js"];
const server = http.createServer((req, res) => {
  const file = req.url.split("?")[0].slice(1);
  if (scripts.includes(file) || ["popup.html", "popup.js"].includes(file)) {
    res.setHeader("Content-Type", file.endsWith("js") ? "text/javascript" : "text/html");
    res.end(fs.readFileSync(path.join(root, "extension", file)));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(`<!doctype html><meta charset="utf-8"><title>TritonCal fixture preview</title><body style="background:#f5f7fa">${scripts.map(file => `<script src="/${file}"></script>`).join("")}</body>`);
  }
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      ...(process.env.TRITONCAL_CHROME ? { executablePath: process.env.TRITONCAL_CHROME } : {}),
      headless: true,
      args: ["--disable-features=OverlayScrollbar"]
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const locale of ["en-US", "zh-CN"]) {
    const catalog = catalogFor(locale);
    const t = (key, ...values) => getMessage(catalog, key, values);
    const output = path.join(root, "out/i18n", locale);
    fs.mkdirSync(output, { recursive: true });
    const context = await browser.newContext({ locale, viewport: { width: 1366, height: 900 } });
    let savedLanguage = locale === "en-US" ? "en" : "zh_CN";
    await context.exposeBinding("__getLanguage", () => ({ "tritoncal:language": savedLanguage }));
    await context.exposeBinding("__setLanguage", async (_, values) => {
      const previous = savedLanguage;
      savedLanguage = values["tritoncal:language"];
      const changes = { "tritoncal:language": { oldValue: previous, newValue: savedLanguage } };
      await Promise.all(context.pages().map(tab => tab.evaluate(changes => {
        window.__storageListeners?.forEach(listener => listener(changes, "local"));
      }, changes)));
    });
    // 仅测试环境打开 Shadow DOM 以量测布局；发行代码保留 closed。
    await context.addInitScript(({ locale, catalog }) => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) { return attach.call(this, { ...options, mode: "open" }); };
      window.__listeners = [];
      window.__messages = [];
      window.__storageListeners = [];
      window.chrome = { i18n: {
        getUILanguage: () => locale === "en-US" ? "zh-CN" : "en-US",
        getMessage: (key, values = []) => catalog[key]?.message.replace(/\$([a-z0-9_]+)\$/gi, (_, name) =>
          (catalog[key].placeholders?.[name.toLowerCase()]?.content ?? "").replace(/\$([1-9])/g, (_, index) => String(values[Number(index) - 1] ?? ""))) ?? ""
      }, storage: {
        local: { get: () => window.__getLanguage(), set: values => window.__setLanguage(values) },
        onChanged: { addListener: listener => window.__storageListeners.push(listener) }
      }, runtime: { onMessage: { addListener(fn) { window.__listeners.push(fn); } } }, tabs: {
        async query() { return [{ id: 1, url: new URLSearchParams(location.search).get("tab") || "https://tss.ucsd.edu/fiori" }]; },
        async sendMessage(id, message) { window.__messages.push(message); return window.__popupResponse ?? { opened: true }; }
      } };
      window.close = () => { window.__closed = true; };
    }, { locale, catalog });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(() => window.TritonCalI18n && document.getElementById("tritoncal-extension-root"));
    const send = message => page.evaluate(message => new Promise(resolve => window.__listeners[0](message, {}, resolve)), message);
    assert.deepEqual(await send({ type: "tritoncal:open-week-view" }), { waiting: true });
    async function capture(events = fixture) {
      await page.evaluate(events => {
        const results = events.map((event, index) => ({
          EventId: String(index), EventDate: `/Date(${Date.parse(event.date)})/`,
          StartTime: `PT${event.start.slice(0, 2)}H${event.start.slice(3)}M00S`,
          EndTime: `PT${event.end.slice(0, 2)}H${event.end.slice(3)}M00S`,
          EventName: event.name, CourseName: event.title, Room: event.room, EventIsExam: event.isExam
        }));
        window.postMessage({ channel: "tritoncal:timetable:v1", url: `${location.origin}/sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet`, body: JSON.stringify({ d: { results } }) }, location.origin);
      }, events);
      await page.getByRole("button", { name: t("scheduleCount", 13), exact: true }).waitFor();
    }
    await capture();
    await page.getByRole("button", { name: t("scheduleCount", 13), exact: true }).click();
    const panel = page.locator(".panel");
    const panelBody = page.locator(".panel-body");
    assert.equal(await panel.evaluate(node => getComputedStyle(node).overflow), "hidden");
    assert.equal(await panelBody.evaluate(node => getComputedStyle(node).overflowY), "auto");
    assert.ok(await panelBody.evaluate(node => node.scrollHeight > node.clientHeight));
    await panelBody.evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.ok(await panelBody.evaluate(node => node.scrollTop > 0));
    await page.screenshot({ path: path.join(output, "panel.png") });
    assert.deepEqual(await send({ type: "tritoncal:open-week-view" }), { opened: true });
    const view = page.locator("#tritoncal-week-root");
    assert.equal(await view.locator(".event").count(), 13);
    assert.deepEqual(await view.locator(".day-title").allTextContents(), locale === "en-US" ? ["Mon", "Tue", "Wed", "Thu", "Fri"] : ["周一", "周二", "周三", "周四", "周五"]);
    assert.equal(await view.getByRole("button", { name: /上周|下周|本周/ }).count(), 0);
    const first = await view.locator(".hour-label").first().boundingBox();
    const header = await view.locator(".corner").boundingBox();
    assert.ok(first.y >= header.y + header.height, "first hour must sit below sticky header");
    assert.ok(await view.locator(".event").evaluateAll(cards => cards.every(card => card.scrollHeight <= card.clientHeight + 1)), "cards must show complete text");
    const courseBorder = await view.locator(".event").first().evaluate(node => node.style.borderColor);
    await view.getByRole("button", { name: t("mono"), exact: true }).click();
    await view.getByRole("button", { name: t("swatchLabel", t("lavender")), exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem("tritoncal:mono-color")), "#8c80ac");
    assert.ok(await view.locator(".event").evaluateAll(cards => cards.every(card => card.style.borderColor === "rgb(140, 128, 172)")));
    await view.getByLabel(t("customColor")).fill("#386a59");
    assert.equal(await view.locator(".event").first().evaluate(node => node.style.borderColor), "rgb(56, 106, 89)");
    await view.getByRole("button", { name: t("courseColors"), exact: true }).click();
    assert.equal(await view.locator(".event").first().evaluate(node => node.style.borderColor), courseBorder);
    await page.reload();
    await capture();
    await send({ type: "tritoncal:open-week-view" });
    await view.getByRole("button", { name: t("mono"), exact: true }).click();
    assert.equal(await view.getByLabel(t("customColor")).inputValue(), "#386a59");
    assert.equal(await view.locator(".event").first().evaluate(node => node.style.borderColor), "rgb(56, 106, 89)");
    await page.screenshot({ path: path.join(output, "typical.png") });
    await view.locator(".scroll").evaluate(node => { node.scrollTop = node.scrollHeight; });
    const last = await view.locator(".hour-label").last().boundingBox();
    const scroll = await view.locator(".scroll").boundingBox();
    assert.ok(last.y + last.height <= scroll.y + scroll.height, "last hour must be fully visible at bottom");
    await view.getByRole("button", { name: "Final", exact: true }).click();
    assert.equal(await view.locator(".event").count(), 2);
    assert.equal(await view.locator(".day-title").count(), 6);
    const dateLabel = date => new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" }).format(new Date(date + "T12:00:00Z"));
    assert.equal(await view.locator(".range").textContent(), t("finalRange", dateLabel("2026-12-07"), dateLabel("2026-12-12"), 2));
    assert.ok((await view.locator(".event strong").allTextContents()).every(text => text.includes(t("exam"))));
    await page.screenshot({ path: path.join(output, "final.png") });
    // 回归真实故障：日期与时间已存在，但 TSS 将期末的考试标记写成 false。
    await capture(fixture.map(event => ({ ...event, isExam: false })));
    assert.equal(await view.locator(".event").count(), 2);
    assert.ok((await view.locator(".event strong").allTextContents()).every(text => text.includes(t("finalEvent"))));
    assert.ok((await view.locator(".note").textContent()).includes(t("unmarkedNote", 2)));
    assert.ok(await view.locator(".event").evaluateAll(cards => cards.every(card => card.scrollHeight <= card.clientHeight + 1)));
    await page.screenshot({ path: path.join(output, "final-unmarked.png") });
    if (locale === "en-US") assert.doesNotMatch((await view.innerText()).replace("中文", ""), /\p{Script=Han}/u);
    // 手动切换即时更新现有 Final、面板、弹窗；刷新后保留，与浏览器语言无关。
    const otherLocale = locale === "en-US" ? "zh-CN" : "en-US";
    const otherT = (key, ...values) => getMessage(catalogFor(otherLocale), key, values);
    const languagePopup = await context.newPage();
    await languagePopup.goto(`${origin}/popup.html?tab=https://example.com`);
    await languagePopup.getByRole("button", { name: t("switchLanguage"), exact: true }).waitFor();
    await view.locator(".language-switch").click();
    await view.getByRole("button", { name: otherT("typical"), exact: true }).waitFor();
    await languagePopup.getByRole("button", { name: otherT("switchLanguage"), exact: true }).waitFor();
    assert.equal(await view.locator(".event").count(), 2);
    assert.equal(await view.locator(".language-switch").evaluate(button => button.getRootNode().activeElement === button), true);
    assert.equal(await page.locator(".toggle").textContent(), otherT("scheduleCount", 13));
    assert.equal(await languagePopup.locator("#status").textContent(), otherT("openTss"));
    assert.equal(await view.locator(".event").first().evaluate(node => node.style.borderColor), "rgb(56, 106, 89)");
    const switchedHtml = await page.evaluate(events => TritonCalOffline.generateOfflineHtml(events), fixture);
    assert.ok(switchedHtml.includes(`<html lang="${otherLocale}">`));
    await page.screenshot({ path: path.join(output, "switched-final.png") });
    await languagePopup.reload();
    await languagePopup.getByRole("button", { name: otherT("switchLanguage"), exact: true }).waitFor();
    await languagePopup.getByRole("button", { name: otherT("switchLanguage"), exact: true }).click();
    await view.getByRole("button", { name: t("typical"), exact: true }).waitFor();
    await languagePopup.close();
    // 同一套布局在窄屏下仍能读全课程文本。
    await page.setViewportSize({ width: 600, height: 800 });
    await view.getByRole("button", { name: t("typical"), exact: true }).click();
    assert.ok(await view.locator(".event").evaluateAll(cards => cards.every(card => card.scrollHeight <= card.clientHeight + 1)));
    await page.screenshot({ path: path.join(output, "narrow.png") });
    // 弹窗覆盖成功、等待数据、非 TSS 与连接失败四条用户路径。
    const popup = await context.newPage();
    await popup.goto(`${origin}/popup.html`);
    await popup.getByRole("button", { name: t("openWeek") }).click();
    assert.deepEqual(await popup.evaluate(() => window.__messages), [{ type: "tritoncal:open-week-view" }]);
    assert.equal(await popup.evaluate(() => window.__closed), true);
    await popup.reload();
    await popup.evaluate(() => { window.__popupResponse = { waiting: true }; });
    await popup.getByRole("button", { name: t("openWeek") }).click();
    assert.equal(await popup.locator("#status").textContent(), t("waitingRetry"));
    await popup.screenshot({ path: path.join(output, "popup.png") });
    assert.equal(await popup.evaluate(() => Boolean(window.__closed)), false);
    await popup.goto(`${origin}/popup.html?tab=https://example.com`);
    assert.equal(await popup.locator("#open-week").isVisible(), false);
    assert.equal(await popup.locator("#status").textContent(), t("openTss"));
    await popup.goto(`${origin}/popup.html`);
    await popup.evaluate(() => { chrome.tabs.sendMessage = async () => { throw Error("No receiver"); }; });
    await popup.getByRole("button", { name: t("openWeek") }).click();
    assert.equal(await popup.locator("#status").textContent(), t("openError"));
    // 导出的文件在没有扩展 API、禁止网络的浏览器环境中独立运行。
    const html = await page.evaluate(events => TritonCalOffline.generateOfflineHtml(events), fixture);
    const offlineContext = await browser.newContext({ locale: locale === "en-US" ? "zh-CN" : "en-US" });
    await offlineContext.route("**/*", route => route.abort());
    const offline = await offlineContext.newPage();
    offline.on("pageerror", error => errors.push(error.message));
    await offline.setContent(html);
    assert.equal(await offline.title(), t("offlineTitle"));
    assert.equal(await offline.locator("html").getAttribute("lang"), locale);
    assert.ok((await offline.locator("#source").textContent()).includes(String(fixture.length)));
    assert.doesNotMatch(await offline.locator("#range").textContent(), /undefined|\{[1-3]\}/);
    const initialRange = await offline.locator("#range").textContent();
    await offline.getByRole("button", { name: t("nextWeek") }).click();
    assert.notEqual(await offline.locator("#range").textContent(), initialRange);
    await offline.getByRole("button", { name: t("previousWeek") }).click();
    assert.equal(await offline.locator("#range").textContent(), initialRange);
    await offline.getByRole("button", { name: t("mono"), exact: true }).click();
    assert.equal(await offline.locator("body").getAttribute("data-mode"), "mono");
    if (locale === "en-US") assert.doesNotMatch(await offline.locator("body").innerText(), /\p{Script=Han}/u);
    await offline.screenshot({ path: path.join(output, "offline.png") });
    await offlineContext.close();
    // 存储被浏览器禁止时，选色仍能工作；空考试数据不画伪考试。
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
      Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    });
    await page.reload();
    await capture();
    await send({ type: "tritoncal:open-week-view" });
    await view.getByRole("button", { name: t("mono"), exact: true }).click();
    await view.getByRole("button", { name: t("swatchLabel", t("rose")), exact: true }).click();
    assert.equal(await view.locator(".event").first().evaluate(node => node.style.borderColor), "rgb(165, 121, 149)");
    await page.evaluate(() => window.postMessage({ channel: "tritoncal:timetable:v1", url: `${location.origin}/sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet`, body: JSON.stringify({ d: { results: [] } }) }, location.origin));
    await view.getByRole("button", { name: "Final", exact: true }).click();
    await view.getByText(t("finalEmpty"), { exact: true }).waitFor();
    assert.equal(await view.locator(".event").count(), 0);
    assert.equal(await view.locator(".day-title").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`${locale} UI checks passed: panel scrolling, time labels, complete cards, view modes, colors, reload persistence, popup paths, standalone offline translation.`);
    await context.close();
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
