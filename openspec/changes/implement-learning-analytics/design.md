## Context

学习分析功能帮助学生了解自己的学习情况，帮助教师掌握班级整体水平。参考 project_target.md 第 35-37 行。

依赖变更：implement-knowledge-learning（需要 LearningRecord 数据）

## Goals / Non-Goals

**Goals:**
- 提供学习统计数据
- 提供掌握情况分析
- 可视化展示（图表）

**Non-Goals:**
- 预测性分析（后续 AI 功能）
- 班级对比分析（后续功能）

## Decisions

### Decision: 使用 ECharts 5
**Rationale**: 项目规范要求，功能丰富，支持响应式。

### Decision: 后端聚合数据
**Rationale**: 减少前端计算，保护原始数据。

### Decision: 默认显示最近 30 天数据
**Rationale**: 平衡性能和实用性，支持自定义范围。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 大数据量查询慢 | 添加索引，使用缓存（后续）|

## Migration Plan

无需迁移。

## Open Questions

- 是否需要导出 PDF 报告？（建议：v2 支持）
