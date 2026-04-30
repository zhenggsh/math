import React, { useMemo, useState, useCallback } from 'react'
import { Empty, Spin, Button, Space } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import type { MindMapViewProps, KnowledgeTreeNode, MindMapNodeLayout } from './types'

import styles from './MindMapView.module.css'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const LEVEL_GAP = 180
const NODE_GAP = 20
const MAX_DEPTH_DEFAULT = 3

/**
 * 计算思维导图布局
 * 使用简单的水平层次布局
 */
const calculateLayout = (
  nodes: KnowledgeTreeNode[],
  maxDepth: number,
  collapsedKeys: Set<string>,
  depth = 0,
  startY = 0,
  parentX = 0
): { layout: MindMapNodeLayout[]; totalHeight: number } => {
  const layout: MindMapNodeLayout[] = []
  let currentY = startY

  nodes.forEach(node => {
    if (depth > maxDepth) return

    const x = depth === 0 ? 50 : parentX + LEVEL_GAP
    const y = currentY

    const isCollapsed = collapsedKeys.has(node.key)
    const hasChildren = node.children && node.children.length > 0 && depth < maxDepth

    const nodeLayout: MindMapNodeLayout = {
      id: node.key,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: node,
      depth,
    }

    let childrenHeight = 0
    if (hasChildren && !isCollapsed) {
      const childrenResult = calculateLayout(
        node.children,
        maxDepth,
        collapsedKeys,
        depth + 1,
        currentY,
        x
      )
      nodeLayout.children = childrenResult.layout
      childrenHeight = childrenResult.totalHeight
    }

    const nodeTotalHeight = Math.max(NODE_HEIGHT + NODE_GAP, childrenHeight)
    currentY += nodeTotalHeight

    layout.push(nodeLayout)
  })

  return { layout, totalHeight: currentY - startY }
}

/**
 * 渲染节点
 */
const MindMapNode: React.FC<{
  layout: MindMapNodeLayout
  selectedKey?: string
  collapsedKeys: Set<string>
  onSelect: (node: KnowledgeTreeNode) => void
  onToggleCollapse: (key: string) => void
}> = ({ layout, selectedKey, collapsedKeys, onSelect, onToggleCollapse }) => {
  const isSelected = layout.id === selectedKey
  const importanceColor = {
    A: '#ff4d4f',
    B: '#faad14',
    C: '#8c8c8c',
  }[layout.data.importanceLevel]

  const hasChildren =
    layout.data.children && layout.data.children.length > 0 && layout.depth < MAX_DEPTH_DEFAULT
  const isCollapsed = collapsedKeys.has(layout.id)

  return (
    <g transform={`translate(${layout.x}, ${layout.y})`}>
      {/* 连接线到父节点 */}
      {layout.depth > 0 && (
        <line
          x1={-LEVEL_GAP + NODE_WIDTH}
          y1={NODE_HEIGHT / 2}
          x2={0}
          y2={NODE_HEIGHT / 2}
          stroke="#d9d9d9"
          strokeWidth={2}
        />
      )}

      {/* 节点矩形 */}
      <rect
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={4}
        ry={4}
        fill={isSelected ? '#e6f7ff' : '#fff'}
        stroke={isSelected ? '#1890ff' : importanceColor}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'pointer' }}
        onClick={() => onSelect(layout.data)}
      />

      {/* 重要性指示条 */}
      <rect x={0} y={0} width={4} height={NODE_HEIGHT} rx={2} ry={2} fill={importanceColor} />

      {/* 节点文字 */}
      <text
        x={10}
        y={NODE_HEIGHT / 2 + 4}
        fontSize={12}
        fill="#262626"
        style={{
          pointerEvents: 'none',
          maxWidth: NODE_WIDTH - 20,
        }}
      >
        {layout.data.title.length > 12 ? `${layout.data.title.slice(0, 12)}...` : layout.data.title}
      </text>

      {/* 折叠/展开按钮 */}
      {hasChildren && (
        <g
          transform={`translate(${NODE_WIDTH - 6}, ${NODE_HEIGHT / 2})`}
          style={{ cursor: 'pointer' }}
          onClick={e => {
            e.stopPropagation()
            onToggleCollapse(layout.id)
          }}
        >
          <circle r={8} fill="#fff" stroke="#d9d9d9" strokeWidth={1} />
          <text
            y={3}
            fontSize={12}
            fill="#595959"
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {isCollapsed ? '+' : '-'}
          </text>
        </g>
      )}

      {/* 递归渲染子节点 */}
      {layout.children?.map(child => (
        <MindMapNode
          key={child.id}
          layout={child}
          selectedKey={selectedKey}
          collapsedKeys={collapsedKeys}
          onSelect={onSelect}
          onToggleCollapse={onToggleCollapse}
        />
      ))}
    </g>
  )
}

/**
 * 思维导图视图组件
 * 使用 SVG 实现，支持水平层次布局
 */
export const MindMapView: React.FC<MindMapViewProps> = ({
  data,
  selectedKey,
  maxDepth = MAX_DEPTH_DEFAULT,
  loading = false,
  onSelect,
}) => {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 20, y: 20 })
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())

  // 切换节点折叠状态
  const toggleCollapse = useCallback((key: string) => {
    setCollapsedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // 展开全部
  const expandAll = useCallback(() => {
    setCollapsedKeys(new Set())
  }, [])

  // 折叠全部（只折叠非叶子节点）
  const collapseAll = useCallback(() => {
    const getAllParentKeys = (nodes: KnowledgeTreeNode[], depth = 0): string[] => {
      const keys: string[] = []
      if (depth >= maxDepth) return keys
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          keys.push(node.key)
          keys.push(...getAllParentKeys(node.children, depth + 1))
        }
      }
      return keys
    }
    setCollapsedKeys(new Set(getAllParentKeys(data)))
  }, [data, maxDepth])

  // 计算布局
  const { layout, totalHeight } = useMemo(() => {
    return calculateLayout(data, maxDepth, collapsedKeys)
  }, [data, maxDepth, collapsedKeys])

  // 处理节点选择
  const handleSelect = useCallback(
    (node: KnowledgeTreeNode) => {
      onSelect?.(node)
    },
    [onSelect]
  )

  // 缩放控制
  const zoomIn = useCallback(() => {
    setScale(s => Math.min(s * 1.2, 2))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(s => Math.max(s / 1.2, 0.5))
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    setTranslate({ x: 20, y: 20 })
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Loading..." />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Empty description="No knowledge points" />
      </div>
    )
  }

  const svgWidth = Math.max(800, (maxDepth + 1) * LEVEL_GAP + NODE_WIDTH + 100)
  const svgHeight = Math.max(600, totalHeight + 100)

  return (
    <div className={styles.mindMapView}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Mind Map</span>
        <Space>
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut} size="small" />
          <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
          <Button icon={<ZoomInOutlined />} onClick={zoomIn} size="small" />
          <Button icon={<ReloadOutlined />} onClick={resetView} size="small">
            Reset
          </Button>
          <Button icon={<PlusOutlined />} onClick={expandAll} size="small">
            Expand
          </Button>
          <Button icon={<MinusOutlined />} onClick={collapseAll} size="small">
            Collapse
          </Button>
        </Space>
      </div>
      <div className={styles.canvas}>
        <svg
          width={svgWidth}
          height={svgHeight}
          className={styles.svg}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          <g>
            {layout.map(node => (
              <MindMapNode
                key={node.id}
                layout={node}
                selectedKey={selectedKey}
                collapsedKeys={collapsedKeys}
                onSelect={handleSelect}
                onToggleCollapse={toggleCollapse}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}

export default MindMapView
