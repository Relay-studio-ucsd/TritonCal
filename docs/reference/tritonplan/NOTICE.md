# 来源说明

本目录下的 `.ts` 文件原样复制自开源项目 **TritonPlan**（MIT License）：
<https://github.com/hfjddjksaj/tritonplan>（2026-10-02 快照）

- `interceptor.ts` — 在 TSS 页面里被动包装 fetch/XHR、复制 OData 响应的参考实现（我们"只读不发"原则的范本）
- `extract-odata.ts` — 把 OData v4 JSON / OData v2 `{"d":{"results":[]}}` / multipart `$batch` 响应拆成行的参考实现
- `tss-types.ts` — TSS 各个接口的字段定义，带"已验证日期"注释，是最有价值的一份资料
- `parse-sched.ts` — `Sched` 字符串（"M, W, F 1:00 PM - 1:50 PM In Person @ Center Hall 115"）的解析器
- `time.ts` — 12 小时制 ↔ "HH:MM" 的小工具

它们是 **参考**，不是本项目的代码。本项目用纯 JS，不依赖 TritonPlan 的包结构（`@triton/shared` 等 import 在这里解析不了，这是正常的）。
抄思路、抄正则、抄字段名都可以；整段复制时保留 MIT 版权声明。
