## Why

现有 `/analytics/student` 页面将所有分析内容堆叠在一个长页面中，信息组织不够清晰，且未与全局教材选择器联动。随着学习记录和知识点维度增多，学生难以快速从"教材""学习行为""知识点"等不同视角理解自己的学习情况。需要按教材维度重新组织分析页面，让学生对指定教材的学习状态一目了然。

## What Changes

- 重构 `web/src/pages/analytics/StudentAnalyticsPage.tsx`，将单一长页面改为 Ant Design Tabs 多标签布局。
- 新增 4 个分析维度标签：教材维度、学习行为维度、知识点维度、总结与建议。
- 分析对象固定为全局教材选择器中第一个选中的教材；未选择教材时显示空状态提示。
- 现有学生端分析 API 增加 `textbookId` 查询参数，按教材过滤学习记录：
  - `GET /analytics/student/overview`
  - `GET /analytics/student/mastery-distribution`
  - `GET /analytics/student/learning-trend`
  - `GET /analytics/student/weak-points`
  - `GET /analytics/student/learned-knowledge-points`
- 扩展 `GET /analytics/student/learned-knowledge-points`，返回每个知识点的最近两次 `masteryLevel`，用于前端计算进步/退步。
- 新增 API `GET /analytics/student/textbook-summary`，用于教材维度总览。
- "总结与建议"维度基于规则模板生成真实中文总结，不接入 LLM。
- 薄弱知识点列表增加"去学习"按钮，跳转至 `/smart-learning?focusKnowledgePointId={id}`。
- 学习行为维度支持 7 / 30 / 90 天时间范围切换。
- 知识点维度支持按全部 / 进步中 / 退步中 / 薄弱点筛选。

## Capabilities

### New Capabilities

- `student-analytics`: 学生按教材进行多维度学习分析的能力，包括教材概览、学习行为趋势、知识点轨迹与薄弱点、规则总结生成。

### Modified Capabilities

- 无现有 spec 需要修改。本次变更虽然新增 API 查询参数，但现有 `learning-record` 与 `knowledge-point-progression` spec 的核心行为不变，仅在后端实现层增加按教材过滤，不改动其已定义的需求。

## Impact

- 前端：`web/src/pages/analytics/StudentAnalyticsPage.tsx` 及相关样式、`web/src/services/analytics.service.ts`、`web/src/types/analytics.types.ts`。
- 后端：`server/src/modules/analytics/analytics.controller.ts`、`server/src/modules/analytics/analytics.service.ts`、相关 DTO 与接口定义。
- 依赖：全局教材选择器（`TextbookContext`）提供 `selectedTextbookIds`。
