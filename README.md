# TritonCal — UCSD TSS 周课表

[English](README.en.md)

TritonCal 是电脑端 Arc / Chrome 浏览器扩展。0.6.0 被动读取 TSS 页面已经收到的课程响应，显示典型周 / Final、时间和教室，支持配色与中英文切换，以及 ICS 和离线 HTML 导出。正式下载入口为 GitHub Release；Chrome 应用商店暂不上架。

## 安装与使用

1. 到本仓库 [Releases 页面](https://github.com/Relay-studio-ucsd/TritonCal/releases) 下载 `tritoncal-extension-preview-0.6.0.zip`，解压后得到 `extension` 文件夹。
2. 打开 `chrome://extensions`，启用开发者模式。
3. 选择“加载已解压的扩展程序”，选择解压得到的 `extension` 文件夹；里面应直接包含 `manifest.json`。
4. 自己登录 TSS 首页并整页刷新。
5. 点击页面右下角“课表”，再点“打开周视图”。

使用插件不需要 Node 或 npm。详细安装、更新、卸载和排错见 [插件说明](extension/README.md)，隐私规则见 [PRIVACY.md](extension/PRIVACY.md)。

## 开发、测试与打包

开发需要 Node.js >= 20，不需要安装 npm 依赖。

```sh
git clone https://github.com/Relay-studio-ucsd/TritonCal.git
cd TritonCal
npm test
npm run package
```

等价的直接运行方式：

```sh
node --test tests/*.test.cjs
node scripts/build-locales.cjs
node scripts/package.cjs
```

打包脚本只读取明确列出的插件发行文件，在 `out/` 生成分享包和商店候选包。分享包包含 `extension/` 文件夹，商店候选包根目录直接放 `manifest.json`。输出的 ZIP 不提交到源码仓库。

## 数据与当前进度

插件不主动请求 TSS、不参与登录、不自动点击，不上传课表；课程只保存在当前标签页内存中。真实抓取放在被忽略的 `input/`，测试使用虚构数据。安装包仅包含插件文件。

当前版本为 **0.6.0**，安装包统一从 [GitHub Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases) 下载。40 项自动测试及中英 Chrome 假数据界面回归通过；TSS 人工语言切换、Windows 和手机真机验收仍有待办。变更和验证范围见 [Issue #3 修复记录](docs/06-issue-3.md)。

实际路线已经从最初的静态 HTML 计划转为只读 MV3 扩展，原因是用户优先希望直接在 TSS 中使用。背景、技术约束和发布条件见 [CLAUDE.md](CLAUDE.md)、[路线图](docs/04-roadmap.md) 和 [发布准备](docs/05-release.md)。
