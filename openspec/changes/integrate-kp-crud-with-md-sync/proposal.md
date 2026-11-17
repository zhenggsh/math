## Why

教材详情页已经能够预览 `/iksm/` 下的框架文件和 Markdown 内容文件，但教师发现知识点错误时仍需跳转到学习页面才能增删改。同时，现有 `knowledge-point-edit` 规范明确要求“只更新数据库、不修改 Markdown 文件”，导致 DB 与 `md` 文件内容不一致。本变更将 CRUD 入口直接嵌入教材详情预览页，并补齐更新操作对 Markdown 文件的双写同步，使预览页成为教材维护的单一入口。

## What Changes

- 在 `TextbookDetailPage` 的框架预览（`FrameworkPreview`）上增加行内操作：编辑概要、新增子知识点、删除叶子节点，仅对 TEACHER/ADMIN 角色可见。
- 扩展 `KnowledgePointController` / `KnowledgePointService` 的更新流程：更新数据库后，同步改写教材 Markdown 文件中对应知识点内容块的标题和正文，保持 DB 与文件一致。
- 调整 `knowledge-point-edit` 规范：由“只写 DB”改为“DB 与 Markdown 文件同步更新”。
- 新增/删除继续保持现有 Markdown 同步行为；在预览页中点击新增/删除后自动重新加载文件预览并高亮变更行。
- 行内操作仅在框架文件为 `xlsx` 或 `csv` 时启用；当文件mtime与DB lastModifiedAt不一致时给出警告并禁用写操作，避免覆盖外部未同步变更。
- 补充单元/集成测试覆盖更新双写、预览页行内操作、权限控制。

## Capabilities

### New Capabilities
- `textbook-detail-knowledge-crud`: 在教材详情文件预览页内对知识点框架进行增删改查，并同步刷新文件预览。

### Modified Capabilities
- `knowledge-point-edit`: 更新知识点概要时由“仅持久化到数据库”改为“同时更新数据库与教材 Markdown 文件中的对应内容块”。

## Impact

- **后端**: `server/src/modules/textbook/knowledge-point.service.ts`（更新双写逻辑）、`knowledge-point.controller.ts`（已有端点行为不变）。
- **前端**: `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`（集成行内操作）、`web/src/components/textbook-preview/FrameworkPreview.tsx`（扩展操作列）、`web/src/services/knowledgeApi.ts`。
- **API**: 无新增端点，PATCH `/textbooks/:textbookId/knowledge-points/:id` 行为扩展为同步修改 Markdown 文件。
- **规范**: 修改 `openspec/specs/knowledge-point-edit/spec.md` 中关于 Markdown 同步的 REQUIREMENT。
- **测试**: 新增/修改前后端测试。
- **依赖**: 无新增第三方依赖。

---
*Version: 1.0*
