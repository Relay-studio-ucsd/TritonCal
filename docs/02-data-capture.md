# 02 · 把自己的课表数据拿出来

三档方案，从零代码到浏览器脚本。**第一版用方案 A**，跑通后再考虑 B；C 是保底，也用来造测试数据。
不管哪档，**原则都是被动**：只复制浏览器已经收到的东西。

## 方案 A：DevTools 手动另存（零代码，推荐先做）

给用户的操作步骤（AI 可以原样复制给用户）：

1. 用 **Chrome** 打开 <https://tss.ucsd.edu/fiori>，自己登录（AI 不参与登录）。
2. 按 **F12**（Mac：`Cmd+Option+I`）打开 DevTools → 顶部选 **Network** 标签。
3. 在 Network 的过滤框里输入 **`odata`**；勾选 **Preserve log**。
4. **整页刷新**（`Cmd+R` / `F5`）。注意：必须整页刷新，SPA 内部点来点去不会重新请求首页数据。
5. 等页面加载完，在请求列表里找这两个名字（可能是单独一行，也可能藏在叫 **`$batch`** 的行里）：
   - `EventListSet?$filter=(EventDate ...`　← 课表（按日期展开）
   - `ModuleSet`（URL 含 `BC_OVP_BOOKED_MODULES_SRV`）　← 已 book 的课
6. 点开一行 → 右侧 **Response** 标签 → 在响应文本里右键 → **Copy** / 或者直接全选复制 → 粘贴保存为：
   - `input/timetable.json`（EventListSet 的响应）
   - `input/booked.json`（ModuleSet 的响应）
   - 如果它们在 `$batch` 里，整段响应（multipart 文本）存成 `input/home-batch.txt`，解析器会从里面挖 JSON。
7. **更省事的替代**：在请求列表任意处右键 → **Save all as HAR with content** → 存成 `input/tss.har`。HAR 是标准 JSON，解析器直接读里面每个 response 的 `content.text`。
8. 如果课表响应里没有教室：打开 **Schedule of Classes**（`#YSchedule-view`），搜每一门已选的课并点进去看 sections，Network 里会出现 `_sections` 请求，响应另存为 `input/sections-<课程代码>.json`。

**首次抓到后要做的验证（M3 的第一步）**：让用户把 `input/timetable.json` 里**任意一行**的字段名列出来（只要 key，不要值），贴给 AI；AI 据此更新 `docs/01` 的"待验证"项（时间字段、教室字段叫什么），然后再写解析器。
已知每行一定有：`EventId, ModuleId, EventDate, EventName, CourseName, TeachingMethod, EventIsExam`。

### 关于 `$batch` 响应的样子

```
--BATCH_xxx
Content-Type: application/http
Content-Transfer-Encoding: binary

HTTP/1.1 200 OK
Content-Type: application/json

{"d":{"results":[{"__metadata":{"type":"ITED_EVENT_TIMETABLE_SRV.EventList"},"EventId":"00001078",...}]}}
--BATCH_xxx--
```

解析办法：找每个 `{"d":` 开头的位置，做括号匹配截出完整 JSON，`JSON.parse`，按 `__metadata.type` 判断是哪个接口的行（`EVENT_TIMETABLE_SRV.EventList` / `BC_OVP_BOOKED_MODULES_SRV.Module` / `PR_MY_MODULES_V2_SRV.ModuleHeader`）。参考实现 `reference/tritonplan/extract-odata.ts` 里的 `extractV2Results` + `matchBrace`。

### SAP 的日期格式

`"EventDate": "/Date(1790208000000)/"` → 取括号里的毫秒数 → `new Date(ms)` → 是 **UTC 零点**，表示那一天的日期。
正确做法：`new Date(ms).toISOString().slice(0, 10)` 得到 `"2026-09-24"`。**不要**用本地时区转换，否则在美西会退到前一天晚上。
时间字段（待验证）如果是 `"PT13H00M00S"` 这种 ISO 8601 duration（SAP OData v2 的 `Edm.Time` 常见写法），解析成 `13:00`。

## 方案 B：浏览器脚本自动收集（便利性优化，M4 之后）

两种实现，都是把 `reference/tritonplan/interceptor.ts` 的思路搬过来：在 TSS 页面里包装 `window.fetch` 和 `XMLHttpRequest`，对 URL 含 `/odata` 的响应 `clone()` 读一份文本存起来，页面上放一个"下载 schedule.json"按钮。

| 形式 | 优点 | 缺点 |
|---|---|---|
| **Tampermonkey 油猴脚本**（`@run-at document-start`） | 一个文件，装个插件就能用，不用审核 | 需要用户装 Tampermonkey |
| **Chrome MV3 扩展**（load unpacked） | 不依赖第三方插件 | 要写 manifest、content script 分 MAIN/isolated world 两层传消息，复杂一截 |

红线同 `CLAUDE.md`：脚本**只观察**，不发请求、不点按钮、不改页面数据。权限只申请 `tss.ucsd.edu`。

## 方案 C：手动填 JSON（保底 + 测试数据）

按 `docs/03-data-model.md` 的 `schedule.json` 格式手填。`fixtures/fall2026-sample.json` 就是从苹果日历截图手抄的一份，可以复制改。
一学期通常 4–5 门课、8–10 个时间块，手填十分钟。渲染和 ICS 不关心数据是抓的还是填的。
