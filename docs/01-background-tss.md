# 01 · 背景：TSS 是什么，数据从哪来

> 调研日期 2026-10-02。"已验证"= 有人在真实 TSS 上抓到过并公开了字段；"待验证"= 推断，必须先抓真实响应确认。

## 1. TSS 简介

- **TSS = Triton Student System**，UCSD 2026 年 7 月上线，替换 My TritonLink / ISIS / WebReg，2026 秋季起学生选课（TSS 叫 **booking**，不叫 enrollment）全在这里。
- 入口 <https://sis.ucsd.edu> → 实际跳到 **<https://tss.ucsd.edu/fiori>**。Schedule of Classes 是 `https://tss.ucsd.edu/fiori#YSchedule-view`。
- 底层是 **SAP Student Lifecycle Management (SLcM)**，前端是 **SAPUI5 / Fiori**，实施方 invenioLSI。学校刻意"开箱即用、少定制"，所以界面是 SAP 通用的那套。
- 官方帮助页只提到两个看课表的地方：首页 **Student Overview → "Upcoming Events"**（橙色=课，蓝色=假期）和 **Schedule of Classes**。**没有任何导出 / 打印 / ICS / 日历同步功能。**

两张参考截图在 `docs/reference/screenshots/`，**只是设计参考，不是设计稿**（见 `docs/04` M1 的"先问审美"）：

| 文件 | 是什么 | 能看出什么 |
|---|---|---|
| `apple-calendar-fall2026.jpg` | **苹果日历（macOS Calendar）** 周视图，Fall 2026 第一周（9/28 那周），课已经在日历里 | 事件标题是 TSS 的 `EventName` 格式 "CSE-101-LE (001-000)"；没有教室；单色、可读性一般。也是 `fixtures/` 样例数据的来源 |
| `old-webreg-spring2026.png` | **更新前 UCSD 官方 WebReg 的课表**（Spring 2026，TSS 上线前） | 学生熟悉的样子：按课上色、时间 + 课名 + 类型 + 教室（可点击） |

> ❓ **待问清的事**：截图 1 里的课是怎么进苹果日历的？标题和 TSS 的 `EventName` 一字不差，说明不是随手手打的。可能是 (a) TSS 某处其实有日历订阅 / 导出（官方帮助页没提），(b) 朋友用了别的工具，(c) 手动照抄。**M0 之前先问用户。** 如果是 (a)，TSS 已经能出 ICS，本项目的重点就变成"美化 + 补教室 + 假期处理"，取数那一步可以大幅简化。

## 2. "接口"到底是什么 —— 为什么朋友说"肯定可以"

SAPUI5 页面本身不含数据，页面加载后浏览器会向服务器请求 **OData**（一种 REST/JSON 规范）响应，再渲染出来。
所以**用户自己浏览器里已经有了全部课表的 JSON**，在 Chrome DevTools → Network 里过滤 `odata` 就能看到。

我们的原则：**只复制浏览器已经收到的响应，不自己发请求。** 这和"入侵 API"完全是两回事：从服务器视角，流量和普通学生一模一样。

开源项目 **TritonPlan**（<https://github.com/hfjddjksaj/tritonplan>，MIT，2026 年 7–8 月间逐个验证了下面这些接口）是现成的证据和范本，摘录在 `docs/reference/tritonplan/`。

## 3. 已知的 OData 接口（来自 TritonPlan 的验证记录）

所有 URL 前缀都是 `https://tss.ucsd.edu`。SAP 常把多个请求打包成一个 `POST …/$batch`（multipart 响应，里面嵌着多段 JSON），所以**同一份数据可能出现在单独请求里，也可能藏在 `$batch` 里**，解析时两种都要处理（见 `reference/tritonplan/extract-odata.ts`）。

### 3.1 首页加载的两个（最关键，和我们目标直接对应）

| 接口 | 格式 | 内容 | 状态 |
|---|---|---|---|
| `GET /sap/opu/odata/ited/BC_OVP_BOOKED_MODULES_SRV/ModuleSet` | OData **v2**：`{"d":{"results":[…]}}` | **已 book 的课**（一行一门课）。字段：`SmShort`="CSE-101"（课程代码）、`SmStext`（课名）、`SmObjid`（补零的 module id）、`AcademicYear`="2026"、`AcademicSession`="002"、`Credits`。只含已选上的，不含 waitlist，无状态字段 | ✅ 已验证 2026-08-11 / 08-21 |
| `GET /sap/opu/odata/ited/EVENT_TIMETABLE_SRV/EventListSet?$filter=(EventDate ge datetime'…' and EventDate le datetime'…')` | OData **v2** | **学生自己的课表，一行 = 一次上课（按日期展开）**。已验证字段：`EventId`、`ModuleId`、`EventDate`=`"/Date(1790208000000)/"`（毫秒 epoch，UTC 零点 → 2026-09-24）、`EventName`、`CourseName`、`TeachingMethod`、`EventIsExam`、`StartTime`/`EndTime`（`PT11H00M00S` 形式）、`Room`、`Location`、`Building`、`StartDate`/`EndDate` 等。**这就是 TSS 首页 Upcoming Events 日历的数据源。** | ✅ 2026-10-19 在用户正常登录、整页刷新后的真实响应再次验证；时间与教室字段已确认。`Room` 有时为空，`Location` 可能只写校园，`Building` 在这份响应中均为空，不能据此假设完整楼名一定存在。 |

**注意**：只有**整页刷新**首页，TSS 才会重新拉这两个接口（SPA 内部跳转不会）。

### 3.2 My Courses 页（首页 Booked Courses 卡片点进去）

| 接口 | 格式 | 内容 | 状态 |
|---|---|---|---|
| `POST /sap/opu/odata/ITUS/PR_MY_MODULES_V2_SRV/$batch` → `ModuleHeaderSet` | v2，在 `$batch` 里 | 每门课 + **book 的是哪个 package**：`EventPackageAbbr`="P-001-001"、`SmStatusText`="Booked"/"Waitlisted"、`WaitlistBooking` | ✅ 已验证 2026-08-19 / 08-21 |

### 3.3 Schedule of Classes（公开课表，补教室 / 教师 / 期末时间用）

| 接口 | 格式 | 内容 | 状态 |
|---|---|---|---|
| 搜课列表 `YUCSD_CON_MODULE` | OData **v4**：`{"@odata.context":…,"value":[…]}` | `CourseAbbr`、`CourseTitle`、`ModuleID`、`CreditsDisplay`、`DepartmentText` | ✅ |
| 某门课的 `_sections` 导航 | v4 | 一行 = (Event × EventPackage)。`EventAbbr`="001-000-LE"、`TeachingMethod`="LE"、`InstructorName`、`EventPkgText`="CSE-008A (P-001-001)"、`BeginDate`/`EndDate`、以及 **`Sched`：一个预格式化的多行字符串** | ✅ |

`Sched` 的语法（解析器范本：`reference/tritonplan/parse-sched.ts`）：

```
M, W, F 1:00 PM - 1:50 PM In Person @ Center Hall 115
Tu, Th 11:00 AM - 12:20 PM In Person @ Galbraith Hall Room 242
Final Examination 12/08/2026 11:30 AM - 2:29 PM In Person @ York Hall Room 2622
Midterm Examination 10/31/2026 10:00 AM - 11:50 AM In Person
Schedule Not Defined
```

- 日期码：`M Tu W Th F Sa Su`，逗号分隔；时间 12 小时制；`@ 地点` 可选（线上课没有）；地点里 `" Room "` 之后是房间号（有的只写 "Center Hall 115"，没有 "Room"）。
- 一门课的 lecture 和 discussion 是**不同的 Event**，各有自己的 `Sched` 行。

### 3.4 其它（本项目用不上，知道即可）

- `ysd_appttimes`：选课时间窗（含学号等 PII，**不要存**）。
- `YUCSD_I_PREREQ_TREE`：先修树。

## 4. 对本项目的结论

2026-10-20 补充：用户手动打开 Schedule of Classes 的正确班次后，助手只读核对到两条 Final Examination 的日期和时间与私有 EventListSet 中的未标记记录一致。证实 `EventIsExam=false` 不等于“不是期末”。0.5.3 按官方校历显示期末周安排，未标记项明确注明，不修改原始字段，不把日期规则当作逐事件考试身份的证明。

2026-10-20 补充验证：用户转述另一位同学安装后“可以用”，说明被动读取方案已在第二个学生账号基本运行。尚无该账号的字段原文或逐项核对结果，因此没有据此新增任何字段假设。

1. **接口可行，时间字段也已验证。** 最省事的数据源是 3.1 的 `EventListSet`：已按日期展开，包含 `StartTime`、`EndTime`、`Room`。2026-10-19 的本地私有抓取有 156 行，其中 111 行有正时长，45 行是零时长的全天标记；有效课程在 2026-09-24 至 2026-12-10。11/11 和 11/26–27 没有有效课程。12/5 和 12/10 各有一条 179 分钟事件，但 `EventIsExam` 均为 `false`，因此不能仅凭该字段把它们标成考试。
2. 这份响应有部分 `Room` 为空，且 `Building` 为空。若要补完整楼名或缺失教室，再去 Schedule of Classes 拿 `_sections.Sched`，用 `EventId` 对 `_sections.EventID`，或用课程代码与 section 对上。`Location` 不能直接当教室；它可能只表示校园。
3. **当前已转向浏览器扩展。** 用户先用 DevTools 验证真实响应，随后明确希望直接在 TSS 官网试用类似插件的成果。当前 `extension/` 被动读取同一响应并在页面显示周课表；方案 A 仍可用于排错。
4. 最坏情况（接口变了 / 抓不到）：手动按 `fixtures/` 的格式填一份 JSON（方案 C），渲染和 ICS 照常工作。渲染与 ICS **只依赖 `schedule.json`**，不依赖 TSS，这是架构上的保险。

## 5. 2026–27 学年关键日期（出处：blink.ucsd.edu 学术日历）

| 学期 | 开学 | 上课开始 | 上课结束 | 期末 | 假期（无课） |
|---|---|---|---|---|---|
| Fall 2026 | 09-21 (Mon) | **09-24 (Thu)** | **12-04 (Fri)** | 12-05 – 12-12 | 11-11 (Wed, Veterans Day)、11-26 – 11-27 (Thanksgiving) |
| Winter 2027 | 01-04 | 01-04 (Mon) | 03-12 (Fri) | 03-13 – 03-20 | 01-18 (MLK)、02-15 (Presidents' Day) |
| Spring 2027 | 03-24 | 03-29 (Mon) | 06-04 (Fri) | 06-05 – 06-11 | 03-26 (Farmworkers Day, 上课前)、05-31 (Memorial Day) |

另外 **2026-11-01 美国夏令时结束**（PDT→PST）。ICS 必须用 `TZID=America/Los_Angeles`，不能写死 UTC 偏移，否则 11 月以后全部课错一小时。

## 6. 相关项目（可以借鉴，不要直接依赖）

| 项目 | 对象 | 和我们的关系 |
|---|---|---|
| [TritonPlan](https://github.com/hfjddjksaj/tritonplan)（MIT） | TSS，选课规划器（扩展 + 静态网页） | 接口字段、被动拦截、`Sched` 解析全部可抄；但它做的是"规划未来的课"，不导出 ICS、不以已选课为中心 |
| [Schtoics](https://github.com/isaiahtx/Schtoics)（GPL） | 旧 WebReg → ICS，Python | 思路参考：抓学术日历、假期挖洞 |
| Calendarize WebReg / WebReg2Cal（Chrome 扩展） | 旧 WebReg | 已过时（WebReg 没了），说明这个需求长期存在 |
| [CapMorningStar/ucsd-schedule](https://github.com/CapMorningStar/ucsd-schedule) | Fall 2026 手动排课 + ICS 的单页 HTML | 一个"方案 C + 单 HTML"的例子 |

## 来源

- [TSS Login and Navigation（UCSD 官方帮助）](https://students.ucsd.edu/my-tritonlink/tools/tool-help/tss-login-nav.html)
- [Triton Student System (TSS) Project（ESR）](https://esr.ucsd.edu/projects/student/ecosystem/core-sis.html)
- [New student system to replace My TritonLink by July（UCSD Guardian）](https://ucsdguardian.org/2026/05/11/new-student-system-to-replace-my-tritonlink-by-july/)
- [Student Tools（含 Schedule of Classes 链接）](https://students.ucsd.edu/my-tritonlink/tools/)
- [Academic and Administrative Calendar 2026–2027](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html)
- [TritonPlan 源码](https://github.com/hfjddjksaj/tritonplan)
