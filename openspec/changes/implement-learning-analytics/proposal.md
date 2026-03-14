# Proposal: implement-learning-analytics

> **Change**: implement-learning-analytics  
> **Status**: Proposed  
> **Created**: 2026-03-14  
> **Dependencies**: implement-learning-record (已完成)

---

## Why

学习数据可视化分析是"数学通"系统的核心功能之一。通过 `implement-learning-record` 变更，系统已经积累了充足的学习记录数据。现在需要实现学习数据分析功能，帮助学生和教师更好地理解学习情况：

- **学生视角**：了解自己的学习投入（次数、时长）和掌握程度分布，找出薄弱环节
- **教师视角**：全局掌握班级学习情况，识别热门知识点和学生普遍薄弱点
- **数据驱动**：通过可视化图表提供直观的数据洞察，支持针对性学习决策

---

## What Changes

本变更将实现完整的学习数据分析功能，包括后端统计 API 和前端可视化界面。

### 后端变更

1. **新增 AnalyticsModule**：统计模块，提供学习数据分析 API
2. **StatsService**：核心业务服务，实现数据聚合逻辑
   - 个人学习统计（学习次数、时长、掌握分布）
   - 全局知识点热度统计
   - 多学生对比统计
3. **聚合逻辑**：基于 `LearningRecord` 表进行高效聚合查询

### 前端变更

1. **ECharts 图表封装**：统一图表组件库
   - `EChartsWrapper`：通用图表容器
   - `PieChart`、`BarChart`、`LineChart`：特定图表类型
2. **学生分析页面**：`StudentAnalyticsPage`
   - 个人学习概览仪表盘
   - 掌握程度分布饼图
   - 学习时长趋势折线图
   - 薄弱知识点排行
3. **教师分析页面**：`TeacherAnalyticsPage`
   - 班级学习概览
   - 知识点热度排行榜
   - 学生对比分析
   - 数据导出功能

### 数据库

- 无 Schema 变更，基于现有 `learning_records` 表查询

---

## Capabilities

| Capability | 说明 | 关联 Spec |
|------------|------|-----------|
| `analytics` | 学习数据分析 | `specs/analytics/spec.md` |

---

## Impact

### 新增模块

```
server/src/modules/analytics/          # 后端统计模块
├── analytics.module.ts
├── analytics.controller.ts
├── analytics.service.ts
├── dto/
│   ├── student-stats.dto.ts
│   ├── teacher-stats.dto.ts
│   └── query-params.dto.ts
└── interfaces/
    └── stats.interfaces.ts

web/src/pages/analytics/               # 前端分析页面
├── StudentAnalyticsPage.tsx
└── TeacherAnalyticsPage.tsx

web/src/components/features/analytics/ # 图表组件
├── EChartsWrapper.tsx
├── PieChart.tsx
├── BarChart.tsx
├── LineChart.tsx
├── MasteryDistributionChart.tsx
├── LearningTrendChart.tsx
├── KnowledgeHeatmap.tsx
└── StudentComparisonChart.tsx

web/src/services/analytics.service.ts  # API 服务
```

### 依赖变更

| 类型 | 包名 | 版本 | 用途 |
|------|------|------|------|
| 前端 | echarts | ^5.4.0 | 图表库 |
| 前端 | @types/echarts | ^5.4.0 | 类型定义 |

### 权限影响

| 角色 | 权限 |
|------|------|
| 学生 | 查看个人学习分析 |
| 教师 | 查看全局分析、导出数据 |
| 管理员 | 全部权限 |

---

## Success Criteria

- [ ] 学生可以查看自己的学习统计图表
- [ ] 教师可以查看班级整体学习数据
- [ ] 所有图表正确展示学习数据
- [ ] 数据导出功能正常工作
- [ ] 单元测试覆盖率 ≥ 80%

---

## Timeline

预估工作量：2-3 天

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| 后端开发 | Analytics API | 1 天 |
| 前端组件 | ECharts 封装 | 0.5 天 |
| 页面开发 | 学生/教师页面 | 1 天 |
| 测试完善 | 单元测试 | 0.5 天 |
