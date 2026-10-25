const fs = require("node:fs");
const path = require("node:path");

function catalogFor(locale) {
  const folder = locale === "zh-CN" ? "zh_CN" : "en";
  return JSON.parse(fs.readFileSync(path.join(__dirname, "../../extension/_locales", folder, "messages.json"), "utf8"));
}

// Mirrors named placeholders and positional substitutions in chrome.i18n.
function getMessage(catalog, key, values = []) {
  const entry = catalog[key];
  if (!entry) return "";
  return entry.message.replace(/\$([a-z0-9_]+)\$/gi, (_, name) => {
    const content = entry.placeholders?.[name.toLowerCase()]?.content ?? "";
    return content.replace(/\$([1-9])/g, (_, index) => String(values[Number(index) - 1] ?? ""));
  });
}

function chromeFor(locale = "en-US") {
  const catalog = catalogFor(locale);
  const data = { "tritoncal:language": locale === "zh-CN" ? "zh_CN" : "en" };
  const listeners = [];
  return { i18n: { getUILanguage: () => locale, getMessage: (key, values) => getMessage(catalog, key, values) },
    storage: {
      local: {
        async get() { return { ...data }; },
        async set(values) {
          const changes = {};
          for (const [key, value] of Object.entries(values)) {
            changes[key] = { oldValue: data[key], newValue: value };
            data[key] = value;
          }
          listeners.forEach(listener => listener(changes, "local"));
        }
      },
      onChanged: { addListener(listener) { listeners.push(listener); } }
    }
  };
}

module.exports = { catalogFor, getMessage, chromeFor };
