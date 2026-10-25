# 界面文字清单 · 中英双语

0.5.5 使用用户选择的 en / zh_CN（首次默认中文），与浏览器语言独立；日期跟随选择，离线文件嵌入生成时的翻译。标准 messages.json 是唯一翻译源，修改后运行 `npm run build:locales` 生成本地注入脚本。中英本地浏览器测试均通过；英文界面仅语言按钮特意显示“中文”，课程原文保留。新增键时同步两个 messages.json，并运行键/占位符与生成文件一致性测试。浏览器管理页的清单文案仍由 Chrome 标准 i18n 处理。

替换前按用户可见位置整理。`$1` 等表示动态值；星期和日期交给用户所选语言对应的 Intl.DateTimeFormat。课程原文不翻译。ICS 的固定标签统一采用英文 Exam / Lecture / Course。

| Key | 文件 | 中文原文 | English |
|---|---|---|---|
| switchLanguage | popup.js, content.js, week-view.js | English | 中文 |
| name | manifest.json | TritonCal · 课表实验版 | TritonCal · Schedule Preview |
| description | manifest.json | 只读取 TSS 页面已加载的课表响应，显示周课表并导出日历或手机离线课表。 | View your TSS schedule and export a calendar or offline timetable using only data already loaded by TSS. |
| actionTitle | manifest.json | 查看课表 | View schedule |
| schedule | content.js | 课表 | Schedule |
| openWeek | content.js, popup.html | 打开周视图 | Open week view |
| typical | content.js, week-view.js | 典型周 | Typical week |
| final | content.js, week-view.js | Final | Final |
| loadingTab | popup.html | 正在读取当前标签页… | Reading the current tab… |
| openTss | popup.js | 请先打开 TSS 官网，再点击插件图标。 | Open the TSS website, then click the extension icon. |
| popupHint | popup.js | 课表在 TSS 页面右下角的「课表」按钮里 | Find your schedule using the Schedule button at the bottom right of TSS. |
| tabError | popup.js | 无法读取此标签页。请在 TSS 首页刷新后重试。 | Cannot read this tab. Refresh the TSS home page and try again. |
| waitingRetry | popup.js | 尚未收到课表。保持插件启用，刷新 TSS 首页后重试。 | No schedule received yet. Keep the extension enabled, refresh the TSS home page and try again. |
| openError | popup.js | 无法打开课表。请在 TSS 首页刷新后重试。 | Cannot open the schedule. Refresh the TSS home page and try again. |
| waitingTss | content.js | 等待 TSS 页面加载课表… | Waiting for TSS to load your schedule… |
| scheduleCount | content.js | 课表 · $1 | Schedule · $1 |
| panelCount | content.js | 典型周 $1 个时段；已读取 $2 次课程。 | $1 regular slots; $2 events loaded. |
| panelEmpty | content.js | 没有符合频次条件的常规课程，可打开周视图查看 Final。 | No regular classes meet the frequency threshold. Open the week view to check Final. |
| roomUnknown | content.js, week-view.js, offline.js | 教室待确认 | Room to be confirmed |
| titleUnknown | week-view.js, offline.js | 课名待确认 | Course title to be confirmed |
| unnamedCourse | parser.js | 未命名课程 | Unnamed course |
| dialogTitle | week-view.js | TritonCal 周课表 | TritonCal weekly schedule |
| typicalRange | week-view.js | 每周 $1 个常规时段 · 按已读取的 $2 周归并 | $1 regular slots per week · based on $2 weeks of loaded data |
| finalRange | week-view.js | $1 — $2 · $3 项安排 | $1 — $2 · $3 events |
| noFinalLoaded | week-view.js | 尚未读到期末安排 | No finals-period events loaded yet |
| closeWeek | week-view.js | 关闭周课表 | Close week view |
| palette | week-view.js | 单色颜色 | Single-color palette |
| mist | week-view.js | 雾蓝 | Mist blue |
| ocean | week-view.js | 海蓝 | Ocean blue |
| lavender | week-view.js | 藤紫 | Lavender |
| sage | week-view.js | 鼠尾草 | Sage |
| olive | week-view.js | 橄榄 | Olive |
| sand | week-view.js | 沙金 | Sand |
| rose | week-view.js | 玫瑰 | Rose |
| swatchLabel | week-view.js | 单色：$1 | Single color: $1 |
| custom | week-view.js | 自定义 | Custom |
| customColor | week-view.js | 自定义单色 | Custom single color |
| courseColors | week-view.js, offline.js | 按课上色 | By course |
| mono | week-view.js, offline.js | 单色 | Single color |
| exportIcs | week-view.js | 导出已读取课程 (.ics · $1 条) | Export loaded events (.ics · $1) |
| exportOffline | week-view.js | 下载手机离线课表 (.html) | Download offline schedule (.html) |
| typicalNote | week-view.js | 同一时段至少出现 $1 周才列入典型周；请先让 TSS 加载完整学期。导出仍包含已读取的全部日期。 | A slot must occur in at least $1 weeks to appear here. Let TSS load the full term. Exports include all loaded dates. |
| finalNote | week-view.js | 按 UCSD 官方期末周显示已读取安排（校历覆盖 2026 秋至 2027 春）。 | Shows loaded events during UCSD's official finals periods (Fall 2026 through Spring 2027). |
| unmarkedNote | week-view.js | 其中 $1 项未被 TSS 标记为考试，请以课程详情的 Final Examination 为准。 | $1 events have no TSS exam flag. Confirm them against Final Examination in the course details. |
| unknownTermNote | week-view.js | 另含未覆盖学期的 TSS 已标记考试，需在课程详情确认是否为期末。 | Also includes TSS-flagged exams from terms outside this calendar. Check the course details to confirm whether they are finals. |
| typicalEmpty | week-view.js | 没有符合频次条件的常规课程。 | No regular classes meet the frequency threshold. |
| finalEmpty | week-view.js | 尚未读到期末周安排；这不代表没有考试。请在 TSS 课程详情核对 Final Examination，并让首页加载完整学期。 | No finals-period events loaded yet. This does not mean you have no exams. Check Final Examination in the TSS course details and let the home page load the full term. |
| exam | week-view.js, offline.js | 考试 | Exam |
| finalEvent | week-view.js | 期末周安排 | Finals-period event |
| offlineTitle | offline.js | TritonCal 离线课表 | TritonCal offline schedule |
| offlineHeading | offline.js | 离线周课表 | Offline weekly schedule |
| previousWeek | offline.js | ← 上周 | ← Previous week |
| thisWeek | offline.js | 本周 | This week |
| nextWeek | offline.js | 下周 → | Next week → |
| offlineSource | offline.js | 下载时已读取 $1 次课程 · $2—$3 · 此文件是离线快照，不会自动更新 | $1 events loaded at download · $2–$3 · This is an offline snapshot and will not update automatically. |
| offlineEmpty | offline.js | 此文件没有已读取的课程。 | This file contains no loaded events. |
| offlineRange | offline.js | $1 — $2 · $3 次课程 | $1 — $2 · $3 events |
| noClasses | offline.js | 无课程 | No classes |
