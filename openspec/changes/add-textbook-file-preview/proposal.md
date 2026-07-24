# Proposal: add-textbook-file-preview

## Why

教材详情页目前只能看到教材元数据和 DB 知识点表格，维护教材时想看 `iksm/` 目录下的真实文件（`{name}.xlsx` 框架 + `{name}.md` 内容）必须离开系统打开 Excel/Typora 对照。同时工程评审发现**进行中的数据完整性 bug**：`appendXlsxRows` 硬编码写入 `SheetNames[0]`（封面 sheet）且按位置硬编码列序，导致扩充功能持续污染 xlsx 文件（math01.xlsx 封面已被 28 行错位数据污染，DB/md/xlsx 三方已分歧）——写路径修复与数据修复必须随本期一并完成。

## What Changes

- 新增 2 个只读端点：`GET /textbooks/:id/framework-file`（解析 xlsx/csv 返回全量行 + sheetName + mtime）和 `GET /textbooks/:id/content-file`（返回 md 原文 + mtime），TEACHER/ADMIN 鉴权
- 改造 `TextbookDetailPage` 为 Allotment 双栏布局：左侧 xlsx 框架预览、右侧 md 行号视图，点击框架行定位高亮 md 对应标题（复用扩充弹窗的预览组件与定位逻辑）
- 移除详情页 DB 知识点表格（信息被文件预览覆盖）；扩充成功后自动重新拉取文件并在框架预览中高亮新增行（滚动 effect 依赖含 rows 防竞态）
- 新增文件 mtime 与 DB lastModifiedAt 分歧警告提示（只读提示，不提供 DB 同步按钮）
- **修复 `appendXlsxRows`**：通过 parser 的框架 sheet 检测定位写入目标 sheet，列按表头名映射（不再写 SheetNames[0]、不再按位置）
- **统一解析行为**：前端 `parseXlsxPreview` 与服务端 parser 的 sheet 检测、表头 trim 对齐，共享多 sheet 测试夹具
- **数据修复**：math01.xlsx 封面错位数据清除、2.4 框架行补入知识点框架 sheet；检查 math02.xlsx（修复前备份到 .bak/）
- 组件迁移：`FrameworkPreview`/`MdPreview` 移至 `web/src/components/textbook-preview/`（空态文案改 prop、highlightedCode 扩展为数组），`findMdLineByCode` 抽取为纯函数 `web/src/utils/mdLineLocator.ts`，扩充弹窗改引用（行为零变化）

## Capabilities

### New Capabilities

- `textbook-file-preview`: 教材详情页展示 iksm 磁盘文件内容（xlsx 框架 + md 原文），支持框架行到 md 标题的点击定位、文件重新加载、文件与 DB 修改时间分歧提示

### Modified Capabilities

- `textbook-knowledge-point-expansion`: 「教材详情页展示」需求变更——布局由"信息卡 + DB 知识点表格"改为"信息卡 + 双栏文件预览"，扩充成功高亮对象从 DB 表格行改为文件框架预览行；「追加到原 xlsx 文件」需求变更——必须写入 parser 检测到的框架 sheet（而非 SheetNames[0]）且按表头名映射列；扩充弹窗的框架文件解析与服务端 sheet 检测逻辑一致

（注：详情页展示需求定义在 textbook-knowledge-point-expansion 中；textbook-management 的详情入口需求（R6.5）无变化，故不列入。）

## Impact

- **后端**: `server/src/modules/textbook/`（controller +2 端点、service、file-service 写路径修复、parser 暴露 sheet 检测）
- **前端**: `web/src/pages/TextbookDetail/`（页面重写、弹窗改引用）、`web/src/components/textbook-preview/`（新共享目录）、`web/src/utils/`（mdLineLocator、textbookFilePreview 对齐）、`web/src/services/textbook.service.ts`
- **API**: 新增 `GET /textbooks/:id/framework-file`、`GET /textbooks/:id/content-file`（只读，无 breaking change）
- **数据**: iksm/math01.xlsx 修复（含 .bak 备份）、math02.xlsx 检查
- **依赖**: 无新增第三方依赖
- **设计文档**: `~/.gstack/projects/cursor-math-openspec/zhenggsh-master-design-20260722-224513.md`（office-hours, APPROVED）、`zhenggsh-master-eng-plan-20260722-2320.md`（plan-eng-review, ENG CLEARED）
