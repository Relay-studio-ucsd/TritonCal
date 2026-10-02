# kebiao — UCSD TSS 课表美化 + 日历导出

UCSD 2026 年秋季起用新系统 TSS（Triton Student System）替换了 TritonLink/WebReg。
TSS 首页的 "Upcoming Events" 日历不显示教室，官方也没有导出到手机日历的功能。这个项目把你已经选上的课：

1. 渲染成一张清晰的周课表（HTML，可截图）；
2. 导出成 `.ics`，导入 Google / Apple 日历，假期自动空出。

数据来源是你自己浏览器里 TSS 页面已经加载的内容（被动读取，不主动请求服务器）。

## 怎么开始（给新同学）

1. 克隆本仓库，安装 Node.js ≥ 20。
2. 在项目目录打开 Claude Code（或任何会读 `CLAUDE.md` / `AGENTS.md` 的 AI 编程工具）。
3. 第一句话就说：**"读 CLAUDE.md，从当前状态里第一个没完成的里程碑开始。"**
4. 之后跟着 AI 走。需要你去浏览器抓数据时，它会给你一步步的操作。

人类阅读顺序：`CLAUDE.md` → `docs/01` → `docs/02` → `docs/03` → `docs/04`。

## 关于设计

`docs/reference/screenshots/` 里的两张图（苹果日历、旧 WebReg 课表）**只是设计参考**。
具体长什么样，AI 会在开始画课表之前问你，最好先出几个小样让你挑。你有自己的想法就直接说。

## 状态

见 `CLAUDE.md` 底部"当前状态"。
