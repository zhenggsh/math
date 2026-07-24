# Design: add-textbook-file-preview

## Context

教材详情页（`/teacher/textbooks/:id`）当前为"教材信息卡 + DB 知识点表格"。维护教材需对照 `iksm/` 下的真实文件（xlsx 框架 + md 内容），但系统内无法查看。扩充知识点弹窗（`ExpandKnowledgePointsModal`）已有一套验证过的文件预览与联动组件（`FrameworkPreview`/`MdPreview`/`findMdLineByCode`）。

工程评审（plan-eng-review + Outside Voice）发现两个关键事实：

1. **进行中的数据损坏**：`appendXlsxRows`（textbook-file.service.ts:248）硬编码写 `SheetNames[0]` 并按位置硬编码列序 `[知识点编号, 一级知识点, ...]`；但真实教材 xlsx 均为 `[封面, 知识点框架]` 双 sheet 且编号列在最后。math01.xlsx 封面已被 28 行错位三角函数数据污染，框架 sheet 缺失全部 2.4.x 行——DB/md/xlsx 三方分歧已存在。
2. **前后端解析分歧 4 处**：sheet 选择（SheetNames[0] vs parser 检测）、表头 trim、空行处理、0 值转换。

本设计已通过的评审：office-hours 设计文档（APPROVED，3 轮对抗评审 9/10）、plan-eng-review（ENG CLEARED，2 issues + 21 test gaps + Outside Voice 3 张力点全部采纳）。

## Goals / Non-Goals

**Goals:**
- 详情页内直接预览 iksm 磁盘上的两个教材文件（文件是真相源，不读 DB）
- 点击框架行定位高亮 md 对应标题行（一/二/三级编号均可）
- 扩充成功后双栏自动刷新并高亮新增行，闭环真实可用
- 修复 xlsx 写路径（框架 sheet + 表头名列映射）并修复 math01.xlsx 数据
- 前端弹窗预览与服务端解析行为统一（镜像实现 + 共享夹具）
- 文件与 DB 修改时间分歧可见（只读提示）

**Non-Goals:**
- 知识点 CRUD 三方同步、md 整文件编辑（第二期）
- 三方一致性校验、refresh 同步按钮（第三期；refresh 会 cascade 删学习记录，需完整确认交互）
- md 渲染视图（KaTeX/Mermaid）或双模式切换（第二期与编辑同行）
- 路径遍历防护、定位正则连字符扩展（记入 TODOS.md，本期不实施）
- workspace 共享包（镜像实现已够）

## Decisions

### D1: 预览数据源 = 磁盘文件，不是 DB
需求原文是"看到 iksm 下的两个文件"。新增 `GET /textbooks/:id/framework-file`（parser 解析全量行 + sheetName + fs mtime）和 `GET /textbooks/:id/content-file`（md 原文 + mtime）。鉴权限定 TEACHER/ADMIN（有意收紧：详情页在 /teacher 路由下；现有 GET 列表/详情对 STUDENT 开放，新端点不开放）。路径解析必须复用 `TextbookFileService.getFilePath()`。
- 备选：读 DB 渲染框架——否决，违背"文件是真相源"，且 DB 与文件已分歧。

### D2: 右侧 md 用行号原文视图（复用 MdPreview），非渲染视图
与扩充弹窗像素级一致（用户要求"参照扩充界面"）；`findMdLineByCode` 按行定位已验证可靠。渲染视图需标题锚点改造，是本期最大新增复杂度，留待第二期与 md 编辑同行。
- 备选：渲染视图 / 双模式切换——否决（范围膨胀）。

### D3: 组件迁移 + 纯函数抽取（方案 B），并加深到解析层统一
`FrameworkPreview`/`MdPreview` 已是独立组件，移动到 `web/src/components/textbook-preview/` 并更新引用（空态文案改 `emptyDescription` prop、`highlightedCode` 扩展为 `highlightedCodes?: string[]`）；`findMdLineByCode` 从弹窗内联抽出为**纯函数** `web/src/utils/mdLineLocator.ts`（不用 hook——无 React 状态）。弹窗改引用，行为零变化。
同时把 sheet 检测与表头 trim 在前后端**镜像实现**（同一算法、共享多 sheet 测试夹具），兑现"弹窗与详情页行为一致"。
- 备选：方案 A（不动弹窗，直接引用）——保留为降级预案：若弹窗回归测试暴露问题，允许降级，端点设计不受影响。
- 备选：workspace 共享包——否决（两个小函数，过度设计）。

### D4: appendXlsxRows 修复 = 框架 sheet 检测 + 表头名列映射
parser 的框架 sheet 检测逻辑（选第一个含合规框架的 sheet）暴露出来（含返回 sheetName），`appendXlsxRows` 改为：定位同一框架 sheet 写入；列按表头名映射（真实文件编号列在最后）。前端 `parseXlsxPreview` 镜像同一 sheet 检测。
- 备选：记录为限制不修复——否决（Outside Voice 证伪"单 sheet"前提；不修则扩充→预览→高亮闭环注定失败，数据持续损坏）。

### D5: math01.xlsx 数据修复随本期交付
备份到 `.bak/` 后：清除封面行 15-42 的 28 行错位数据；将 2.4 框架行（编号 2.4.x、重要性等，以 DB 中已存在的扩充数据为准）按正确列序补入知识点框架 sheet；检查 math02.xlsx 是否同样被污染并同样处理。修复后验证 DB/md/xlsx 三方一致。
- 备选：只修代码不修数据——否决（脏数据留存，预览页面会展示错位的封面数据）。

### D6: 扩充成功联动 = refetch + highlightedCodes + rows 依赖
expand 成功后自动重新拉取两个文件端点，`FrameworkPreview` 高亮 `addedCodes`；3 秒取消高亮定时器从现有 `newPointCodes` 代码移植。**滚动 effect 依赖必须同时含 highlightedCodes 和 rows**（否则 jsdom 测试假绿、真实浏览器滚动静默失败——Outside Voice 发现）。
- 备选：手动"重新加载"按钮即可——否决（闭环断裂；按钮保留作为补充）。

### D7: 移除 DB 知识点表格，加分歧提示 Tag
xlsx 预览与 DB 表格信息重复，DB 视图在学习页已有更好呈现。作为补偿：页面展示文件 mtime 与 DB lastModifiedAt，分歧时显示黄色警告 Tag（只读提示）。**不提供 refresh 按钮**——refresh 是全量重建且 cascade 删除学习记录，破坏性操作属于第三期校验功能。
- 备选：保留表格为第三个 Tab——否决（冗余且延续双数据源心智负担）。

## Risks / Trade-offs

- [扩充弹窗重构回归（836 行 + 草稿逻辑）] → 现有测试必须全绿 + 手动回归三步流程；保留方案 A 降级预案
- [镜像实现的前后端解析逻辑未来漂移] → 共享多 sheet 测试夹具（封面在前的 xlsx），两端跑同一夹具断言一致
- [数据修复脚本写错 xlsx] → 修复前备份到 .bak/；修复后用脚本断言（框架 sheet 含全部 2.4.x、封面无知识点行）验证
- [2400 行 md 全量渲染卡顿] → 本期全量实现并手动实测 math01.md；卡顿则后续引入虚拟滚动（Open Question）
- [csv 框架文件行为不一致] → appendCsvRows 为纯文本追加本就安全；framework-file 端点对 csv 同样返回全量行（fileType 区分）

## Migration Plan

1. T1 后端：sheet 检测暴露 + appendXlsxRows 修复 + Jest 多 sheet 夹具（先行，止血）
2. T2 数据修复：备份 → 修复 math01 → 检查 math02 → 脚本断言验证
3. T3 后端：两个新端点 + Jest（依赖 T1 的 sheet 检测）
4. T4 前端：parseXlsxPreview 镜像对齐 + 共享夹具（可与 T1-T3 并行）
5. T5 前端：组件迁移 + locator 抽取 + 弹窗回归（可与 T1-T3 并行）
6. T6 前端：详情页双栏改造 + 联动 + 分歧提示 + 扩充联动（依赖 T3、T5）
7. T7 全量手动验证（按 eng-review 测试计划）

回滚：代码按 commit 回滚；iksm 数据从 .bak/ 恢复。无 DB schema 变更，无破坏性部署步骤。

## Open Questions

1. 大 md 文件（2000+ 行）全量渲染性能：先实测 math01.md，卡顿再引入虚拟滚动（react-window）
2. 多 sheet 教材未来是否还会出现新的读写路径分歧：第三期一致性校验是最终兜底
