import type { KnowledgeTreeNode, MindMapNodeLayout, LayoutMode } from './types'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const LEVEL_GAP = 180
const NODE_GAP = 20
const PADDING = 50

/**
 * 逻辑节点 —— 描述子节点的逻辑分布（左/右），与折叠状态无关
 */
interface LogicalNode {
  id: string
  data: KnowledgeTreeNode
  depth: number
  direction: 'left' | 'right'
  leftChildren: LogicalNode[]
  rightChildren: LogicalNode[]
  hasLeftChildren: boolean
  hasRightChildren: boolean
}

/**
 * Phase 1: 构建逻辑树
 * 始终基于原始数据确定哪些子节点在左、哪些在右，不受折叠状态影响
 */
const buildLogicalTree = (
  node: KnowledgeTreeNode,
  depth: number,
  direction: 'left' | 'right',
  layoutMode: LayoutMode
): LogicalNode => {
  const children = node.children || []

  let leftChildren: LogicalNode[] = []
  let rightChildren: LogicalNode[] = []

  if (layoutMode === 'balanced' && depth === 0 && children.length > 0) {
    const leftCount = Math.ceil(children.length / 2)
    leftChildren = children
      .slice(0, leftCount)
      .map(child => buildLogicalTree(child, depth + 1, 'left', layoutMode))
    rightChildren = children
      .slice(leftCount)
      .map(child => buildLogicalTree(child, depth + 1, 'right', layoutMode))
  } else if (children.length > 0) {
    if (direction === 'left') {
      leftChildren = children.map(child => buildLogicalTree(child, depth + 1, 'left', layoutMode))
    } else {
      rightChildren = children.map(child => buildLogicalTree(child, depth + 1, 'right', layoutMode))
    }
  }

  return {
    id: node.key,
    data: node,
    depth,
    direction,
    leftChildren,
    rightChildren,
    hasLeftChildren: leftChildren.length > 0,
    hasRightChildren: rightChildren.length > 0,
  }
}

/**
 * Phase 2: 计算子树高度（后序遍历）
 * 基于折叠状态计算该子树实际占用的垂直高度
 * 左右两侧独立计算，取最大值
 */
const calculateSubtreeHeight = (
  logical: LogicalNode,
  collapsedLeftKeys: Set<string>,
  collapsedRightKeys: Set<string>,
  maxDepth: number
): number => {
  if (logical.depth >= maxDepth) {
    return NODE_HEIGHT
  }

  const leftVisible = !collapsedLeftKeys.has(logical.id) ? logical.leftChildren : []
  const rightVisible = !collapsedRightKeys.has(logical.id) ? logical.rightChildren : []

  if (leftVisible.length === 0 && rightVisible.length === 0) {
    return NODE_HEIGHT
  }

  // 计算左侧子树总高度
  let leftTotal = 0
  for (let i = 0; i < leftVisible.length; i++) {
    leftTotal += calculateSubtreeHeight(
      leftVisible[i],
      collapsedLeftKeys,
      collapsedRightKeys,
      maxDepth
    )
    if (i < leftVisible.length - 1) {
      leftTotal += NODE_GAP
    }
  }

  // 计算右侧子树总高度
  let rightTotal = 0
  for (let i = 0; i < rightVisible.length; i++) {
    rightTotal += calculateSubtreeHeight(
      rightVisible[i],
      collapsedLeftKeys,
      collapsedRightKeys,
      maxDepth
    )
    if (i < rightVisible.length - 1) {
      rightTotal += NODE_GAP
    }
  }

  return Math.max(NODE_HEIGHT, leftTotal, rightTotal)
}

/**
 * Phase 3: 分配物理坐标（前序遍历）
 * 左右子节点独立处理，各自在可用空间内垂直居中
 */
const assignCoordinates = (
  logical: LogicalNode,
  collapsedLeftKeys: Set<string>,
  collapsedRightKeys: Set<string>,
  maxDepth: number,
  x: number,
  yStart: number,
  availableHeight: number
): MindMapNodeLayout => {
  const nodeLayout: MindMapNodeLayout = {
    id: logical.id,
    x,
    y: yStart + availableHeight / 2 - NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: logical.data,
    depth: logical.depth,
    direction: logical.direction,
    hasLeftChildren: logical.hasLeftChildren,
    hasRightChildren: logical.hasRightChildren,
  }

  if (logical.depth >= maxDepth) {
    return nodeLayout
  }

  const leftVisible = !collapsedLeftKeys.has(logical.id) ? logical.leftChildren : []
  const rightVisible = !collapsedRightKeys.has(logical.id) ? logical.rightChildren : []

  nodeLayout.children = []

  // 处理左侧子节点
  if (leftVisible.length > 0) {
    const leftChildHeights = leftVisible.map(child =>
      calculateSubtreeHeight(child, collapsedLeftKeys, collapsedRightKeys, maxDepth)
    )
    const leftTotalHeight = leftChildHeights.reduce((sum, h, i) => {
      return sum + h + (i < leftChildHeights.length - 1 ? NODE_GAP : 0)
    }, 0)
    const leftStartY = yStart + (availableHeight - leftTotalHeight) / 2

    let currentY = leftStartY
    for (let i = 0; i < leftVisible.length; i++) {
      const child = leftVisible[i]
      const childHeight = leftChildHeights[i]
      const childX = x - LEVEL_GAP

      const childLayout = assignCoordinates(
        child,
        collapsedLeftKeys,
        collapsedRightKeys,
        maxDepth,
        childX,
        currentY,
        childHeight
      )
      nodeLayout.children.push(childLayout)

      currentY += childHeight + NODE_GAP
    }
  }

  // 处理右侧子节点
  if (rightVisible.length > 0) {
    const rightChildHeights = rightVisible.map(child =>
      calculateSubtreeHeight(child, collapsedLeftKeys, collapsedRightKeys, maxDepth)
    )
    const rightTotalHeight = rightChildHeights.reduce((sum, h, i) => {
      return sum + h + (i < rightChildHeights.length - 1 ? NODE_GAP : 0)
    }, 0)
    const rightStartY = yStart + (availableHeight - rightTotalHeight) / 2

    let currentY = rightStartY
    for (let i = 0; i < rightVisible.length; i++) {
      const child = rightVisible[i]
      const childHeight = rightChildHeights[i]
      const childX = x + LEVEL_GAP

      const childLayout = assignCoordinates(
        child,
        collapsedLeftKeys,
        collapsedRightKeys,
        maxDepth,
        childX,
        currentY,
        childHeight
      )
      nodeLayout.children.push(childLayout)

      currentY += childHeight + NODE_GAP
    }
  }

  return nodeLayout
}

/**
 * 计算整个思维导图的布局
 */
export const calculateLayout = (
  nodes: KnowledgeTreeNode[],
  maxDepth: number,
  collapsedLeftKeys: Set<string>,
  collapsedRightKeys: Set<string>,
  layoutMode: LayoutMode
): { layout: MindMapNodeLayout[]; svgWidth: number; svgHeight: number } => {
  if (nodes.length === 0) {
    return { layout: [], svgWidth: 0, svgHeight: 0 }
  }

  // 构建逻辑树
  const logicalRoots = nodes.map(node => buildLogicalTree(node, 0, 'right', layoutMode))

  // 计算每个根节点子树的高度
  const rootHeights = logicalRoots.map(root =>
    calculateSubtreeHeight(root, collapsedLeftKeys, collapsedRightKeys, maxDepth)
  )

  // 分配坐标
  let currentY = 0
  const layout: MindMapNodeLayout[] = []

  for (let i = 0; i < logicalRoots.length; i++) {
    const rootLayout = assignCoordinates(
      logicalRoots[i],
      collapsedLeftKeys,
      collapsedRightKeys,
      maxDepth,
      0,
      currentY,
      rootHeights[i]
    )
    layout.push(rootLayout)
    currentY += rootHeights[i] + NODE_GAP
  }

  // 计算边界并归一化到正坐标
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  const traverse = (node: MindMapNodeLayout) => {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x + node.width)
    minY = Math.min(minY, node.y)
    maxY = Math.max(maxY, node.y + node.height)
    node.children?.forEach(traverse)
  }

  layout.forEach(traverse)

  const dx = -minX + PADDING
  const dy = -minY + PADDING

  const applyOffset = (node: MindMapNodeLayout) => {
    node.x += dx
    node.y += dy
    node.children?.forEach(applyOffset)
  }

  layout.forEach(applyOffset)

  const svgWidth = maxX + dx + PADDING
  const svgHeight = maxY + dy + PADDING

  return { layout, svgWidth, svgHeight }
}
