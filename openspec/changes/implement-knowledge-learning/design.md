## Context

学习界面是数学通系统的核心，需要实现类似 TRAE 的多栏布局和丰富的内容展示。参考 project_target.md 第 23-33 行。

依赖变更：implement-knowledge-repository（需要知识点数据）, setup-database-schema（需要 LearningRecord 模型）

## Goals / Non-Goals

**Goals:**
- 实现可调整的多栏布局
- 支持树状和思维导图两种视图
- 支持 LaTeX 和 Mermaid 渲染
- 实现学习反馈记录
- 实现三种学习模式

**Non-Goals:**
- AI 侧栏内容（右侧栏留空，后续扩展）
- 实时协作功能

## Decisions

### Decision: 使用 react-resizable-panels 实现可调整布局
**Rationale**: 成熟的 React 面板库，支持拖拽调整。

### Decision: 使用 @uiw/react-md-editor 渲染 Markdown
**Rationale**: 支持预览和源码切换，可扩展 KaTeX 和 Mermaid。

### Decision: 使用 react-flow 实现思维导图
**Rationale**: 灵活的节点图库，支持自定义节点。

### Decision: 学习记录自动保存（离开页面时）
**Rationale**: 防止数据丢失，减少用户操作。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| LaTeX/Mermaid 渲染性能问题 | 使用懒加载，大公式分页渲染 |
| 状态管理复杂 | 使用 Zustand 管理学习状态 |

## Migration Plan

无需迁移。

## Open Questions

- 是否支持学习计时器实时显示？（建议：是）
