const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ Date, Intl, Math, String, Number, Set, TextEncoder });
for (const file of ["parser.js", "ics.js", "week-view.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../extension", file), "utf8"), context);
}

test("第二学期的脱敏响应能完整走通解析、周视图和导出", () => {
  const raw = fs.readFileSync(path.join(__dirname, "../fixtures/tss-anonymized.json"), "utf8");
  const parsed = context.TritonCalParser.parseTimetable(raw);
  assert.equal(parsed.totalRows, 3);
  assert.equal(parsed.events.length, 2);
  const plan = context.TritonCalWeekView.planWeek(parsed.events, "2027-03-15");
  assert.equal(plan.count, 2);
  assert.equal(plan.days.length, 5);
  const calendar = context.TritonCalIcs.generateCalendar(parsed.events, { now: new Date("2026-10-20T12:00:00Z") });
  assert.equal((calendar.match(/BEGIN:VEVENT\r\n/g) || []).length, 2);
  assert.match(calendar, /SUMMARY:TEST-999 · Exam · Example Seminar/);
  assert.match(calendar, /LOCATION:Example Room 1/);
  assert.doesNotMatch(calendar, /FAKE-EVENT|Example Campus|20270316T/);
});
