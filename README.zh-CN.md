# TritonCal — UCSD TSS 周课表

[English](README.md) | 简体中文

TritonCal 是电脑端 Chrome / Arc 浏览器扩展。它读取 UCSD TSS 首页已经加载的课程，显示典型周和 Final 视图，完整显示课程代码、课名、时间和教室，并可导出日历文件（.ics）或独立的离线 HTML 课表。这是独立学生项目，与 UC San Diego 官方没有隶属或背书关系。

当前版本：**0.7.0**。安装包在 [GitHub Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases) 发布，首个 Release 仍在准备中。Chrome 应用商店因开发者注册需付费，暂不上架。

## 安装与使用

使用插件不需要 Node 或 npm。完整说明见 [插件说明](extension/README.md)（English: [extension/README.en.md](extension/README.en.md)）。

1. 从 [Releases 页面](https://github.com/Relay-studio-ucsd/TritonCal/releases) 下载 `tritoncal-extension-preview-<版本号>.zip`，解压得到 `extension` 文件夹。
2. 打开 `chrome://extensions`（Arc：`arc://extensions`），启用开发者模式，点“加载已解压的扩展程序”，选择 `extension` 文件夹；里面应直接包含 `manifest.json`。
3. 自己登录 TSS 首页并整页刷新。
4. 点击页面右下角“课表”，再点“打开周视图”。界面默认中文，点 **English** 可切换。

## 数据与限制

插件只被动读取 TSS 页面已经收到的课表响应：不主动请求、不重放、不轮询 TSS，不自动点击，不参与登录，也不上传课表。课程只保存在当前标签页内存中，只有颜色和语言偏好保存在本地。导出的文件包含个人课表，请勿随意分享。详见 [隐私说明](extension/PRIVACY.md)。

TSS 加载的数据不完整时，课表也不完整。典型周只显示出现次数达到已读取周数一半（向上取整）的固定时段。Final 按 [UCSD 官方校历](https://blink.ucsd.edu/instructors/resources/academic/calendars/2026.html) 覆盖 2026 秋至 2027 春；这些期末周里没有考试标记的安排显示为“期末周安排”，请以课程详情中的 Final Examination 为准。其他学期只显示 TSS 明确标记的考试，可能包含期中。Final 为空不代表没有考试。

目前以电脑端为主；Windows 外观和手机真机尚未验收。导出文件是快照，不会自动更新。

## 开发

```sh
git clone https://github.com/Relay-studio-ucsd/TritonCal.git
cd TritonCal
npm test
npm run package
```

需要 Node.js ≥ 20，无 npm 依赖。`npm run package` 重新生成内置翻译，并按白名单在 `out/` 生成预览包和商店候选包。

全部技术文档（英文）见 [MAINDOC.md](MAINDOC.md)，AI 助手从 [AGENTS.md](AGENTS.md) 开始。个人抓取数据放在被忽略的 `input/`，生成物放在被忽略的 `out/`。
