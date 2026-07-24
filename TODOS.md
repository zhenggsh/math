# TODOS

## Textbook

### 为 CSV 框架文件提供在线编辑能力

**What:** 当前「扩充知识点」弹窗的在线编辑模式仅支持 xlsx 框架文件；上传 CSV 的教师仍需回到本地修改。需要让 CSV 文件也能进入编辑模式，编辑后重新序列化为 CSV Blob 参与校验/扩充。

**Why:** 系统上传入口同时接受 `.xlsx` 和 `.csv`（`ExpandKnowledgePointsModal.tsx:535`），但编辑能力只覆盖 xlsx，功能面不一致，会让上传 CSV 的用户困惑并被迫离线修改。

**Context:** 设计 doc `扩充知识点在线编辑` 明确本期聚焦 xlsx，CSV 编辑被禁用并提示「请在本地修改后重新上传」。后续实现时可复用 `FrameworkEditor` 的表格编辑逻辑，但需要新增 `serializeCsvPreview` 并处理 CSV 引号、换行、分隔符等边界。相关文件包括 `web/src/utils/textbookFilePreview.ts`、`web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`。

**Effort:** M
**Priority:** P2
**Depends on:** 在线编辑基础能力（xlsx）上线

### 为扩充知识点编辑器增加 undo/redo 支持

**What:** 当前设计明确本期不做 undo/redo，教师误操作后依赖草稿恢复或重新上传源文件来回退。需要为 xlsx 行操作、md 文本编辑、批量标题层级替换增加撤销/重做能力。

**Why:** 编辑器缺少撤销是明显 UX 缺口。教师在弹窗内增删行、批量替换标题层级时容易误操作，没有 undo 会增加焦虑感和修复成本。

**Context:** 设计 doc `扩充知识点在线编辑` 把 undo/redo 列为 Open Question，本期建议不做，用草稿恢复替代。后续实现时可在 `useExpansionEditor` hook 中维护一份操作历史栈，按 action 粒度（addRow/deleteRow/updateRow/updateMdContent/batchReplaceHeadings）支持撤销/重做。需要与草稿持久化和「是否有未保存编辑」判断兼容。

**Effort:** M
**Priority:** P2
**Depends on:** `useExpansionEditor` hook 与编辑器基础实现完成

## Completed

## TODO-3: CSV 扩充写入的异构表头风险

- **What:** `appendCsvRows` 为纯文本按位置追加（无表头映射）。当前调用方已统一传规范列序 `[一级,二级,三级,定义,特性,重要性,编号]`，但若未来加入表头顺序不同的 CSV 教材，扩充会写错列。
- **Why:** xlsx 路径已修复为"框架 sheet 检测 + 表头名映射"（Task 2），csv 路径仍是位置追加，无防护。
- **Pros:** 与 xlsx 行为统一，消除静默错列风险。
- **Cons:** iksm/ 目前无 csv 教材，风险是潜在的而非现役。
- **Context:** `server/src/modules/textbook/textbook-file.service.ts` `appendCsvRows`；Task 2 质量评审 Important 项记录（2026-07-24）。
- **Depends on:** 无。可在 csv 教材实际出现时再处理，或下次触碰该文件时顺手加表头校验。

## TODO-4: xlsx 表头扫描循环的前后端/跨服务重复

- **What:** "跳过空行找第一个非空行作表头"的循环目前有三处近似实现：parser `sheetToRecords`、file service `appendXlsxRows` 内联、前端 `sheetToRecords`（镜像）。
- **Why:** 三处必须保持语义一致（trim、首个非空行），目前没有机制保证。
- **Pros:** 收敛为一处（如 parser 暴露 `getSheetHeaders(worksheet)` 或在 `DetectedFrameworkSheet` 上带 `headers`）可消除漂移风险。
- **Cons:** sheet_to_json 会丢列索引，完全复用不可行，只能部分收敛。
- **Context:** Task 2 质量评审 Important #2（2026-07-24）；前后端镜像已加"修改时必须与服务端保持同步"注释。
- **Depends on:** 无。

## TODO-5: 教材封面 C 类统计行

- **What:** math01.xlsx 封面只有 `A类（核心）`/`B类（拓展）` 统计行，无 C 类行；框架 sheet 现有 C=2 个知识点，封面分布不完整（73+7≠82）。
- **Why:** 封面统计自洽性；原文件设计如此（修复时遵循"只更新数值不新增行"的最小改动原则）。
- **Pros:** 补一行 C 类统计使封面 A+B+C=总数自洽。
- **Cons:** 改动封面版式，可能与其他教材封面模板不一致。
- **Context:** Task 3 修复脚本 `server/scripts/repair-math01-xlsx.ts`；math02 封面是否有同样问题可一并检查。
- **Depends on:** 无。

## TODO-6: 详情页扩充后整页 Spin 闪烁

- **What:** 扩充成功后 `fetchTextbook` 将 `loading=true`，页面早退整页 Spin，双栏被卸载重建（MdPreview 滚动状态丢失）。
- **Why:** 双栏成为页面主体后，整页刷新闪烁感明显。
- **Pros:** 改为非阻塞刷新标志（仅信息卡局部 loading），体验更稳。
- **Cons:** 需调整 useTextbookDetail 的 loading 语义，小心影响其他调用方。
- **Context:** Task 10 质量评审 Minor #3（2026-07-24）；`TextbookDetailPage.tsx` + `useTextbookDetail.ts`。
- **Depends on:** 无。

## TODO-7: 分歧检测目前只覆盖框架文件

- **What:** 详情页"文件与数据库不一致"提示只比较框架文件 mtime 与 DB lastModifiedAt，md 内容文件未纳入。
- **Why:** md 是点击定位的数据源，它过期时用户不知情。
- **Pros:** md 分歧也可见。
- **Cons:** 两个文件分别提示会让 UI 变复杂，需要设计呈现方式。
- **Context:** Task 10 质量评审 Minor #5（2026-07-24）；可并入第三期一致性校验统一处理。
- **Depends on:** 第三期（三方一致性校验）。
