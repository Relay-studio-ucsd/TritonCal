const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { catalogFor, getMessage, chromeFor } = require("./helpers/i18n.cjs");
const root = path.join(__dirname, "../extension");

function createI18n(chrome) {
  const context = vm.createContext({ chrome, Intl, Date });
  for (const file of ["locales.js", "i18n.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  return context.TritonCalI18n;
}

test("bundled translations match the source catalogs", () => {
  assert.equal(fs.readFileSync(path.join(root, "locales.js"), "utf8"), require("../scripts/build-locales.cjs").buildLocales());
});

test("manual language overrides browser locale, synchronizes views and persists", async () => {
  const chrome = chromeFor("en-US");
  const first = createI18n(chrome), second = createI18n(chrome);
  await Promise.all([first.ready, second.ready]);
  let changes = 0;
  second.onChange(() => changes++);
  await first.setLanguage("zh_CN");
  assert.equal(first.locale(), "zh-CN");
  assert.equal(second.t("openWeek"), "打开周视图");
  assert.equal(changes, 1);
  const reopened = createI18n(chrome);
  await reopened.ready;
  assert.equal(reopened.locale(), "zh-CN");
  await reopened.toggleLanguage();
  assert.equal(first.locale(), "en-US");
  assert.deepEqual(await chrome.storage.local.get(), { "tritoncal:language": "en" });
  await first.setLanguage("invalid");
  assert.equal(first.locale(), "en-US");
});

test("missing or unavailable storage defaults to Chinese, with working session switches", async () => {
  const chrome = chromeFor("en-US");
  chrome.storage.local.get = async () => ({});
  const empty = createI18n(chrome);
  await empty.ready;
  assert.equal(empty.locale(), "zh-CN");
  chrome.storage.local.get = async () => { throw Error("Unavailable"); };
  chrome.storage.local.set = async () => { throw Error("Unavailable"); };
  const failed = createI18n(chrome);
  await failed.ready;
  await failed.setLanguage("en");
  assert.equal(failed.t("openWeek"), "Open week view");
});

test("a slow initial read cannot overwrite a new language choice", async () => {
  const chrome = chromeFor("en-US");
  let finishRead;
  chrome.storage.local.get = () => new Promise(resolve => { finishRead = resolve; });
  const current = createI18n(chrome);
  await current.setLanguage("zh_CN");
  finishRead({ "tritoncal:language": "en" });
  await current.ready;
  assert.equal(current.locale(), "zh-CN");
});

test("language catalogs have matching keys and resolvable placeholders", () => {
  const en = catalogFor("en-US"), zh = catalogFor("zh-CN");
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  for (const key of Object.keys(en)) {
    assert.deepEqual(en[key].placeholders, zh[key].placeholders, key);
    for (const catalog of [en, zh]) {
      assert.ok(catalog[key].message.trim(), key);
      const result = getMessage(catalog, key, ["ONE", "TWO", "THREE"]);
      assert.doesNotMatch(result, /\$[a-z0-9_]+\$/i);
      for (const [index, value] of ["ONE", "TWO", "THREE"].entries()) {
        if (catalog[key].placeholders?.[`arg${index + 1}`]) assert.ok(result.includes(value), key);
      }
    }
  }
  const { switchLanguage, ...englishText } = en;
  assert.equal(switchLanguage.message, "中文");
  assert.doesNotMatch(JSON.stringify(englishText), /\p{Script=Han}/u);
});

test("manifest messages resolve and the helper loads before consumers", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.default_locale, "en");
  for (const value of [manifest.name, manifest.description, manifest.action.default_title]) {
    const key = value.match(/^__MSG_(\w+)__$/)[1];
    for (const locale of ["en-US", "zh-CN"]) assert.ok(getMessage(catalogFor(locale), key));
  }
  assert.deepEqual(manifest.content_scripts.find(script => script.world !== "MAIN").js.slice(0, 2), ["locales.js", "i18n.js"]);
  const popup = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  assert.ok(popup.indexOf('src="i18n.js"') < popup.indexOf('src="popup.js"'));
});

for (const locale of ["en-US", "zh-CN"]) {
  test(`${locale}: dates stay on the requested day and offline output embeds its language`, async () => {
    const context = vm.createContext({ chrome: chromeFor(locale), Intl, Date });
    for (const file of ["locales.js", "i18n.js", "offline.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
    await context.TritonCalI18n.ready;
    assert.equal(context.TritonCalI18n.date("2026-12-07", { weekday: "short" }), locale === "en-US" ? "Mon" : "周一");
    assert.equal(context.TritonCalI18n.t("scheduleCount", 13), locale === "en-US" ? "Schedule · 13" : "课表 · 13");
    const html = context.TritonCalOffline.generateOfflineHtml([]);
    assert.ok(html.includes(`<html lang="${locale}">`));
    const translations = JSON.parse(html.match(/id="schedule-i18n">([^<]*)<\/script>/)[1]);
    assert.equal(translations.locale, locale);
    assert.ok(translations.strings.offlineRange.includes("{3}"));
    assert.doesNotMatch(html, /chrome\.i18n/);
    if (locale === "en-US") assert.doesNotMatch(html, /\p{Script=Han}/u);
  });
}
