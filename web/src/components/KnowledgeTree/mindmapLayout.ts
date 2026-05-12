import type { KnowledgeTreeNode, MindMapNodeLayout, LayoutMode } from './types'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const LEVEL_GAP = 180
const NODE_GAP = 20
const PADDING = 50

export const calculateSubtreeLayout = (
  node: KnowledgeTreeNode,
  maxDepth: number,
  collapsedKeys: Set<string>,
  layoutMode: LayoutMode,
  depth = 0,
  x = 0,
  direction: 'left' | 'right' = 'right'
): { root: MindMapNodeLayout; totalHeight: number } => {
  const isCollapsed = collapsedKeys.has(node.key)
  const hasChildren = node.children && node.children.length > 0 && depth < maxDepth

  const nodeLayout: MindMapNodeLayout = {
    id: node.key,
    x,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: node,
    depth,
    direction,
  }

  if (!hasChildren || isCollapsed) {
    return { root: nodeLayout, totalHeight: NODE_HEIGHT + NODE_GAP }
  }

  const children = node.children!
  const childLayouts: MindMapNodeLayout[] = []
  let totalChildrenHeight = 0

  if (layoutMode === 'balanced' && depth === 0) {
    const leftCount = Math.ceil(children.length / 2)
    const leftChildren = children.slice(0, leftCount)
    const rightChildren = children.slice(leftCount)

    const leftResults = leftChildren.map(child =>
      calculateSubtreeLayout(
        child,
        maxDepth,
        collapsedKeys,
        layoutMode,
        depth + 1,
        x - LEVEL_GAP,
        'left'
      )
    )

    const rightResults = rightChildren.map(child =>
      calculateSubtreeLayout(
        child,
        maxDepth,
        collapsedKeys,
        layoutMode,
        depth + 1,
        x + LEVEL_GAP,
        'right'
      )
    )

    const leftTotalHeight = leftResults.reduce((sum, r) => sum + r.totalHeight, 0)
    let leftY = -(leftTotalHeight / 2)
    for (const result of leftResults) {
      result.root.y = leftY + result.totalHeight / 2 - (NODE_HEIGHT + NODE_GAP) / 2
      childLayouts.push(result.root)
      leftY += result.totalHeight
    }

    const rightTotalHeight = rightResults.reduce((sum, r) => sum + r.totalHeight, 0)
    let rightY = -(rightTotalHeight / 2)
    for (const result of rightResults) {
      result.root.y = rightY + result.totalHeight / 2 - (NODE_HEIGHT + NODE_GAP) / 2
      childLayouts.push(result.root)
      rightY += result.totalHeight
    }

    totalChildrenHeight = Math.max(leftTotalHeight, rightTotalHeight)
  } else {
    const childX = direction === 'left' ? x - LEVEL_GAP : x + LEVEL_GAP

    const results = children.map(child =>
      calculateSubtreeLayout(
        child,
        maxDepth,
        collapsedKeys,
        layoutMode,
        depth + 1,
        childX,
        direction
      )
    )

    const childrenHeight = results.reduce((sum, r) => sum + r.totalHeight, 0)
    let currentY = -(childrenHeight / 2)

    for (const result of results) {
      result.root.y = currentY + result.totalHeight / 2 - (NODE_HEIGHT + NODE_GAP) / 2
      childLayouts.push(result.root)
      currentY += result.totalHeight
    }

    totalChildrenHeight = childrenHeight
  }

  nodeLayout.children = childLayouts
  const nodeTotalHeight = Math.max(NODE_HEIGHT + NODE_GAP, totalChildrenHeight)

  return { root: nodeLayout, totalHeight: nodeTotalHeight }
}

export const calculateLayout = (
  nodes: KnowledgeTreeNode[],
  maxDepth: number,
  collapsedKeys: Set<string>,
  layoutMode: LayoutMode
): { layout: MindMapNodeLayout[]; totalHeight: number; svgWidth: number; svgHeight: number } => {
  const rootResults = nodes.map(node =>
    calculateSubtreeLayout(node, maxDepth, collapsedKeys, layoutMode)
  )

  let currentY = 0
  const layout: MindMapNodeLayout[] = []

  for (const result of rootResults) {
    const yOffset = currentY - result.root.y
    const applyYOffset = (node: MindMapNodeLayout) => {
      node.y += yOffset
      node.children?.forEach(applyYOffset)
    }
    applyYOffset(result.root)
    layout.push(result.root)
    currentY += result.totalHeight
  }

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

  return { layout, totalHeight: currentY, svgWidth, svgHeight }
}
