import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Empty, Spin, Button, Space, Select } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import type { MindMapViewProps, KnowledgeTreeNode, MindMapNodeLayout, LayoutMode } from './types'
import { calculateLayout } from './mindmapLayout'
import { usePanController } from './usePanController'
import { MiniMapPanel } from './MiniMapPanel'
import { KnowledgeNodePopover } from './KnowledgeNodePopover'
import styles from './MindMapView.module.css'

const MAX_DEPTH_DEFAULT = 3

interface Connection {
  parent: MindMapNodeLayout
  child: MindMapNodeLayout
}

/**
 * 收集所有父子连接关系
 */
const collectConnections = (layout: MindMapNodeLayout[]): Connection[] => {
  const connections: Connection[] = []
  for (const node of layout) {
    if (node.children) {
      for (const child of node.children) {
        connections.push({ parent: node, child })
        connections.push(...collectConnections([child]))
      }
    }
  }
  return connections
}

/**
 * 计算贝塞尔曲线连接路径，支持左右双向
 */
const calculateConnectionPath = (parent: MindMapNodeLayout, child: MindMapNodeLayout): string => {
  const parentCenterX = parent.x + parent.width / 2
  const childCenterX = child.x + child.width / 2

  if (childCenterX < parentCenterX) {
    // 子节点在左侧
    const startX = parent.x
    const startY = parent.y + parent.height / 2
    const endX = child.x + child.width
    const endY = child.y + child.height / 2
    const cp1x = startX - 50
    const cp1y = startY
    const cp2x = endX + 50
    const cp2y = endY
    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`
  } else {
    // 子节点在右侧
    const startX = parent.x + parent.width
    const startY = parent.y + parent.height / 2
    const endX = child.x
    const endY = child.y + child.height / 2
    const cp1x = startX + 50
    const cp1y = startY
    const cp2x = endX - 50
    const cp2y = endY
    return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`
  }
}

interface MindMapNodeProps {
  layout: MindMapNodeLayout
  selectedKey?: string
  collapsedKeys: Set<string>
  onSelect: (node: KnowledgeTreeNode) => void
  onToggleCollapse: (key: string) => void
  onHover: (node: MindMapNodeLayout | null) => void
  parentLayout?: MindMapNodeLayout
}

/**
 * 渲染单个思维导图节点
 */
const MindMapNode: React.FC<MindMapNodeProps> = ({
  layout,
  selectedKey,
  collapsedKeys,
  onSelect,
  onToggleCollapse,
  onHover,
  parentLayout,
}) => {
  const isSelected = layout.id === selectedKey
  const importanceColor = {
    A: '#ff4d4f',
    B: '#faad14',
    C: '#8c8c8c',
  }[layout.data.importanceLevel]

  const hasChildren =
    layout.data.children && layout.data.children.length > 0 && layout.depth < MAX_DEPTH_DEFAULT
  const isCollapsed = collapsedKeys.has(layout.id)

  // 使用相对坐标，避免父节点 <g> 的 transform 叠加
  const relativeX = parentLayout ? layout.x - parentLayout.x : layout.x
  const relativeY = parentLayout ? layout.y - parentLayout.y : layout.y

  return (
    <g
      transform={`translate(${relativeX}, ${relativeY})`}
      onMouseEnter={() => onHover(layout)}
      onMouseLeave={() => onHover(null)}
    >
      {/* 节点矩形 */}
      <rect
        x={0}
        y={0}
        width={layout.width}
        height={layout.height}
        rx={4}
        ry={4}
        fill={isSelected ? '#e6f7ff' : '#fff'}
        stroke={isSelected ? '#1890ff' : importanceColor}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'pointer' }}
        onClick={() => onSelect(layout.data)}
      />

      {/* 重要性指示条 */}
      <rect x={0} y={0} width={4} height={layout.height} rx={2} ry={2} fill={importanceColor} />

      {/* 节点文字 */}
      <text
        x={10}
        y={layout.height / 2 + 4}
        fontSize={12}
        fill="#262626"
        style={{
          pointerEvents: 'none',
          maxWidth: layout.width - 20,
        }}
      >
        {layout.data.title.length > 12 ? `${layout.data.title.slice(0, 12)}...` : layout.data.title}
      </text>

      {/* 折叠/展开按钮 */}
      {hasChildren && (
        <g
          transform={`translate(${layout.width - 6}, ${layout.height / 2})`}
          style={{ cursor: 'pointer' }}
          onClick={(e: React.MouseEvent) => {
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
          onHover={onHover}
          parentLayout={layout}
        />
      ))}
    </g>
  )
}

/**
 * 思维导图视图组件
 * 使用 SVG 实现，支持水平层次布局和平衡布局
 */
export const MindMapView: React.FC<MindMapViewProps> = ({
  data,
  selectedKey,
  maxDepth = MAX_DEPTH_DEFAULT,
  loading = false,
  onSelect,
  layoutMode = 'tree',
  onLayoutModeChange,
}) => {
  const [scale, setScale] = useState(1)
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<MindMapNodeLayout | null>(null)
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const updateSize = (): void => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    }

    updateSize()

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [])

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
  const { layout, svgWidth, svgHeight } = useMemo(() => {
    return calculateLayout(data, maxDepth, collapsedKeys, layoutMode)
  }, [data, maxDepth, collapsedKeys, layoutMode])

  // 平移控制器
  const { translate, isPanning, setTranslate, handlers } = usePanController({
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
    contentWidth: svgWidth,
    contentHeight: svgHeight,
  })

  // 处理节点选择
  const handleSelect = useCallback(
    (node: KnowledgeTreeNode) => {
      onSelect?.(node)
    },
    [onSelect]
  )

  // 处理节点悬停
  const handleNodeHover = useCallback(
    (node: MindMapNodeLayout | null) => {
      setHoveredNode(node)
      if (node) {
        const x = translate.x + node.x * scale + node.width * scale
        const y = translate.y + node.y * scale
        setPopoverPosition({ x, y })
      }
    },
    [translate, scale]
  )

  // MiniMap 导航
  const handleMiniMapNavigate = useCallback(
    (x: number, y: number) => {
      setTranslate({
        x: containerSize.width / 2 - x * scale,
        y: containerSize.height / 2 - y * scale,
      })
    },
    [setTranslate, scale, containerSize]
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
  }, [setTranslate])

  // 布局模式切换
  const handleLayoutModeChange = useCallback(
    (value: LayoutMode) => {
      onLayoutModeChange?.(value)
    },
    [onLayoutModeChange]
  )

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

  return (
    <div className={styles.mindMapView}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Mind Map</span>
        <Space>
          <Select
            className={styles.layoutSelector}
            data-testid="layout-selector"
            value={layoutMode}
            onChange={handleLayoutModeChange}
            options={[
              { value: 'tree', label: 'Tree Layout' },
              { value: 'balanced', label: 'Balanced' },
            ]}
            size="small"
          />
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
      <div
        ref={canvasRef}
        className={`${styles.canvas} ${isPanning ? styles.panning : ''}`}
        onMouseDown={handlers.onMouseDown}
      >
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
            {/* 先绘制所有连接线（在节点下方） */}
            {collectConnections(layout).map(({ parent, child }, index) => {
              const childIsLeft = child.x + child.width / 2 < parent.x + parent.width / 2
              return (
                <g key={`conn-${index}`}>
                  <path
                    d={calculateConnectionPath(parent, child)}
                    fill="none"
                    stroke="#1890ff"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  {/* 父节点端连接点 */}
                  <circle
                    cx={childIsLeft ? parent.x : parent.x + parent.width}
                    cy={parent.y + parent.height / 2}
                    r={3}
                    fill="#1890ff"
                  />
                  {/* 子节点端连接点 */}
                  <circle
                    cx={childIsLeft ? child.x + child.width : child.x}
                    cy={child.y + child.height / 2}
                    r={3}
                    fill="#1890ff"
                  />
                </g>
              )
            })}
            {/* 再绘制节点 */}
            {layout.map(node => (
              <MindMapNode
                key={node.id}
                layout={node}
                selectedKey={selectedKey}
                collapsedKeys={collapsedKeys}
                onSelect={handleSelect}
                onToggleCollapse={toggleCollapse}
                onHover={handleNodeHover}
              />
            ))}
          </g>
        </svg>
        {/* 节点悬停弹窗 */}
        {hoveredNode && (
          <div
            className={styles.popoverOverlay}
            style={{
              left: popoverPosition.x,
              top: popoverPosition.y,
            }}
          >
            <KnowledgeNodePopover node={hoveredNode.data} visible={true} />
          </div>
        )}
        {/* 缩略图面板 */}
        <MiniMapPanel
          layout={layout}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          translate={translate}
          scale={scale}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          onNavigate={handleMiniMapNavigate}
        />
      </div>
    </div>
  )
}

export default MindMapView
