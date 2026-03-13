## Why

数学通系统的核心学习功能需要多栏式界面展示知识点，支持多种学习方式（针对性、重要性、随机），并记录学习反馈。当前缺少学习界面，无法实现 project_target.md 第 23-33 行的知识点学习需求。

## What Changes

- 实现多栏式布局组件（可拖拽调整）
- 实现知识点树状导航（树图 + 思维导图）
- 实现 Markdown 预览（支持 LaTeX、Mermaid）
- 实现学习反馈记录（时间、时长、掌握程度）
- 实现多种学习模式（针对性、重要性、随机）

## Capabilities

### New Capabilities
- `knowledge-learning-ui`: 多栏式学习界面
- `knowledge-navigation`: 知识点导航和视图切换
- `learning-feedback`: 学习反馈记录
- `learning-modes`: 多种学习模式

### Modified Capabilities
- 无

## Impact

- **前端组件**：大量新组件（布局、树、预览器）
- **数据库**：写入 LearningRecord 表
- **API 变更**：新增 /learning/* 端点
- **复杂度**：需要集成 KaTeX、Mermaid、ECharts
