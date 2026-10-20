const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../extension/manifest.json"), "utf8"));

test("插件权限和注入范围仅限当前 TSS 标签页", () => {
  assert.deepEqual(manifest.permissions, ["activeTab"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  assert.ok(manifest.content_scripts.length > 0);
  for (const script of manifest.content_scripts) {
    assert.deepEqual(script.matches, ["https://tss.ucsd.edu/*"]);
  }
});
