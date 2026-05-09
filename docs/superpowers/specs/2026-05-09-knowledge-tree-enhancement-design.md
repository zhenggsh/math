# Knowledge Tree Enhancement Design

**Date:** 2026-05-09
**Scope:** 知识树/脑图显示交互增强
**Approach:** 保守增强（方案 A）

---

## Overview

对现有知识树/脑图组件进行四项增强：

1. **全局教材选择** — 在顶部导航栏增加多选教材选择器，作为全局状态影响学习、考试、分析等模块
2. **节点悬停提示** — 鼠标悬停知识点节点时显示丰富 Popover，展示定义、重要性、学习状态
3. **脑图交互增强** — 支持可折叠鹰眼面板、中键拖动平移画布
4. **脑图布局选择** — 支持树状布局（现有）和左右均衡布局（双向水平展开）

---

## 1. Global Textbook Selector

### 1.1 State Management

新增 `TextbookContext`:

```typescript
// web/src/contexts/TextbookContext.tsx
interface TextbookContextType {
  selectedTextbookIds: string[];
  textbooks: Textbook[];
  isLoading: boolean;
  selectTextbook: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
}
```

- 使用 React Context（与现有 `AuthContext` 风格一致）
- 在 `App.tsx` 中包裹整个应用（位于 `BrowserRouter` 内）
- 教材列表通过 `getTextbooks()` 加载
- 默认选中第一本教材（首次访问，若无教材则保持空数组）

### 1.2 Persistence

```
localStorage key: mathtong:selected-textbooks
value: JSON string of string[] (textbook IDs)
```

### 1.3 UI Placement

在 `AppLayout` 顶部导航栏右侧、用户头像左侧：

```
[Logo]  [Nav Menu]          [📚 Select Textbooks ▼]  [👤 User ▼]
```

使用 Ant Design `Select`:
- `mode="multiple"`
- `maxTagCount={2}`
- 选项显示教材名称
- 加载中时显示 `Spin` 图标

### 1.4 Integration Points

| Consumer | Behavior |
|----------|----------|
| `LearningPage` | 优先使用 Context 中的 `selectedTextbookIds[0]`（第一本选中教材）；保留 URL `textbookId` 作为备用/分享链接支持；若未选择教材显示提示选择空状态 |
| `Analytics` | 分析数据基于 `selectedTextbookIds` 过滤 |
| `SmartLearning` | 薄弱点检测基于选中的教材 |

---

## 2. Node Hover Popover

### 2.1 Component

新增 `KnowledgeNodePopover`:

```typescript
// web/src/components/KnowledgeTree/KnowledgeNodePopover.tsx
interface KnowledgeNodePopoverProps {
  node: KnowledgeTreeNode;
  children: React.ReactNode;
}
```

### 2.2 Trigger

- **TreeView**: 悬停在 `TreeNodeTitle` 上，延迟 300ms
- **MindMapView**: 悬停在 SVG `<rect>` 节点上，延迟 300ms

### 2.3 Content

使用 Ant Design `Popover`，内容结构：

```
┌─────────────────────────┐
│ 📘 {知识点标题}          │
├─────────────────────────┤
│ 重要性: {A/B/C 标签}     │
├─────────────────────────┤
│ 定义:                   │
│ {definition}            │
│ （最多显示 6 行，超长截断）│
├─────────────────────────┤
│ 状态: {学习状态图标}     │  ← 仅登录用户显示
└─────────────────────────┘
```

- 无定义时显示 "暂无定义"
- 定义文本最大高度约 120px，溢出截断，底部显示 "..."
- 学习状态字段依赖 `node.learningStatus`
- Popover 不拦截点击事件：悬停显示 Popover，点击节点仍触发 `onSelect`

---

## 3. MindMap Enhancement

### 3.1 Layout Mode Selection

新增 `LayoutMode` 类型：

```typescript
type LayoutMode = 'tree' | 'balanced';
```

在 `MindMapView` 工具栏增加下拉选择器：

```
[Mind Map]  [Layout: ▼ Tree]  [Zoom - 100% +] [Reset] [Expand] [Collapse]
```

### 3.2 Tree Layout（Existing）

保持当前实现：所有子节点从父节点右侧水平向右展开。

### 3.3 Balanced Layout（New）

**规则：**

- 根节点位于画布中心
- 二级节点对半分：
  - `leftChildren = children.slice(0, Math.ceil(n/2))` → 父节点**左侧**
  - `rightChildren = children.slice(Math.ceil(n/2))` → 父节点**右侧**
- 左侧子节点在父节点正左方，上下均匀分布
- 右侧子节点在父节点正右方，上下均匀分布
- 三级及以下节点延续父节点的方向（左侧的继续向左，右侧的继续向右）

**连接线：**
- 水平方向的贝塞尔曲线（弧线），非直线
- 从父节点左/右边缘弧线连接到子节点右/左边缘

**示意图：**

```
        [L1]  ←═══  [Root]  ═══→  [R1]
        [L2]  ←═══          ═══→  [R2]
        [L3]  ←═══          ═══→  [R3]
```

### 3.4 MiniMap（Eagle Eye）

**Behavior:**
- 可展开/折叠的面板，默认展开
- 位置：脑图画布内，可拖动，默认右下角
- 尺寸：固定 200×150px
- 显示完整脑图的缩略视图
- 当前可视区域用半透明矩形框标示
- 点击 MiniMap 任意位置，主视图中心跳转到对应区域

**Implementation:**
- 复用现有 SVG 渲染逻辑，缩放至固定尺寸
- 使用 `<rect>` 标示 viewport
- 面板头部有折叠按钮（`UpOutlined` / `DownOutlined`）
- 折叠后显示为小浮窗按钮（`EyeOutlined`），点击展开

### 3.5 Middle-Click Pan

**Behavior:**
- 监听 `mousedown`，判断 `event.button === 1`（中键）
- 中键按下时：
  - 阻止默认行为（避免触发滚动模式）
  - 进入拖动模式，记录起始鼠标位置和当前 `translate`
  - 光标变为 `grab`
- `mousemove` 时更新 `translate` = 起始 translate + (当前鼠标 - 起始鼠标)
- `mouseup` 时退出拖动模式
- 边界限制：平移后画布内容区域至少保留 100px 在可视区域内（防止完全拖出视野）

---

## 4. Data Model & Types

### 4.1 New Types

```typescript
// web/src/components/KnowledgeTree/types.ts

type LayoutMode = 'tree' | 'balanced';

interface MindMapViewProps {
  data: KnowledgeTreeNode[];
  selectedKey?: string;
  maxDepth?: number;
  layoutMode?: LayoutMode;        // NEW
  loading?: boolean;
  onSelect?: (node: KnowledgeTreeNode) => void;
}
```

### 4.2 Updated MindMapNodeLayout

```typescript
interface MindMapNodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: KnowledgeTreeNode;
  children?: MindMapNodeLayout[];
  depth: number;
  direction?: 'left' | 'right';   // NEW: for balanced layout
}
```

---

## 5. Component Architecture

```
KnowledgeTree
├── TreeView
│   └── TreeNodeTitle
│       └── KnowledgeNodePopover      ← NEW
├── MindMapView
│   ├── Toolbar
│   │   └── LayoutModeSelector        ← NEW
│   ├── MiniMapPanel                  ← NEW
│   │   ├── MiniMapCanvas
│   │   └── ViewportRect
│   ├── SVG Canvas
│   │   ├── Connections (Bezier curves)
│   │   └── MindMapNode
│   │       └── KnowledgeNodePopover  ← NEW
│   └── PanController (hook)          ← NEW
```

---

## 6. File Changes

### New Files

| File | Description |
|------|-------------|
| `web/src/contexts/TextbookContext.tsx` | 全局教材选择状态 |
| `web/src/components/KnowledgeTree/KnowledgeNodePopover.tsx` | 节点悬停提示 |
| `web/src/components/KnowledgeTree/MiniMapPanel.tsx` | 鹰眼面板 |
| `web/src/hooks/usePanController.ts` | 中键拖动逻辑 |

### Modified Files

| File | Changes |
|------|---------|
| `web/src/components/Layout/AppLayout.tsx` | 集成教材选择器 |
| `web/src/components/KnowledgeTree/KnowledgeTree.tsx` | 传递 layoutMode |
| `web/src/components/KnowledgeTree/TreeView.tsx` | 集成 Popover |
| `web/src/components/KnowledgeTree/MindMapView.tsx` | 布局算法、MiniMap、拖动 |
| `web/src/components/KnowledgeTree/types.ts` | 新增类型 |
| `web/src/pages/LearningPage/LearningPage.tsx` | 使用 TextbookContext |
| `web/src/App.tsx` | 包裹 TextbookProvider |

---

## 7. Testing Considerations

- TreeView 键盘导航不受 Popover 影响
- MindMapView 缩放、展开/折叠在 Balanced 布局下正常工作
- MiniMap 点击跳转与主视图同步
- 中键拖动在鼠标离开画布后释放仍能正确结束
- 教材选择变化后，LearningPage 重新加载对应知识树

---

## 8. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| 教材选择位置 | 顶部导航栏全局选择器 |
| 教材多选影响 | 学习/考试/分析等模块基于选中教材过滤 |
| 二级节点分配 | 对半分：前半左，后半右 |
| 二级节点方向 | 正左侧/正右侧水平展开，非左下/右下 |
| 连接线样式 | 水平贝塞尔弧线 |
| 鹰眼交互 | 可展开/折叠面板，点击跳转 |
| 拖动方式 | 中键拖动 |
| 悬停提示样式 | 丰富 Popover（定义+重要性+状态） |
