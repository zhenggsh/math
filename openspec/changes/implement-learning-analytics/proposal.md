## Why

数学通系统需要提供学习分析功能，帮助学生和教师了解学习情况。当前缺少数据可视化，无法实现 project_target.md 第 35-37 行的知识点分析需求。

## What Changes

- 实现学习统计 API（次数、时长）
- 实现掌握情况分析 API
- 创建分析仪表盘页面
- 集成 ECharts 图表

## Capabilities

### New Capabilities
- `learning-statistics`: 学习数据统计
- `mastery-analytics`: 掌握情况分析

### Modified Capabilities
- 无

## Impact

- **前端页面**：新增分析仪表盘
- **API 变更**：新增 /analytics/* 端点
- **依赖变更**：新增 echarts
