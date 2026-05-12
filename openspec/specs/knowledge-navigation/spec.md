# Spec: Knowledge Navigation

## Overview

知识点前驱后继导航能力，在学习页面提供上一知识点和下一知识点的快捷导航。

## Requirements

### Requirement: 知识点前驱后继导航

系统 SHALL 在知识点详情内容区提供上一知识点和下一知识点的快捷导航按钮。

#### Scenario: 点击下一个按钮
- **GIVEN** 用户正在查看某个知识点的详情
- **WHEN** 用户点击内容区工具栏的"下一个"按钮
- **THEN** 系统 SHALL 加载并展示按树形遍历顺序的下一个知识点详情
- **AND** 知识树 SHALL 自动滚动并高亮对应节点

#### Scenario: 点击上一个按钮
- **GIVEN** 用户正在查看某个知识点的详情
- **WHEN** 用户点击内容区工具栏的"上一个"按钮
- **THEN** 系统 SHALL 加载并展示按树形遍历顺序的上一个知识点详情
- **AND** 知识树 SHALL 自动滚动并高亮对应节点

#### Scenario: 第一个知识点的上一个按钮
- **GIVEN** 用户当前查看的是遍历序列中的第一个知识点
- **THEN** "上一个"按钮 SHALL 置灰禁用
- **AND** 点击时不触发任何操作

#### Scenario: 最后一个知识点的下一个按钮
- **GIVEN** 用户当前查看的是遍历序列中的最后一个知识点
- **THEN** "下一个"按钮 SHALL 置灰禁用
- **AND** 点击时不触发任何操作

#### Scenario: 树形遍历顺序
- **GIVEN** 知识点树形结构
- **THEN** 遍历顺序 SHALL 采用深度优先遍历（DFS）
- **AND** 顺序为：父节点优先，同层级从左到右
- **AND** 示例：1.1.1 → 1.1.2 → 1.2.1 → 2.1.1

## Types

```typescript
interface KnowledgeNavigationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}
```

## UI Specifications

| 元素 | 规格 |
|-----|------|
| 按钮尺寸 | 32px |
| 按钮间距 | 8px |
| 图标 | Ant Design `LeftOutlined` / `RightOutlined` |
| 禁用状态 | 透明度 0.4，不响应点击 |
| 位置 | 内容区工具栏右侧 |

## Performance Requirements

- 导航切换响应时间 <= 200ms
- 知识树自动滚动到目标节点 <= 300ms

---

*Version: 1.0*
*Capability: knowledge-navigation*
