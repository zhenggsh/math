## Why

学生当前只能在分析页面看到聚合统计（总学习次数、总时长、掌握分布饼图、30天趋势折线图），但无法追踪单个知识点的掌握度是如何从 D→C→B→A 逐步提升的。没有这种纵向轨迹视图，学生难以感知自己的进步，也难以判断某个薄弱点是否需要继续投入。补齐这一环，学习反馈才真正形成"学习-记录-看到进步"的闭环。

## What Changes

- **后端**：在 `analytics` 模块新增 `GET /analytics/student/knowledge-point-progress` 聚合查询接口，返回指定知识点历次学习记录（按时间升序，包含日期、掌握度、学习时长）
- **前端**：在 `/analytics/student` 页面新增"知识点掌握度轨迹"区域，包含知识点选择器 + 混合折线/柱状图（折线=掌握度变化，柱状=每次学习时长）
- **新增组件**：`ProgressionChart` — 基于 ECharts 的混合图表组件，支持自动标注关键里程碑（首次学习、首次达到 C、达到 A）
- **复用现有能力**：不修改 `LearningRecord` 数据模型，直接复用已有字段（userId + knowledgePointId + startTime + masteryLevel + durationMinutes）

## Capabilities

### New Capabilities
- `knowledge-point-progression`: 知识点掌握度轨迹追踪 — 展示单个知识点在多次学习中的掌握度演变过程

### Modified Capabilities
- `learning-record`: 在现有"查询特定知识点的学习记录"基础上，后端 `AnalyticsService` 需要新增聚合方法提供按时间排序的进度数据；该接口主要用于展示，不改变原有的学习记录创建/查询行为

## Impact

- **后端**：`server/src/modules/analytics/` — 新增 service/controller 方法
- **前端**：`web/src/pages/analytics/StudentAnalyticsPage.tsx`、`web/src/components/analytics/` — 新增图表区域和组件
- **数据层**：无 schema 变更，复用现有 `LearningRecord` 表
- **依赖**：复用现有 `EChartsWrapper`（ECharts）和 Ant Design 组件
