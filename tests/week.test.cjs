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
const { planTypicalWeek, planFinal } = context.TritonCalWeekView;

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

function regular(date, overrides = {}) {
  return { ...event(date, "09:00", "09:50"), type: "LE", section: "001-000", room: "Example Hall 101", isExam: false, ...overrides };
}

test("典型周跨假期合并固定时段，恰好半数学期周数也保留", () => {
  const events = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]
    .map(date => regular(date));
  // 六周中的三次周三课，缺少 Veterans Day 不应留下一个日历缺口。
  events.push(...["2026-10-28", "2026-11-04", "2026-11-18"].map(date => regular(date)));
  events.push(regular("2026-11-20", { start: "18:00", end: "20:59", isExam: true }));
  const plan = planTypicalWeek(events);
  assert.equal(plan.weeks, 6);
  assert.equal(plan.threshold, 3);
  assert.equal(plan.count, 2);
  assert.equal(plan.days[0].events.length, 1);
  assert.equal(plan.days[2].events.length, 1);
  assert.ok(plan.days.flatMap(day => day.events).every(item => !item.event.isExam));
});

test("频次按不同日期计数，一次性的长事件不会误归并成常规课", () => {
  const dates = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"];
  const events = dates.map(date => regular(date));
  const oneOff = regular("2026-10-10", { start: "08:00", end: "10:59" });
  events.push(...Array(10).fill(oneOff));
  const plan = planTypicalWeek(events);
  assert.equal(plan.threshold, 3);
  assert.equal(plan.count, 1);
  assert.equal(plan.days.length, 5);
});

test("典型周的完整归并键保留不同类型、section、时间和教室", () => {
  const variants = [{}, { type: "DI" }, { section: "001-001" }, { start: "09:10" }, { end: "10:00" }, { room: "Example Hall 102" }, { code: "TEST-002" }];
  const events = variants.flatMap(variant => ["2026-10-05", "2026-10-12", "2026-10-19"].map(date => regular(date, variant)));
  const plan = planTypicalWeek(events);
  assert.equal(plan.count, variants.length);
  assert.equal(plan.days[0].events.length, variants.length);
});

test("典型周保留重复出现的周末课程，空数据有稳定的五列", () => {
  const plan = planTypicalWeek([regular("2026-10-10"), regular("2026-10-17")]);
  assert.equal(plan.days.length, 7);
  assert.equal(plan.days[5].events.length, 1);
  assert.equal(planTypicalWeek([]).count, 0);
  assert.equal(planTypicalWeek([]).days.length, 5);
});

test("Final 在官方期末周补回未标记安排，保留真实日期与原始标记", () => {
  const unmarked = regular("2026-12-08", { end: "11:59" });
  const plan = planFinal([
    regular("2026-12-05", { isExam: true }),
    regular("2026-12-10", { isExam: true }),
    unmarked,
    regular("2026-11-20", { isExam: true })
  ]);
  assert.equal(plan.count, 3);
  assert.equal(plan.unmarkedCount, 1);
  assert.equal(plan.firstDate, "2026-12-05");
  assert.equal(plan.lastDate, "2026-12-10");
  assert.equal(plan.days.length, 6);
  assert.equal(plan.days[3].events[0].event, unmarked);
  assert.equal(unmarked.isExam, false);
  assert.equal(planFinal([]).days.length, 0);
  assert.equal(planFinal([regular("2026-12-05")]).count, 1);
});

test("Final 使用官方日期边界，不按时长猜测，不混入期中或学期外普通课", () => {
  for (const [before, first, last, after] of [
    ["2026-12-04", "2026-12-05", "2026-12-12", "2026-12-13"],
    ["2027-03-12", "2027-03-13", "2027-03-20", "2027-03-21"],
    ["2027-06-04", "2027-06-05", "2027-06-11", "2027-06-12"]
  ]) {
    const plan = planFinal([
      regular(before, { isExam: true, end: "12:00" }),
      regular(first, { end: "09:20" }), regular(last), regular(after),
      regular(first, { start: "10:00", end: "10:00" })
    ]);
    assert.equal(plan.count, 2);
    assert.equal(plan.firstDate, first);
    assert.equal(plan.lastDate, last);
    assert.equal(plan.unmarkedCount, 2);
  }
});

test("未覆盖学期不套用往年考试周，只有布尔考试标记可作为降级来源", () => {
  const plan = planFinal([
    regular("2027-12-05", { end: "11:59" }),
    regular("2027-12-06", { isExam: "true" }),
    regular("2027-12-07", { isExam: true })
  ]);
  assert.equal(plan.count, 1);
  assert.equal(plan.unknownTermCount, 1);
  assert.equal(plan.firstDate, "2027-12-07");
});

test("只加载到期末周时，未标记考试也不会被归并进典型周", () => {
  const events = [regular("2026-12-07"), regular("2026-12-08")];
  assert.equal(planTypicalWeek(events).count, 0);
  assert.equal(planFinal(events).count, 2);
});

test("样例学期的常规课逐个保留，Final 与典型周互不混入", () => {
  const events = JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/term-events.json"), "utf8"));
  const plan = planTypicalWeek(events);
  assert.equal(plan.count, 13);
  assert.equal(planFinal(events).count, 2);
  for (const day of plan.days) {
    const keys = day.events.map(({ event: e }) => JSON.stringify([e.code, e.type, e.section, e.start, e.end, e.room]));
    assert.equal(new Set(keys).size, keys.length);
  }
});
