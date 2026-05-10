## MODIFIED Requirements

### Requirement: 知识点信息展示

系统 SHALL 在知识树节点上展示知识点关键信息。

#### Scenario: 节点基础信息展示
- **GIVEN** 知识树节点渲染
- **THEN** 每个节点 SHALL 显示：
  - 知识点名称
  - 重要性级别标签（A/B/C，以颜色区分）
  - 学习状态图标（如已学习/未学习）

#### Scenario: 悬停提示详情
- **GIVEN** 用户悬停在知识树节点上
- **WHEN** 悬停持续超过 300ms
- **THEN** 系统 SHALL 显示一个丰富的 Popover（替代原有的简单 Tooltip）
- **AND** Popover SHALL 包含：
  - 知识点标题
  - 重要性级别（带颜色标签）
  - 定义摘要（最多 6 行，超长截断）
  - 学习状态（仅登录用户可见）
- **AND** 当鼠标离开节点时，Popover SHALL 立即消失

---

### Requirement: 双视图模式支持

系统 SHALL 支持树图和思维导图两种视图模式，用户可自由切换。

#### Scenario: 切换到思维导图视图
- **GIVEN** 用户当前在树图视图
- **WHEN** 用户点击"思维导图"切换按钮
- **THEN** 视图 SHALL 切换为思维导图布局
- **AND** 以中心节点为根展开知识点层级
- **AND** 保持当前选中状态

#### Scenario: 切换到树图视图
- **GIVEN** 用户当前在思维导图视图
- **WHEN** 用户点击"树图"切换按钮
- **THEN** 视图 SHALL 切换为树形列表布局
- **AND** 保持当前选中状态
- **AND** 恢复展开/折叠状态

#### Scenario: 思维导图节点交互
- **GIVEN** 用户处于思维导图视图
- **WHEN** 用户点击某个节点
- **THEN** 该节点 SHALL 高亮显示
- **AND** 系统 SHALL 触发选中事件
- **AND** 点击已展开节点的折叠按钮 SHALL 折叠其子节点

---

## ADDED Requirements

### Requirement: 思维导图布局模式选择

系统 SHALL 支持在思维导图中切换不同的布局模式。

#### Scenario: 选择树状布局
- **GIVEN** 用户在思维导图视图
- **WHEN** 用户从布局下拉框选择"树状布局"
- **THEN** 节点 SHALL 从左到右水平展开
- **AND** 所有子节点 SHALL 位于父节点右侧

#### Scenario: 选择左右均衡布局
- **GIVEN** 用户在思维导图视图
- **WHEN** 用户从布局下拉框选择"左右均衡"
- **THEN** 根节点 SHALL 居中
- **AND** 前半部分子节点 SHALL 向左水平展开
- **AND** 后半部分子节点 SHALL 向右水平展开

## Types

```typescript
// 新增：布局模式
type LayoutMode = 'tree' | 'balanced';

// 更新：思维导图视图 Props
interface MindMapViewProps {
  nodes: KnowledgeTreeNode[];
  selectedId?: string;
  onSelect: (node: KnowledgeTreeNode) => void;
  maxDepth?: number;
  layoutMode?: LayoutMode;    // 新增
}

// 更新：思维导图布局节点
interface MindMapNodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: KnowledgeTreeNode;
  children?: MindMapNodeLayout[];
  depth: number;
  direction?: 'left' | 'right';  // 新增：用于均衡布局
}
```
