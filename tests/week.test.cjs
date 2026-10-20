const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = vm.createContext({ Date, Intl, Math, String, Number, Set });
for (const file of ["parser.js", "week-view.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../extension", file), "utf8"), context);
}
const { planWeek } = context.TritonCalWeekView;

function event(date, start, end, name = "TEST-001-LE (001-000)") {
  return { date, start, end, name, code: "TEST-001" };
}

test("自然周只展示范围内课程，周末无课时保持五列", () => {
  const plan = planWeek([
    event("2026-10-18", "09:00", "10:00"),
    event("2026-10-19", "10:00", "11:00"),
    event("2026-10-23", "15:00", "16:00"),
    event("2026-10-26", "09:00", "10:00")
  ], "2026-10-19");
  assert.equal(plan.count, 2);
  assert.equal(plan.days.length, 5);
  assert.equal(plan.startHour, 9);
  assert.equal(plan.endHour, 17);
});

test("有周末课程时显示七列，重叠课程并排", () => {
  const plan = planWeek([
    event("2026-10-19", "10:00", "11:00", "A"),
    event("2026-10-19", "10:30", "11:30", "B"),
    event("2026-10-19", "12:00", "13:00", "C"),
    event("2026-10-24", "14:00", "15:00", "D")
  ], "2026-10-19");
  assert.equal(plan.days.length, 7);
  const monday = plan.days[0].events;
  assert.equal(monday[0].columns, 2);
  assert.equal(monday[1].columns, 2);
  assert.notEqual(monday[0].column, monday[1].column);
  assert.equal(monday[2].columns, 1);
});

test("空课表可显示空周，不混入另一学期的课程", () => {
  const empty = planWeek([], "2026-10-19");
  assert.equal(empty.count, 0);
  assert.equal(empty.days.length, 5);
  assert.equal(empty.startHour, 8);
  assert.equal(empty.endHour, 18);
  const otherTerm = planWeek([event("2027-03-15", "08:00", "10:59")], "2026-10-19");
  assert.equal(otherTerm.count, 0);
});
