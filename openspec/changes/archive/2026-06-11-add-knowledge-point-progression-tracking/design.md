## Context

当前分析页面（`/analytics/student`）已展示聚合统计：总学习次数、总时长、掌握度分布饼图、30天趋势折线图、薄弱点列表。但这些都是**横向聚合**，学生无法看到自己在**单个知识点**上的纵向进步过程。

`LearningRecord` 模型已完整记录每次学习的：userId、knowledgePointId、startTime、masteryLevel、durationMinutes。数据基础足够，无需 schema 变更。

## Goals / Non-Goals

**Goals:**
- 学生能在分析页面查看任意知识点的掌握度演变轨迹（D→C→B→A）
- 图表同时展示每次学习的时长投入，帮助学生理解"努力与回报"的关系
- 自动标注关键里程碑（首次学习、首次达到 C、达到 A），降低认知负担

**Non-Goals:**
- 不修改 `LearningRecord` 数据模型或创建新表
- 不做预测/推荐（如"预计还需要 X 分钟达到 A"）
- 不做知识点之间的关联分析（如"学完 A 后 B 进步更快"）
- 不修改现有的学习反馈创建流程

## Decisions

### Decision 1: 复用现有 `LearningRecord` 表，不新增数据模型
**Rationale:** 现有模型已包含 userId + knowledgePointId + startTime + masteryLevel + durationMinutes，完全满足轨迹展示需求。新增表会增加维护成本，且当前数据量不大，聚合查询性能可接受。

**Alternative considered:** 新增 `MasteryHistory` 表专门记录掌握度变更日志。Rejected：当前 `LearningRecord` 每条记录就是一次掌握度快照，无需冗余存储。

### Decision 2: 在 `analytics` 模块新增 endpoint，不归入 `learning` 模块
**Rationale:** 轨迹查询本质上是分析/展示用途，不是学习记录的管理操作。放在 `analytics` 模块与现有的 `overview`、`trend`、`weak-points` 等分析 endpoint 保持一致。

**Alternative considered:** 在 `learning-records` 模块下新增 `/learning-records/progress` endpoint。Rejected：会破坏现有 REST 资源的语义一致性（`/learning-records` 是资源本身，不是分析视图）。

### Decision 3: 图表使用 ECharts 混合图表（折线 + 柱状），不引入新图表库
**Rationale:** 项目已使用 ECharts（通过 `EChartsWrapper`），且 ECharts 原生支持双 Y 轴 + 混合图表。Ant Design Charts 虽然可用，但会增加依赖和学习成本。

**Alternative considered:** 使用 Ant Design Charts (G2Plot)。Rejected：ECharts 已满足需求，无需额外依赖。

### Decision 4: 知识点选择器只展示有学习记录的知识点
**Rationale:** 过滤掉无记录的知识点可以减少选择器长度，且轨迹图表对无记录的知识点无法展示有意义的内容。学生可以在学习页面先学习，再回来看轨迹。

**Alternative considered:** 展示所有知识点，无记录时显示空状态。Rejected：选择器会很长（一个教材可能有 50+ 知识点），且多数选项无意义。

## Risks / Trade-offs

- **[Risk]** 同一知识点多次学习记录的 `masteryLevel` 可能相同（如两次都是 C），折线图会出现水平线段，用户可能误以为没有进步。
  - **Mitigation:** 在 tooltip 中显示具体的学习时长和备注，帮助用户理解"同样掌握度下，第二次可能理解更深入"。

- **[Risk]** 用户学习记录少（如只有 1-2 条），图表信息量少，体验不佳。
  - **Mitigation:** 单条记录时显示提示引导继续学习；不足 2 条时显示空状态提示。

- **[Risk]** 聚合查询在数据量大时（用户有数千条记录）可能变慢。
  - **Mitigation:** 按 knowledgePointId + userId 查询天然有索引支持；当前数据量下无需额外优化，后续可添加缓存。

## Migration Plan

无迁移需求。本 change 是纯新增功能，不修改现有 API 行为或数据格式。

## Open Questions

- 是否需要按日期范围过滤（startDate/endDate）？当前设计包含该参数，但 MVP 可以只返回全部记录。
- 知识点选择器是否需要搜索功能？当前设计为下拉选择，如果知识点数量超过 50 个可能需要添加搜索。
