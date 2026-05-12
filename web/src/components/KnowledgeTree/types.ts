import type { ImportanceLevel, KnowledgePoint } from '../../types/knowledge.types'

/**
 * 知识树节点数据接口
 */
export interface KnowledgeTreeNode {
  /** 节点唯一标识 */
  key: string
  /** 节点标题 */
  title: string
  /** 知识点编号 */
  code: string
  /** 重要性级别 */
  importanceLevel: ImportanceLevel
  /** 学习状态 */
  learningStatus?: LearningStatus
  /** 子节点 */
  children?: KnowledgeTreeNode[]
  /** 是否叶子节点 */
  isLeaf?: boolean
  /** 原始数据 */
  data: KnowledgePoint
}

/**
 * 学习状态
 */
export type LearningStatus = 'not_started' | 'learning' | 'mastered' | 'review_needed'


/**
 * 视图模式
 */
export type ViewMode = 'tree' | 'mindmap'

/**
 * 布局模式
 */
export type LayoutMode = 'tree' | 'balanced'

/**
 * KnowledgeTree 组件 Props
 */
export interface KnowledgeTreeProps {
  /** 知识树数据 */
  data: KnowledgeTreeNode[]
  /** 当前选中节点 key */
  selectedKey?: string
  /** 当前视图模式 */
  viewMode?: ViewMode
  /** 加载状态 */
  loading?: boolean
  /** 选中节点变化回调 */
  onSelect?: (node: KnowledgeTreeNode) => void
  /** 视图模式变化回调 */
  onViewModeChange?: (mode: ViewMode) => void
  /** 节点展开/折叠回调 */
  onExpand?: (expandedKeys: string[]) => void
  /** 展开的节点 keys */
  expandedKeys?: string[]
  /** 默认展开的节点 keys */
  defaultExpandedKeys?: string[]
  /** 布局模式 */
  layoutMode?: LayoutMode
  /** 布局模式变化回调 */
  onLayoutModeChange?: (mode: LayoutMode) => void
}

/**
 * TreeView 组件 Props
 */
export interface TreeViewProps {
  /** 树数据 */
  data: KnowledgeTreeNode[]
  /** 选中节点 key */
  selectedKey?: string
  /** 展开节点 keys */
  expandedKeys?: string[]
  /** 默认展开的节点 keys */
  defaultExpandedKeys?: string[]
  /** 加载状态 */
  loading?: boolean
  /** 选中回调 */
  onSelect?: (node: KnowledgeTreeNode) => void
  /** 展开回调 */
  onExpand?: (expandedKeys: string[]) => void
}

/**
 * MindMapView 组件 Props
 */
export interface MindMapViewProps {
  /** 知识树数据 */
  data: KnowledgeTreeNode[]
  /** 选中节点 key */
  selectedKey?: string
  /** 最大显示深度 */
  maxDepth?: number
  /** 加载状态 */
  loading?: boolean
  /** 选中回调 */
  onSelect?: (node: KnowledgeTreeNode) => void
  /** 布局模式 */
  layoutMode?: LayoutMode
  /** 布局模式变化回调 */
  onLayoutModeChange?: (mode: LayoutMode) => void
}

/**
 * 思维导图节点布局信息
 */
export interface MindMapNodeLayout {
  /** 节点 ID */
  id: string
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
  /** 节点宽度 */
  width: number
  /** 节点高度 */
  height: number
  /** 节点数据 */
  data: KnowledgeTreeNode
  /** 子节点布局 */
  children?: MindMapNodeLayout[]
  /** 深度层级 */
  depth: number
  /** 节点方向（平衡布局时使用） */
  direction?: 'left' | 'right'
}
