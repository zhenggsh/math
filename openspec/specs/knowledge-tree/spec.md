## ADDED Requirements

### Requirement: 树形结构展示知识点

系统 SHALL 提供树形结构展示知识点层级，支持展开/折叠和选中操作。

#### Scenario: 加载知识树
- **GIVEN** 用户进入学习页面
- **WHEN** 系统从后端获取知识点数据
- **THEN** 系统 SHALL 以树形结构展示知识点层级（一级/二级/三级）
- **AND** 默认展开一级知识点
- **AND** 支持点击展开/折叠子节点

#### Scenario: 选中知识点
- **GIVEN** 知识树已加载
- **WHEN** 用户点击某个知识点节点
- **THEN** 该节点 SHALL 高亮显示为选中状态
- **AND** 系统 SHALL 触发选中事件，通知内容区加载对应知识点详情

#### Scenario: 虚拟滚动大数据量
- **GIVEN** 知识点数量超过 1000 个
- **WHEN** 用户滚动知识树
- **THEN** 系统 SHALL 使用虚拟滚动只渲染可视区域节点
- **AND** 滚动 SHALL 保持流畅（帧率 >= 30fps）

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
- **THEN** 系统 SHALL 显示 Tooltip
- **AND** Tooltip SHALL 包含：知识点编号、定义摘要

---

### Requirement: 视图状态持久化

系统 SHALL 持久化用户的视图偏好和展开状态。

#### Scenario: 记住视图模式
- **GIVEN** 用户切换到思维导图视图
- **WHEN** 用户刷新页面或重新进入学习页面
- **THEN** 系统 SHALL 恢复用户上次使用的视图模式
- **AND** 存储 SHALL 使用 localStorage

#### Scenario: 记住展开状态
- **GIVEN** 用户在树图视图中折叠/展开了一些节点
- **WHEN** 用户刷新页面
- **THEN** 系统 SHALL 尽量恢复之前的展开/折叠状态
- **AND** 至少恢复一级知识点的展开状态

---

## Types

```typescript
// 知识点树节点数据
interface KnowledgeTreeNode {
  id: string;
  code: string;              // 知识点编号，如 "1.1.1"
  name: string;              // 知识点名称
  level: 1 | 2 | 3;          // 层级
  importanceLevel: 'A' | 'B' | 'C';
  definition?: string;       // 定义摘要（用于 Tooltip）
  children?: KnowledgeTreeNode[];
  isLearned?: boolean;       // 是否已学习
  masteryLevel?: 'A' | 'B' | 'C' | 'D' | 'E';
}

// 知识树组件 Props
interface KnowledgeTreeProps {
  nodes: KnowledgeTreeNode[];
  selectedId?: string;
  viewMode: 'tree' | 'mindmap';
  onSelect: (node: KnowledgeTreeNode) => void;
  onViewModeChange: (mode: 'tree' | 'mindmap') => void;
  loading?: boolean;
  height?: number;           // 容器高度
}

// 树图视图 Props
interface TreeViewProps {
  nodes: KnowledgeTreeNode[];
  selectedId?: string;
  expandedKeys: string[];
  onSelect: (node: KnowledgeTreeNode) => void;
  onExpand: (keys: string[]) => void;
  height: number;
}

// 思维导图视图 Props
interface MindMapViewProps {
  nodes: KnowledgeTreeNode[];
  selectedId?: string;
  onSelect: (node: KnowledgeTreeNode) => void;
  maxDepth?: number;         // 最大显示深度，默认 3
}

// 思维导图布局节点
interface MindMapLayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: KnowledgeTreeNode;
  children: MindMapLayoutNode[];
}
```

## UI Specifications

### 树图视图

| 元素 | 规格 |
|-----|------|
| 节点高度 | 32px |
| 缩进 | 24px |
| 展开/折叠图标 | Ant Design `CaretDown` / `CaretRight` |
| 选中背景 | `colorPrimary` 透明度 10% |
| 选中边框 | `colorPrimary` 1px |
| 重要性 A | 红色标签 `#FF4D4F` |
| 重要性 B | 橙色标签 `#FAAD14` |
| 重要性 C | 蓝色标签 `#1890FF` |
| 虚拟滚动高度 | 传入 height 或容器自适应 |

### 思维导图视图

| 元素 | 规格 |
|-----|------|
| 节点内边距 | 8px 12px |
| 节点圆角 | 4px |
| 节点间距 | 水平 40px，垂直 20px |
| 连线样式 | 1.5px `#D9D9D9`，贝塞尔曲线 |
| 根节点 | 加粗，字号 +2px |
| 选中节点 | `colorPrimary` 边框 2px |
| 画布内边距 | 20px |

## Performance Requirements

- 首屏渲染时间 <= 500ms（1000 个节点以内）
- 虚拟滚动帧率 >= 30fps
- 视图切换时间 <= 300ms
- 节点展开/折叠动画 <= 200ms

## Accessibility Requirements

- 支持键盘导航（上下箭头、左右展开折叠、Enter 选中）
- 支持屏幕阅读器（ARIA 标签）
- 颜色不仅是唯一信息载体（重要性同时用文字标签）
