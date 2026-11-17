## Why

当前系统仅在教材详情页通过文件 `mtime` 与数据库 `lastModifiedAt` 的时间差异给出粗略警告，无法告知教师具体的分歧内容。随着教材详情页支持在浏览器内直接预览 `/iksm/` 下的 `xlsx` 框架文件和 `md` 内容文件，教师需要一个内容级一致性校验工具，能够比对数据库、`xlsx`/`csv`、`md` 三者的知识点集合、标题、层级和正文，并像扩充知识点弹窗一样提供左右联动定位。

## What Changes

- 新增后端端点 `POST /textbooks/:id/validate-consistency`，读取当前教材在磁盘上的框架文件与 Markdown 文件，和数据库中的知识点记录做交叉校验，返回结构化校验报告。
- 校验维度包括：
  - 数据库中的知识点编号集合 vs 框架文件中的编号集合（互差）
  - 框架文件中的编号 vs Markdown 文件中的编号（互差）
  - 知识点层级/标题级别匹配（一级→`##`、二级→`###`、三级→`####`）
  - 名称/标题一致性（框架中的 name 与 Markdown 标题中的名称是否一致）
  - 重要性级别在框架中是否合法（A/B/C）
  - 父子层级完整性（框架中每个编号的上级是否在数据库或框架中存在）
- 在 `TextbookDetailPage` 新增"一致性校验"入口，校验过程和结果展示复用扩充知识点弹窗的 `FrameworkPreview`/`MdPreview`/`ValidationRulesPanel`/`ErrorTag` 风格。
- 点击校验错误项时，左侧高亮框架文件行，右侧定位 Markdown 行；纯数据库级错误（如 DB 有但文件没有）提供知识点链接跳转。
- 不阻塞现有"扩充知识点"功能；一致性校验为只读诊断工具。

## Capabilities

### New Capabilities
- `textbook-consistency-validation`: 对当前教材的数据库、框架文件、Markdown 文件进行内容级一致性校验，并在教材详情页以与扩充知识点弹窗一致的风格展示结果和联动定位。

### Modified Capabilities
- 无现有规范需求变更，仅新增前端入口和后端端点。

## Impact

- **后端**: 新增 `TextbookController` 端点、新增 `TextbookService.validateConsistency(textbookId)` 方法；可能复用 `TextbookParserService` 的解析与 `extractMdCodes` 逻辑。
- **前端**: `TextbookDetailPage` 增加"一致性校验"按钮与抽屉/弹窗；复用现有预览组件与 `useTextbookDetail` hook。
- **API**: 新增只读端点 `POST /textbooks/:id/validate-consistency`，无 breaking change。
- **规范**: 新增 capability spec，不修改现有 spec。
- **测试**: 新增后端单元测试（多种不一致场景）和前端组件测试（抽屉打开、错误点击联动）。
- **依赖**: 无新增第三方依赖。

---
*Version: 1.0*
