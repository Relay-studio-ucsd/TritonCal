const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ JSON });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../extension/offline.js"), "utf8"), context);
const { generateOfflineHtml } = context.TritonCalOffline;

test("离线课表只带显示字段，独立打开不需网络资源", () => {
  const html = generateOfflineHtml([{
    id: "private-tss-id", moduleId: "private-module-id", date: "2026-10-20",
    start: "11:00", end: "12:20", code: "TEST-001", type: "LE",
    name: "TEST-001-LE", title: "Example Course", room: "Room 108", isExam: false
  }]);
  const payload = html.match(/<script type="application\/json" id="schedule-data">([^<]*)<\/script>/);
  assert.ok(payload);
  const events = JSON.parse(payload[1]);
  assert.equal(events.length, 1);
  assert.equal(events[0].room, "Room 108");
  assert.equal(events[0].id, undefined);
  assert.equal(events[0].moduleId, undefined);
  assert.doesNotMatch(html, /private-tss-id|private-module-id|<link|<script src=/);
  assert.match(html, /@media\(max-width:650px\)/);
  const runtime = html.match(/<script>\n([\s\S]*?)<\/script>/);
  assert.ok(runtime);
  assert.doesNotThrow(() => new vm.Script(runtime[1]));
});

test("课程文本不能提前结束数据脚本或注入页面", () => {
  const attack = "</script><script>globalThis.injected=true</script>&";
  const html = generateOfflineHtml([{
    date: "2026-10-20", start: "11:00", end: "12:20", code: "TEST-001",
    type: "LE", name: "TEST-001-LE", title: attack, room: "", isExam: false
  }]);
  assert.doesNotMatch(html, /<script>globalThis\.injected=true<\/script>/);
  const payload = html.match(/<script type="application\/json" id="schedule-data">([^<]*)<\/script>/);
  assert.equal(JSON.parse(payload[1])[0].title, attack);
});
