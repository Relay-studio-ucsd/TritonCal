const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ Date, Math, String, Number, Set, TextEncoder });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../extension/ics.js"), "utf8"), context);
const { escapeText, foldLine, generateCalendar } = context.TritonCalIcs;

function event(date, start, end, id = "100") {
  return {
    id, date, start, end,
    name: "TEST-001-LE (001-000)", code: "TEST-001", type: "LE",
    section: "001-000", title: "Example Course", room: "Room 1", isExam: false
  };
}

test("按真实日期逐条导出，跨夏令时保持美西本地时间", () => {
  const before = event("2026-10-30", "13:00", "13:50");
  const after = event("2026-11-02", "13:00", "13:50");
  const text = generateCalendar([before, after], { now: new Date("2026-10-20T12:00:00Z") });
  assert.equal((text.match(/BEGIN:VEVENT\r\n/g) || []).length, 2);
  assert.match(text, /DTSTART;TZID=America\/Los_Angeles:20261030T130000/);
  assert.match(text, /DTSTART;TZID=America\/Los_Angeles:20261102T130000/);
  assert.match(text, /BEGIN:VTIMEZONE\r\nTZID:America\/Los_Angeles/);
  assert.match(text, /BYMONTH=11;BYDAY=1SU/);
  assert.doesNotMatch(text, /RRULE:FREQ=WEEKLY/);
  assert.equal(text.endsWith("\r\n"), true);
});

test("仅导出实际出现的课，假期和零时长行不进入日历", () => {
  const text = generateCalendar([
    event("2026-11-09", "13:00", "13:50", "1"),
    event("2026-11-11", "00:00", "00:00", "holiday"),
    event("2026-11-12", "13:00", "13:50", "2")
  ], { now: new Date("2026-10-20T12:00:00Z") });
  assert.equal((text.match(/BEGIN:VEVENT\r\n/g) || []).length, 2);
  assert.doesNotMatch(text, /20261111T/);
});

test("UID 稳定，房间和标题正确转义", () => {
  const item = event("2026-11-02", "13:00", "13:50");
  item.title = "A, B; C\\D";
  item.room = "Room 1; West";
  const a = generateCalendar([item], { now: new Date("2026-10-20T12:00:00Z") });
  const b = generateCalendar([item], { now: new Date("2026-10-21T12:00:00Z") });
  assert.equal(a.match(/^UID:(.+)$/m)[1], b.match(/^UID:(.+)$/m)[1]);
  assert.match(a, /SUMMARY:TEST-001 · Lecture · A\\, B\\; C\\\\D/);
  assert.match(a, /LOCATION:Room 1\\; West/);
  assert.equal(escapeText("a\nb"), "a\\nb");
});

test("长行按 UTF-8 字节折行且能无损还原", () => {
  const source = `DESCRIPTION:${"课程地点很长，".repeat(20)}`;
  const folded = foldLine(source);
  for (const physicalLine of folded.split("\r\n")) {
    assert.ok(Buffer.byteLength(physicalLine, "utf8") <= 75);
  }
  assert.equal(folded.replace(/\r\n /g, ""), source);
});

test("考试按已确认字段标识，空教室不写伪地点", () => {
  const item = event("2027-03-15", "08:00", "10:59", "exam-1");
  item.isExam = true;
  item.room = null;
  const text = generateCalendar([item], { now: new Date("2026-10-20T12:00:00Z") });
  assert.match(text, /SUMMARY:TEST-001 · Exam · Example Course/);
  assert.doesNotMatch(text, /LOCATION:/);
});
