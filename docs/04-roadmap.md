# 04 · 路线图、验收标准、设计要求

## 2026-10 实际路线：直接做了 MV3 扩展

用户优先希望直接在 TSS 官网使用自己的真实课表，因此先完成只读 MV3 浏览器扩展，而没有先实现原计划的静态 HTML / CLI。0.5.1 已具备被动读取单独响应和批量响应、页面内周课表、工具栏弹窗、配色切换、ICS 与离线 HTML 导出、图标及隐私说明。

Issue #1 将这份本地基线整理为可审查源码，包含测试、虚构 fixtures、零依赖打包脚本和更新后的说明。23 项测试覆盖原有功能和打包白名单；尚待用户手动上传分支并创建 PR。后续功能调整应单独提交。下方 M0–M4 保留历史计划，当前实现以 `extension/` 为准。

每个里程碑：做完 → 给用户看 → 用户点头 → 更新 `CLAUDE.md` 的"当前状态" → 下一个。**不要跳步。**

> **2026-10-19 优先级调整**：用户要求先从 TSS 官网真实响应验证，再做类似浏览器插件的成果；日历导出暂为次要任务。下方 M0–M4 是原来的静态 HTML / ICS 规划，不能用它阻止当前的官网取数与插件实验。当前先完成：真实 `EventListSet` 验证 → 只读插件显示本周课程 → 用户在 Arc 中验收。正式周课表视觉设计仍须先问审美。

## 当前任务顺序（2026-10-20）

用户希望任务直接在对话里逐项交付，不创建 GitHub Issues。每项结束给出可见成果和验收结果，再推进下一项。下方 M0–M4 保留为实现细节参考；当前以此顺序为准。

1. **可分享的插件预览版**：被动读取单独的 `EventListSet` 与 `$batch` 中的课表行；页面内可切换自然周；提供只含 `extension/` 的试用包。验收：Node 测试通过、Arc 官网本周/下周真实数据显示、包内无 `input/`。当前已完成代码与单账号实测，跨账号实测放在第 4 项。
2. **正式周课表**：先询问用户的风格、配色和设备偏好，给出小样；确定后实现按时间定位的周网格、课程颜色、重叠和手机布局。验收：用户选定风格，真实数据与 fixture 的时间和教室都正确。
3. **日历导出**：从实际 `EventListSet` 日期生成 `.ics`，不推测缺失的假期或考试；正确处理美西时区、稳定 UID、转义和折行。验收：测试覆盖时区和假期，用户在 Google/Apple Calendar 中核对。
4. **多账号与隐私验收**：用第二个学生账号或脱敏响应验证空课表、不同学期、缺失教室、考试；检查权限和无外发。验收：没有把个人抓取数据放进仓库或安装包。
5. **发布准备**：整理图标、版本、安装/卸载说明、商店所需隐私文字与截图。是否提交商店审核或公开发布，由用户最后确认。

任务 2 已确认的设计选择：**苹果日历式简洁留白**；提供按课上色与单色切换；电脑与手机都要兼顾；课程代码、课名和教室都完整显示。0.3.0 已在真实 TSS 页面由用户确认方向，随后调整课块字号和时间网格，并在 Arc 截图确认无截断。

任务 4 已按电脑端范围完成：22 项测试覆盖被动响应观察、不同学期、空周、缺失教室、考试标记、权限范围和离线 HTML 的字段最小化/文本转义。2026-10-20 用户转述同学“可以用”，第二账号基本使用成功，未收到逐项核对细节。用户选择暂时只用电脑；离线 HTML 不自动同步，手机真机和视觉验收延后，不作为当前交付门槛。

任务 5：0.5.1 已整理图标、安装排错、隐私说明、两种本地 ZIP 和商店文案/宣传图草稿。真实界面截图、公开隐私网址和支持入口尚待准备；没有上传或发布。完整清单见 `docs/05-release.md`。

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
