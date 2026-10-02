# 04 · 路线图、验收标准、设计要求

每个里程碑：做完 → 给用户看 → 用户点头 → 更新 `CLAUDE.md` 的"当前状态" → 下一个。**不要跳步。**

## 技术选型（已定，不再讨论）

- **Node.js ≥ 20，纯 JS（ESM），零 npm 依赖。** `package.json` 里 `"type": "module"`，测试用内置 `node --test`。
- 渲染：**一个静态 `schedule.html`**，内联 CSS + JS，`<script>` 里读同目录 `schedule.json`（或构建时直接把 JSON 内联进 HTML，这样双击就能打开、不用起服务器——**优先内联**）。
- ICS：手写生成器（RFC 5545 很小），不装库。
- CLI 入口：`node src/cli.js build`：`input/` 或 `fixtures/` → `out/schedule.json` → `out/schedule.html` + `out/schedule.ics`。

## M0 · 初始化

- `git init`，`npm init -y`，加 `"type": "module"`，`"scripts": {"test": "node --test", "build": "node src/cli.js build"}`。
- `src/` 下建空的 `parse/`、`render/`、`ics/`，一个占位测试跑绿。
- 验收：`npm test` 通过；`git status` 干净（`input/` 被忽略）。

## M1 · 周课表渲染（输入：`fixtures/fall2026-sample.json`）

> ⚠️ **先问审美，再写代码。** 下面的"设计默认值"和两张截图都只是**参考起点**，不是定稿。
> 动手前必须先和用户确认具体审美，至少问清：
> 1. 整体风格：更像苹果日历（截图 1，`apple-calendar-fall2026.jpg`）还是旧 WebReg（截图 2，`old-webreg-spring2026.png`），或者都不像、有别的参考？
> 2. 上色：按课上色 / 单色 / 两者可切换？有没有偏好的色系（低饱和、学校蓝金、深色模式）？
> 3. 每个课块显示哪些信息、哪个最醒目（课程代码、课名、类型、时间、教室、教师）？
> 4. 主要在哪看：手机竖屏、电脑、还是截图发群？
>
> 问法：一次问完，给每题 2–3 个选项 + 一句话说明。最好先做一个只有静态假数据的小样（HTML，两三种配色并排）给用户挑，再写正式渲染。用户的回答记进本节，替换掉对应的默认值。

**设计默认值**（用户没有特别要求时用这些）：

- 周一到周五五列（周末有课才显示），左侧时间轴 8:00–22:00 按实际课程范围自动收缩（最早课前 1 小时到最晚课后 1 小时）。
- 每个课块：**第一行课程代码 + 类型**（`CSE 101 · Lecture`），第二行时间，第三行教室（没有就不显示那行）。块高按时长成比例。
- **配色开关**：顶部一个切换，"按课上色"（每门课一个色，LE 深、DI/LA 同色浅一档）↔"单色"（统一浅灰底 + 左侧色条，像 TSS 现在那样但更清楚）。默认按课上色。配色用一组低饱和、打印友好的色（6–8 个足够）。
- 标题区：学期名、总学分、课程数；底部图例：每门课的颜色 + 全名 + 学分。
- 重叠处理：同一时段两块并排各占一半（像截图 1 苹果日历周三 1 PM 那样），不要盖住。
- 响应式：手机竖屏可横向滚动，不要挤成一团。
- 可截图：整体是白底、固定最大宽度 1200px 的一张"卡片"，截图就能发群里。
- 验收：双击 `out/schedule.html` 打开，用 fixtures 数据肉眼对照截图 1（苹果日历）的时间全部正确；**样式符合用户确认过的审美**；配色切换正常；浏览器窄到 400px 不崩。

## M2 · ICS 导出（输入同上）

**ICS 规范要求**（RFC 5545）：

- 文件头：`BEGIN:VCALENDAR / VERSION:2.0 / PRODID:-//kebiao//UCSD TSS Schedule//EN / CALSCALE:GREGORIAN / METHOD:PUBLISH`，加 `X-WR-CALNAME:UCSD Fall 2026`、`X-WR-TIMEZONE:America/Los_Angeles`。
- 必须包含一个 **`VTIMEZONE` for `America/Los_Angeles`**（含 DAYLIGHT/STANDARD 两段，2026-11-01 切换），所有 `DTSTART`/`DTEND` 用 `TZID=America/Los_Angeles:20260925T130000` 形式。**不要用 UTC `Z` 后缀，不要用浮动时间。**
- 每个 meeting 一个 `VEVENT`：
  - `DTSTART` = `instructionBegins` 当天或之后、`days` 里第一个匹配的日期（例：MWF 课、9/24 周四开学 → 首次 9/25 周五）。
  - `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261204T235959Z`（UNTIL 必须是 UTC，和 DTSTART 带 TZID 的组合是允许的，用 `instructionEnds` 当天美西 23:59:59 换算成 UTC）。
  - `EXDATE;TZID=America/Los_Angeles:20261111T130000` 为每个落在 `days` 上的假期各加一个，时间和 DTSTART 一致。
  - `SUMMARY`：`CSE 101 Lecture`；`LOCATION`：教室；`DESCRIPTION`：section、教师、课名。
  - `UID` 稳定可重复：`<code>-<type>-<section>-<days>-<start>@kebiao`，重新生成导入时才会覆盖而不是重复。
- 期末/期中：单次 `VEVENT`，`SUMMARY: CSE 101 Final Exam`。
- 如果 `occurrences` 非空：改为逐条 `VEVENT`（每次上课一条，无 RRULE），UID 带日期。
- 文本转义：`,` `;` `\` 和换行要按 RFC 转义；行超过 75 字节要折行（`\r\n` + 空格）。行尾 **`\r\n`**。
- 验收：
  1. `node --test` 覆盖：首次日期推算、UNTIL 换算、EXDATE 生成、转义、折行。
  2. 用户把 `out/schedule.ics` 导入 **Google Calendar**（设置 → 导入）：翻到 11 月，**11/11（周三）和 11/26–27 没有课**；翻到 12 月第一周有课、第二周没有；对照 TSS 首页任意一周时间一致；11/1 之后的课时间没有偏移一小时。
  3. 同一文件也在 Apple Calendar 打开一次（macOS 双击）。

## M3 · 真实数据接入

1. 让用户按 `docs/02` 方案 A 抓 `input/timetable.json`（或 `input/tss.har`）。
2. 让用户只贴**字段名**，确认时间/教室字段叫什么，写回 `docs/01` 3.1 的表。
3. 写 `src/parse/tss.js`：输入 HAR / 单个 JSON / `$batch` 文本 → `schedule.json`。要点：`/Date(ms)/` 按 UTC 取日期；按 `EventId` 归并 meetings；`EventIsExam` 行进 exams；`EventName` 拆课程代码、类型、section。
4. 加一个用**脱敏后**的真实响应做的 fixture（把 GUID、学号、`ModregId` 等替换成假值，只保留结构），作为解析器测试。
5. 如果没有教室：实现 `_sections.Sched` 解析（照 `reference/tritonplan/parse-sched.ts`），按 `code + section` 合并进去。
6. 验收：真实数据 → `npm run build` → HTML 和 ICS 都正确，用户导入日历确认。

## M4 · 打磨（按需挑）

- `schedule.html` 内加"下载 .ics"按钮（JS 内生成，Blob 下载），这样只发一个 HTML 给同学也能用。
- 教室点开跳 UCSD 校园地图 / Google Maps 搜索。
- 期末周单独一张小表。
- 方案 B 的油猴脚本，省掉 DevTools 步骤。
- 把 `terms` 表扩到 2027–28（到时候从 blink 学术日历抄）。

## 不做的事

- 不做后端、不做账号、不存任何人的数据到服务器。
- 不做选课规划/冲突检测（TritonPlan 已经做了，直接推荐它）。
- 不做自动登录、不碰 Duo。
