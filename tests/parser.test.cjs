const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../extension/parser.js"), "utf8");
const context = vm.createContext({ Date, Intl, JSON, Number, String, Set });
vm.runInContext(source, context);
const parser = context.TritonCalParser;

test("把真实响应格式的日期和时间转换为课表字段", () => {
  const date = Date.parse("2026-09-24T00:00:00Z");
  const response = JSON.stringify({ d: { results: [{
    EventId: "00000001", ModuleId: "00000002",
    EventDate: `/Date(${date})/`,
    StartTime: "PT11H00M00S", EndTime: "PT12H20M00S",
    EventName: "TEST-001-LE (001-000)", CourseName: "Example Course",
    Room: "Room 108", EventIsExam: false
  }] } });
  const parsed = parser.parseTimetable(response);
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.events[0].date, "2026-09-24");
  assert.equal(parsed.events[0].start, "11:00");
  assert.equal(parsed.events[0].end, "12:20");
  assert.equal(parsed.events[0].room, "Room 108");
  assert.equal(parsed.events[0].code, "TEST-001");
  assert.equal(parsed.events[0].type, "LE");
  assert.equal(parsed.events[0].section, "001-000");
});

test("跳过不完整事件并去除重复上课记录", () => {
  const row = {
    EventId: "00000001", EventDate: `/Date(${Date.parse("2026-10-19T00:00:00Z")})/`,
    StartTime: "PT14H00M00S", EndTime: "PT14H50M00S", Room: ""
  };
  const parsed = parser.parseTimetable(JSON.stringify({ d: { results: [row, row, { EventId: "missing" }] } }));
  assert.equal(parsed.totalRows, 3);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0].room, null);
});

test("零时长的全天标记不进入课程周视图", () => {
  const date = `/Date(${Date.parse("2026-11-11T00:00:00Z")})/`;
  const parsed = parser.parseTimetable(JSON.stringify({ d: { results: [{
    EventId: "holiday", EventDate: date,
    StartTime: "PT00H00M00S", EndTime: "PT00H00M00S", EventName: "Holiday"
  }] } }));
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.events.length, 0);
});

test("按美西日期确定周一，跨夏令时不偏一天", () => {
  assert.equal(parser.todayInTimezone(new Date("2026-11-01T06:30:00Z")), "2026-10-31");
  assert.equal(parser.todayInTimezone(new Date("2026-11-01T07:30:00Z")), "2026-11-01");
  assert.equal(parser.mondayOf("2026-11-01"), "2026-10-26");
  assert.equal(parser.addDays("2026-10-26", 7), "2026-11-02");
});

test("拒绝非课表响应", () => {
  assert.throws(() => parser.parseTimetable('{"value":[]}'), /d.results/);
});

test("不认识的事件标题仍能显示，不猜课程代码或 section", () => {
  const response = JSON.stringify({ d: { results: [{
    EventId: "event-1", EventDate: `/Date(${Date.parse("2026-10-20T00:00:00Z")})/`,
    StartTime: "PT09H00M00S", EndTime: "PT10H00M00S", EventName: "Special event"
  }] } });
  const [event] = parser.parseTimetable(response).events;
  assert.equal(event.name, "Special event");
  assert.equal(event.code, null);
  assert.equal(event.type, null);
  assert.equal(event.section, null);
});

test("另一学期的考试和缺失教室按原始字段保留", () => {
  const response = JSON.stringify({ d: { results: [{
    EventId: "exam-1", EventDate: `/Date(${Date.parse("2027-03-15T00:00:00Z")})/`,
    StartTime: "PT08H00M00S", EndTime: "PT10H59M00S",
    EventName: "TEST-002-LE (002-000)", CourseName: "Second Term",
    EventIsExam: true, Room: "", Location: "UC San Diego"
  }] } });
  const [event] = parser.parseTimetable(response).events;
  assert.equal(event.date, "2027-03-15");
  assert.equal(event.isExam, true);
  assert.equal(event.room, null);
});
