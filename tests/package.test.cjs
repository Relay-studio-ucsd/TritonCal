const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("打包白名单排除私人数据，ZIP 清单与扩展版本一致", () => {
  const root = path.join(__dirname, "..");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tritoncal-package-"));
  try {
    fs.cpSync(path.join(root, "extension"), path.join(temp, "extension"), { recursive: true });
    fs.mkdirSync(path.join(temp, "scripts"));
    fs.copyFileSync(path.join(root, "scripts/package.cjs"), path.join(temp, "scripts/package.cjs"));
    fs.writeFileSync(path.join(temp, "extension/private.json"), "do-not-distribute");
    fs.writeFileSync(path.join(temp, "extension/.DS_Store"), "finder metadata");
    execFileSync(process.execPath, [path.join(temp, "scripts/package.cjs")]);
    const version = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"))).version;
    for (const [kind, prefix] of [["extension-preview", "extension/"], ["store-candidate", ""]]) {
      const zip = fs.readFileSync(path.join(temp, "out", `tritoncal-${kind}-${version}.zip`));
      const end = zip.subarray(-22);
      assert.equal(end.readUInt32LE(0), 0x06054b50);
      assert.equal(end.readUInt16LE(10), 16);
      let cursor = end.readUInt32LE(16);
      const names = [];
      while (cursor < zip.length - 22) {
        assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
        const length = zip.readUInt16LE(cursor + 28);
        const name = zip.subarray(cursor + 46, cursor + 46 + length).toString();
        const local = zip.readUInt32LE(cursor + 42);
        assert.equal(zip.readUInt32LE(local), 0x04034b50);
        const size = zip.readUInt32LE(local + 18);
        const start = local + 30 + zip.readUInt16LE(local + 26);
        assert.deepEqual(zip.subarray(start, start + size), fs.readFileSync(path.join(temp, "extension", name.slice(prefix.length))));
        names.push(name);
        cursor += 46 + length;
      }
      assert.equal(names.length, 16);
      assert.ok(names.includes(`${prefix}manifest.json`));
      assert.ok(names.includes(`${prefix}icons/icon-128.png`));
      assert.ok(names.every(name => !/private|DS_Store|input|node_modules/.test(name)));
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
