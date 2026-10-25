# 桌面预览版发布

## 2026-10-23 决定

**Chrome 应用商店暂不上架，GitHub Release 是正式下载入口。** 注册 Chrome Web Store 开发者账号需要一次性注册费；[官方注册说明](https://developer.chrome.com/docs/webstore/register/) 明确收费。[2020 年官方公告](https://blog.chromium.org/2020/03/new-developer-dashboard-and.html) 公布金额为 5 美元，并改为所有开发者均需先付费。2026-10-25 复核未找到调整公告，实际付款金额以后台为准。Public / Unlisted / Private 都需注册并经过审核，没有借可见范围绕过收费的免费通道。按约定本次不支付、不提交商店。

以后决定上架时，还需准备：

- 公开隐私网址：[extension/PRIVACY.md](https://github.com/Relay-studio-ucsd/TritonCal/blob/main/extension/PRIVACY.md)。支持入口为 [GitHub Issues](https://github.com/Relay-studio-ucsd/TritonCal/issues)。
- 至少一张 1280×800 的真实插件界面截图，用 fixtures 假数据，不用个人课表。现有商店介绍和 440×280 宣传图草稿可复用，宣传图不能替代截图。见 [官方图片规格](https://developer.chrome.com/docs/webstore/images)。
- 后台填“单一用途”：展示用户已加载的 TSS 课表并提供本地导出。说明 `activeTab` 用于用户点击工具栏后定位当前页面，`tss.ucsd.edu` 用于被动读取页面已有课表，`storage` 仅保存用户选择的语言；勾选“不使用远程代码”。后者是双语功能新增权限，不能遗漏。
- 审核通常几天，部分会到几周；超过三周可联系支持，不能把三周作为保证上限。见 [审核说明](https://developer.chrome.com/docs/webstore/review-process)。新发布者初始最多发布两个扩展，可申请提高限制，见 [发布说明](https://developer.chrome.com/docs/webstore/publish)。
- 现有功能不需要为了商店上架额外改代码；将来提交时仍需重新核对政策和权限说明。

## 当前发布状态

当前版本 **0.6.0**，正在完成 PR 合并后发布。下载入口：[GitHub Releases](https://github.com/Relay-studio-ucsd/TritonCal/releases)。本页在发布成功后更新为实际 Release 链接。

仅上传 `tritoncal-extension-preview-0.6.0.zip`，解压后得到 `extension` 文件夹。ZIP 有 21 个白名单文件，比最初 16 个多了 5 个双语文件；不含 `input/`、`out/`、测试或个人数据。商店候选 ZIP 只作本地准备，不上传 Release，ZIP 不提交源码仓库。

## 发布与验收

1. 六项功能、版本和下载说明通过 PR 合入 `main`。
2. 本地同步 `main`，执行 `npm test`、`npm run package`。
3. 发布 tag `v0.6.0`、标题 `TritonCal 0.6.0`，仅附预览 ZIP，正文含变更、四步安装和隐私链接。
4. 核对 Release 的 tag、附件及中英文 README 链接；更新本文件与 `CLAUDE.md`。

40 项自动测试和中英 Chrome 假数据界面回归通过，覆盖解析、权限与被动获取、典型周 / Final、颜色和语言持久化、离线导出、弹窗、时间标签和圆角滚动。此前用户在 Arc 真实 TSS 页面确认读课表、完整课程文字、ICS 导出，并确认 Final 两门考试；第二账号反馈基本可用，不代表逐项核对。

**仍待人工验证**：TSS 当前无法打开，尚不能在全新浏览器资料中用 Release ZIP 完成真实 TSS 安装验收，也未完成新版本在 TSS 内的语言切换。Windows 原生滚动条和手机真机外观未验证；手机暂不作为当前桌面交付门槛。不得用本地假数据测试代替这些结论。

## 商店介绍草稿（保留待用）

名称：TritonCal — TSS 周课表

简短说明：在 UCSD TSS 中查看清晰的周课表、课程时间和教室，可切换颜色与中英双语并导出日历。

TritonCal 在 TSS 页面右下角提供“课表”入口，把页面已加载的课程整理成典型周和 Final 视图，完整显示课程代码、名称、时间和教室。支持按课上色、单色预设及自定义颜色，并可下载 ICS 日历或离线 HTML。

插件只被动观察 TSS 页面已有数据，不主动请求课表，不参与登录，也不上传课表。安装后请自行刷新 TSS 首页，显示与导出范围以页面实际加载的数据为准。这是独立学生项目，不代表 UC San Diego 官方。手机离线网页仍属实验功能。
