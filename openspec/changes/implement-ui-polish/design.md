## Context

UI/UX 优化是提升用户满意度的关键。本变更在核心功能完成后进行，参考 project-rule/SKILL.md 的质量门禁。

依赖变更：所有核心功能变更

## Goals / Non-Goals

**Goals:**
- 实现响应式布局
- 优化性能（虚拟滚动、懒加载）
- 完善加载和错误状态
- 添加键盘快捷键

**Non-Goals:**
- 重新设计 UI（保持现有设计）
- 添加动画效果（除非必要）

## Decisions

### Decision: 使用 @tanstack/react-virtual 实现虚拟滚动
**Rationale**: 轻量级，性能好，与 React 生态兼容。

### Decision: 使用 react-error-boundary
**Rationale**: 标准错误边界解决方案。

### Decision: 响应式断点：768px（平板）, 1024px（桌面）
**Rationale**: 覆盖主流设备。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 虚拟滚动复杂度高 | 逐步实施，先优化树组件 |

## Migration Plan

无需迁移。

## Open Questions

- 是否需要暗黑模式？（建议：v2 支持）
