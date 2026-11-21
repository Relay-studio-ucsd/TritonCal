const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { chromeFor } = require("./helpers/i18n.cjs");

const root = path.join(__dirname, "../extension");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));

// 列出 extension/ 下全部脚本，供跨模块引用检查。
function scriptFiles(folder = root) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return scriptFiles(full);
    return entry.name.endsWith(".js") ? [path.relative(root, full)] : [];
  });
}

test("隔离环境脚本按清单顺序加载，所有 globalThis.TritonCal* 引用都存在", () => {
  const scripts = manifest.content_scripts.find(script => script.world !== "MAIN").js;
  const context = vm.createContext({
    chrome: { ...chromeFor(), runtime: { onMessage: { addListener() {} } } },
    Intl, Date, Math, String, Number, Set, Map, JSON, URL, TextEncoder,
    window: { addEventListener() {} },
    document: { body: null, addEventListener() {} }
  });
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });

  for (const file of scriptFiles()) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    for (const [, module, member] of source.matchAll(/globalThis\.(TritonCal\w+)\.(\w+)/g)) {
      assert.notEqual(context[module]?.[member], undefined, `${file}: ${module}.${member}`);
    }
    for (const [, names, module] of source.matchAll(/const \{([^}]+)\} = globalThis\.(TritonCal\w+)/g)) {
      for (const name of names.split(",").map(part => part.trim())) {
        assert.notEqual(context[module]?.[name], undefined, `${file}: ${module}.${name}`);
      }
    }
  }
});
