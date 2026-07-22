# Proposal: 教材详情页与知识点扩充

## Why

教师需要查看已上传教材的完整知识点结构，并能够在不重新上传整本教材的情况下，通过补充新的 xlsx + md 文件向现有教材安全地追加知识点。当前教材管理仅支持列表、上传、删除和同步，缺少单本教材的详情查看和增量扩充能力。

## What Changes

- 新增教材详情页 `/teacher/textbooks/:id`，展示教材元数据和知识点列表。
- 在教材管理列表增加「详情」入口，跳转到教材详情页。
- 在教材详情页增加「扩充知识点」按钮，上传新的 xlsx（知识点概述）和 md（知识点详述）文件。
- 后端新增 `POST /textbooks/:id/expand` 端点，校验新知识点编号不与现有冲突，使用 PostgreSQL advisory lock 保证并发安全，将新知识点写入数据库并追加到原教材 xlsx 与 md 文件。
- 新增前后端单元测试覆盖详情页渲染、弹窗交互、xlsx 追加、md 追加、冲突检测等路径。

## Capabilities

### New Capabilities
- `textbook-knowledge-point-expansion`: 教材详情页展示与通过上传文件扩充知识点的完整能力，包括冲突检测、文件追加和数据库写入。

### Modified Capabilities
- `textbook-management`: 列表页增加「详情」操作，允许教师进入单本教材的详情页。

## Impact

- **Frontend**: `web/src/App.tsx` 新增路由；新增 `TextbookDetailPage`、`useTextbookDetail`、`ExpandKnowledgePointsModal`；`TextbookTable` 和 `TextbookManagePage` 增加详情入口。
- **Backend**: `TextbookService` 新增 `expandKnowledgePoints` 与 md/xlsx 追加辅助方法；`TextbookController` 新增 `POST /textbooks/:id/expand`；`TextbookFileService` 新增 `appendXlsxRows`、`saveTempFile`、`deleteTempFile`。
- **Database**: 在 `textbook` 事务中使用 `pg_advisory_xact_lock` 防止并发扩充冲突。
- **Files**: 原教材 `frameworkPath` 与 `contentPath` 文件被追加新行/新块，不覆盖原内容。
- **Permissions**: 仅 `TEACHER` / `ADMIN` 可访问详情页和扩充接口。
