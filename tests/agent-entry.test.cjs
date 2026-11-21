const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const allowed = ["CLAUDE.md", "GEMINI.md", ".cursorrules", ".windsurfrules", ".clinerules", ".github/copilot-instructions.md"];
const names = new Set(allowed.map(entry => path.basename(entry)));
const skipped = new Set([".git", "node_modules", "input", "out"]);

// 找出仓库内所有 AI 工具入口文件（含被忽略的本地文件），供规则检查。
function entryFiles(folder = root) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return skipped.has(entry.name) ? [] : entryFiles(full);
    return names.has(entry.name) ? [path.relative(root, full).split(path.sep).join("/")] : [];
  });
}

test("AI 工具入口文件只能在指定位置，且只有一行指向 AGENTS.md", () => {
  assert.ok(fs.existsSync(path.join(root, "AGENTS.md")));
  for (const file of entryFiles()) {
    assert.ok(allowed.includes(file), `${file}: entry files are only allowed at ${allowed.join(", ")}`);
    const lines = fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    assert.equal(lines.length, 1, `${file}: must be a single line`);
    assert.match(lines[0], /^(@AGENTS\.md|Read AGENTS\.md first\.)$/, `${file}: must only point to AGENTS.md`);
  }
});
