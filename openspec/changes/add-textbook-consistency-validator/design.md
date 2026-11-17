## Context

教材详情页已经能够同时展示 `/iksm/` 磁盘上的框架文件（`xlsx`/`csv`）和 Markdown 内容文件，并且点击框架行可以定位到 Markdown 对应位置。然而，教师和维护人员目前只能依赖文件 `mtime` 与数据库 `lastModifiedAt` 的时间差异获得一个粗略警告，无法看到数据库、`xlsx`/`csv`、`md` 三者在知识点编号、标题、层级、正文上的具体差异。随着扩充知识点弹窗已经提供了成熟的校验报告 UI（检查项、错误标签、左右联动高亮），完全可以把同样的交互模式复用到当前教材的一致性诊断上。

## Goals / Non-Goals

**Goals:**
- 提供一个只读的一致性校验工具，对比数据库、`iksm` 框架文件、`iksm` Markdown 文件三者的知识点数据。
- 在 `TextbookDetailPage` 提供入口，校验结果展示风格与“扩充知识点”弹窗保持一致（复用 `FrameworkPreview`/`MdPreview`/`ValidationRulesPanel`/`ErrorTag`）。
- 错误项可点击联动：框架错误高亮表格行，Markdown 错误定位到行号，纯数据库错误可跳转到对应知识点。

**Non-Goals:**
- 不一致不会自动修复；本功能仅用于诊断和定位。
- 不替代现有的 `POST /textbooks/:id/validate`（上传扩充文件校验）。
- 不修改现有同步/刷新/扩充逻辑。
- 不处理文件缺失场景（按已有错误提示处理）。

## Decisions

### Decision 1: 新增专用端点 `POST /textbooks/:id/validate-consistency`
- **Rationale**: 一致性校验需要同时读取 DB、磁盘框架文件、磁盘 Markdown 文件，而现有 `POST /textbooks/:id/validate` 只接收上传文件并校验扩充。复用该端点会导致语义混乱且需要把当前文件以 Multer 形式重新上传。新端点更清晰。
- **Alternative**: 复用 `GET /textbooks/:id/framework-file` 和 `GET /textbooks/:id/content-file` 的返回在前端做对比。Rejected：前端无法直接读取原始 `xlsx` 二进制做精确对比；且把业务逻辑放在前端不利于复用和测试。

### Decision 2: 校验逻辑放在 `TextbookService` 中，复用 `TextbookParserService`
- **Rationale**: `TextbookService` 已经封装了文件路径解析和 Markdown 读取；`TextbookParserService` 提供了 `parseFrameworkFile`、`extractMdCodes` 等能力。新服务方法 `validateConsistency` 调用这些已有能力即可。
- **Implementation note**: 需要先获取 DB 知识点集合，再解析框架文件获得编号集合，再提取 Markdown 编号集合，最后进行集合差运算和逐字段比对。

### Decision 3: 校验报告复用 `ValidationReport` 类型
- **Rationale**: 前端 `ExpandKnowledgePointsModal` 已经基于 `ValidationReport` 类型渲染结果列表、错误标签、折叠面板、导出错误报告。复用同一类型可以零改动复用现有 UI 组件。
- **Report shape**: `{ valid: boolean; checks: ValidationCheck[]; errors: ValidationIssue[] }`，其中 `ValidationIssue.location` 新增 `code`/`row` 语义，与现有定位逻辑一致。

### Decision 4: 校验结果在前端以 Drawer 展示
- **Rationale**: 教材详情页空间已被双栏预览占据，Drawer 从右侧滑出可以展示完整的校验结果而不破坏现有布局。Drawer 内上半部分为校验结果列表，下半部分复用 `FrameworkPreview` 和 `MdPreview` 显示错误联动。
- **Alternative**: 使用 Modal。Rejected：详情页已经有 Modal 用于扩充；Drawer 更适合诊断类常驻信息面板。

### Decision 5: 校验触发时重新读取磁盘文件
- **Rationale**: 确保校验结果反映最新磁盘状态。服务端直接读取文件，不依赖前端预览中的缓存数据。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 大文件校验耗时 | 当前 `iksm/` 文件为教材规模，预计毫秒级；如未来文件过大，可在任务阶段增加超时和流式解析评估。 |
| Markdown 中编号被注释或代码块误识别 | 复用现有 `extractMdCodes` 只匹配标题行，误识别率低；如需要可在后续迭代中排除代码块。 |
| 集合对比后错误项过多难以阅读 | 错误按检查项分组，支持折叠，并提供导出错误报告按钮。 |
| 前端 Drawer 与扩充弹窗代码重复 | 将联动高亮逻辑抽取到共享 hook/util，Drawer 内直接引用 `FrameworkPreview`/`MdPreview`。 |

## Migration Plan

- 无数据库迁移；新增只读端点和前端 Drawer。
- 部署后教师在教材详情页可直接触发一致性校验，无需修改现有数据。
- 回滚：移除新增端点和前端按钮即可，不影响其他功能。

## Open Questions

- 名称一致性比对是否应忽略空格、标点或全半角差异？当前设计按字符串严格比对，可在实现时增加规范化选项。
- 是否需要把校验报告持久化到数据库或日志？本阶段仅返回实时报告，不持久化。

---
*Version: 1.0*
