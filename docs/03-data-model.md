# 03 · 数据格式 `schedule.json`

**所有下游（渲染、ICS）只认这个格式**；上游（TSS 抓取、手填）负责产出它。这是项目唯一的"契约"，改它要同时改 fixtures 和测试。

## 结构

```jsonc
{
  "version": 1,
  "timezone": "America/Los_Angeles",
  "term": {
    "label": "Fall 2026",
    "instructionBegins": "2026-09-24",   // 第一天有课
    "instructionEnds":   "2026-12-04",   // 最后一天有课（含）
    "finalsBegin":       "2026-12-05",
    "finalsEnd":         "2026-12-12",
    "holidays": ["2026-11-11", "2026-11-26", "2026-11-27"]   // 无课的工作日
  },
  "courses": [
    {
      "code": "CSE-101",                 // TSS 的 SmShort / CourseAbbr 写法，带连字符
      "title": "Design and Analysis of Algorithms",   // 可为 null
      "units": 4,                        // 可为 null
      "color": null,                     // null = 渲染时自动分配；也可写 "#f4b183"
      "components": [
        {
          "type": "LE",                  // LE 讲座 / DI 讨论 / LA 实验 / SE 研讨 / ST / IN / OT
          "section": "001-000",          // EventName 括号里的 "001-000"
          "instructor": null,            // 可为 null
          "meetings": [
            {
              "days": ["Mon", "Wed", "Fri"],   // 固定用英文三字母
              "start": "13:00",                // 24 小时 "HH:MM"
              "end":   "13:50",
              "location": null                 // 原始地点字符串，如 "Center Hall 115"；可为 null
            }
          ]
        }
      ],
      "exams": [
        { "kind": "final", "date": "2026-12-07", "start": "11:30", "end": "14:29", "location": null }
        // kind: "final" | "midterm"
      ]
    }
  ],
  "occurrences": null
  // 可选：如果上游是 EventListSet（已按日期展开），把每一次上课原样列出：
  // [{ "course": "CSE-101", "type": "LE", "section": "001-000", "date": "2026-09-25",
  //    "start": "13:00", "end": "13:50", "location": null, "isExam": false }, ...]
  // 有 occurrences 时 ICS 优先用它（逐条 VEVENT，假期天然不存在）；没有时用 meetings + term 生成 RRULE。
}
```

## 字段规则

- 日期一律 `YYYY-MM-DD`，时间一律 `HH:MM`（24h），都是**本地（美西）时间**，不带时区后缀；时区由顶层 `timezone` 统一声明。
- `days` 只允许 `Mon Tue Wed Thu Fri Sat Sun`。TSS 的 `M Tu W Th F Sa Su` 在上游解析时转换。
- 一个 component 可以有多个 meeting（例如周一周三一个时段、周五另一个时段）。
- 课程 `code` 是去重键：同一门课的 LE 和 DI 放在同一个 course 的 `components` 里。
- 未知的信息写 `null`，不要省略 key，渲染代码就不用到处判 `undefined`。

## 和 TSS 原始字段的对应

| schedule.json | 来自 EventListSet（方案 A 主路径） | 来自 `_sections.Sched`（补教室） |
|---|---|---|
| `course.code` | `EventName` 括号前去掉 `-LE`/`-DI`：`"CSE-101-LE (001-000)"` → `CSE-101` | `EventPkgText` 括号前 |
| `course.title` | `CourseName` | `CourseTitle` |
| `component.type` | `EventName` 里的 `-LE`/`-DI`（`TeachingMethod` 是 "Lecture" 这种文字，不要用它） | `TeachingMethod` |
| `component.section` | `EventName` 括号里 | `EventAbbr` 去掉末尾 `-LE` |
| `meeting.days/start/end` | 把同一 `EventId` 的所有日期按星期归并（见下） | 解析 `Sched` 行 |
| `meeting.location` | ⚠️ 待验证字段 | `Sched` 行 `@` 之后 |
| `exams` | `EventIsExam === true` 的行 | `Sched` 里 `Final Examination …` 行 |
| `occurrences` | 每行一条 | — |

**从 occurrences 归并成 meetings** 的算法：按 `(course, type, section, weekday, start, end)` 分组，出现 ≥ 2 次的视为每周固定 meeting；只出现 1 次且 `isExam` 的进 `exams`。这样即使只拿到 EventListSet 也能画出"周课表"视图。

## 2026–27 学年 `term` 预置值

| label | instructionBegins | instructionEnds | finalsBegin | finalsEnd | holidays |
|---|---|---|---|---|---|
| Fall 2026 | 2026-09-24 | 2026-12-04 | 2026-12-05 | 2026-12-12 | 2026-11-11, 2026-11-26, 2026-11-27 |
| Winter 2027 | 2027-01-04 | 2027-03-12 | 2027-03-13 | 2027-03-20 | 2027-01-18, 2027-02-15 |
| Spring 2027 | 2027-03-29 | 2027-06-04 | 2027-06-05 | 2027-06-11 | 2027-05-31 |

建议做成 `src/terms.js` 里的常量表，按 `label` 查。
