# TritonCal — UCSD TSS 周课表

TritonCal 0.5.1 是电脑端 Arc / Chrome 浏览器扩展。它被动读取 TSS 页面已经收到的课程响应，显示周课表、时间和教室，支持周切换、配色切换，以及 ICS 和离线 HTML 导出。

## 安装与使用

1. 下载本仓库源码并解压，或使用 Git 克隆本仓库。
2. 打开 `chrome://extensions`，启用开发者模式。
3. 选择“加载已解压的扩展程序”，选择仓库里的 `extension` 文件夹；里面应直接包含 `manifest.json`。
4. 自己登录 TSS 首页并整页刷新。
5. 点击页面右下角“本周课表”，再点“打开周视图”。

使用插件不需要 Node 或 npm。详细安装、更新、卸载和排错见 [插件说明](extension/README.md)，隐私规则见 [PRIVACY.md](extension/PRIVACY.md)。

## 开发、测试与打包

开发需要 Node.js >= 20，不需要安装 npm 依赖。

```sh
npm test
npm run package
```

等价的直接运行方式：

```sh
node --test
node scripts/package.cjs
```

打包脚本只读取明确列出的插件发行文件，在 `out/` 生成分享包和商店候选包。分享包包含 `extension/` 文件夹，商店候选包根目录直接放 `manifest.json`。输出的 ZIP 不提交到源码仓库。

## 数据与当前进度

插件不主动请求 TSS、不参与登录、不自动点击，不上传课表；课程只保存在当前标签页内存中。真实抓取放在被忽略的 `input/`，测试使用虚构数据。安装包仅包含插件文件。

本次 Issue #1 整理的是 0.5.1 基线源码、测试和打包脚本；后续功能调整另行提交。23 项自动测试覆盖原有功能和打包文件白名单。第一账号历史上已完成 Arc 和 Google Calendar 实测，第二账号仅收到基本可用反馈；Windows 和手机特殊情况不能据此宣称完整验收。

实际路线已经从最初的静态 HTML 计划转为只读 MV3 扩展，原因是用户优先希望直接在 TSS 中使用。背景、技术约束和发布条件见 [CLAUDE.md](CLAUDE.md)、[路线图](docs/04-roadmap.md) 和 [发布准备](docs/05-release.md)。
