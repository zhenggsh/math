## Context

`TextbookDetailPage` 当前已实现 `/iksm/` 下框架文件（xlsx/csv）与 Markdown 内容文件的双栏只读预览，并支持点击框架行定位到 Markdown 对应标题。但教师对知识点框架的维护入口仍分散在学习页（`LearningPage`）和智能学习页（`SmartLearningPage`）中，且现有 `knowledge-point-edit` 规范明确禁止编辑时修改 Markdown 文件，造成以下问题：

1. 维护流程断裂：教师在详情页发现编号或定义错误后，需跳转到学习页才能修改。
2. 数据不一致：更新知识点概要（code、name、definition、characteristics）只写数据库，不同步 Markdown，导致后续重新同步教材时文件内容覆盖数据库。
3. 删除/新增虽然已同步 Markdown，但其入口同样不在详情页。

## Goals / Non-Goals

**Goals:**
- 在 `TextbookDetailPage` 的框架预览表格中直接提供新增子知识点、编辑概要、删除叶子节点三个行内操作。
- 修改知识点概要时同时更新数据库和 Markdown 文件中的对应内容块，保持 DB 与文件一致。
- 操作后自动刷新文件预览并高亮变更行。
- 仅 TEACHER/ADMIN 可看到这些操作；当文件与 DB 的修改时间不一致时禁用写操作并提示。

**Non-Goals:**
- 不重构学习页/智能学习页中的现有 CRUD 入口（保持原样可用）。
- 不改变教材上传、同步、扩充等既有流程。
- 不实现 Markdown 正文富文本编辑器；编辑 Markdown 内容块仍通过纯文本形式替换标题与正文。
- 不处理 CSV 文件的特殊追加/列映射问题（保持现有行为）。

## Decisions

### Decision 1: 复用现有 `KnowledgePointController` 端点，仅扩展 Service 层
- **Rationale**: 前端已存在 `knowledgeApi.updateKnowledgePoint`、`.createKnowledgePoint`、`.deleteKnowledgePoint`，复用这些 API 可减少前端改动。需要变更的是 `KnowledgePointService.update()`：在更新数据库后，若知识点存在 Markdown 内容块，则同步替换该块。
- **Alternative**: 新增 `/textbooks/:textbookId/knowledge-points/:id/sync-md` 专门端点。Rejected：增加调用复杂度，且容易遗漏同步。

### Decision 2: Markdown 同步策略为"替换整个内容块"
- **Rationale**: `TextbookService` 已有 `findContentBlockRange` 和 `updateContentInFile` 逻辑，可直接复用。更新时根据新 `code` 和 `name` 生成新标题行，保留用户提交的 `definition`/`characteristics` 作为正文，替换旧块。
- **Edge case**: 若用户只改 `importanceLevel`，正文不变；Service 仍读取旧块正文后重写，确保标题中的 `code`/`name` 一致。

### Decision 3: 在 `FrameworkPreview` 中以操作列形式暴露入口
- **Rationale**: 详情页本身就是表格预览，增加操作列最直观。操作列只在 TEACHER/ADMIN 且文件未与 DB 时间分歧时显示。
- **Alternative**: 在表格上方放置全局工具栏。Rejected：无法表达“对哪一行操作”，需额外选择行，交互更重。

### Decision 4: 文件 mtime 与 DB lastModifiedAt 分歧时禁用写操作
- **Rationale**: 若外部直接修改了 `iksm/` 下的 xlsx 或 md 文件，此时从页面写入会覆盖外部变更。检测到分歧后仅允许重新加载和查看，禁止新增/编辑/删除，直到用户执行刷新同步或手动解决。

### Decision 5: 更新后自动刷新文件预览并高亮变更行
- **Rationale**: 教师需要立即看到文件已同步。高亮逻辑复用现有 `highlightedCodes` 状态，3 秒后自动清除。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 替换 Markdown 块时破坏相邻结构 | 复用经过测试的 `findContentBlockRange` 边界检测（下一同级/高级标题或 `---` 分隔线）。 |
| 用户通过外部工具同时修改文件和页面操作导致竞态 | 通过 mtime 分歧检测禁用写操作；后台仍可能并发，但概率极低，接受最终一致性。 |
| code 变更后原内容块定位失败 | 更新时先按旧 code 定位并替换标题，再按新 code 写入；若旧块不存在则抛出可理解错误。 |
| 修改 spec 后归档影响历史需求 | 在 `knowledge-point-edit` 的 delta spec 中完整保留原 requirement 并标注 MODIFIED，归档后旧 spec 会被覆盖，但 Git 历史保留。 |

## Migration Plan

- 无数据库迁移；纯代码与规范变更。
- 部署后，教师此前仅在 DB 中更新的概要记录，在下次从页面触发更新时会自动同步到 Markdown。
- 回滚：还原 Service 层双写逻辑即可，前端操作列由权限/分歧状态控制，服务端校验不变。

## Open Questions

- 是否需要在更新失败时自动回滚数据库？当前 `KnowledgePointService.update()` 无事务，新增双写后若文件写入失败会导致 DB 已更新。建议将更新与文件写入包装在事务或补偿逻辑中，具体在 tasks 阶段实现。

---
*Version: 1.0*
