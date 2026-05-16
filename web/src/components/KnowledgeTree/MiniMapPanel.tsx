import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { MindMapNodeLayout } from './types'
import styles from './MiniMapPanel.module.css'

const renderMiniNode = (node: MindMapNodeLayout, miniScale: number): React.ReactNode => (
  <g key={node.id}>
    <rect
      x={node.x * miniScale}
      y={node.y * miniScale}
      width={node.width * miniScale}
      height={node.height * miniScale}
      fill="#e6f7ff"
      stroke="#1890ff"
      strokeWidth={0.5}
      rx={2}
    />
    {node.children?.map(child => (
      <g key={`conn-${child.id}`}>
        <line
          x1={(node.x + node.width / 2) * miniScale}
          y1={(node.y + node.height / 2) * miniScale}
          x2={(child.x + child.width / 2) * miniScale}
          y2={(child.y + child.height / 2) * miniScale}
          stroke="#1890ff"
          strokeWidth={0.5}
        />
        {renderMiniNode(child, miniScale)}
      </g>
    ))}
  </g>
)

interface MiniMapPanelProps {
  layout: MindMapNodeLayout[]
  svgWidth: number
  svgHeight: number
  translate: { x: number; y: number }
  scale: number
  containerWidth: number
  containerHeight: number
  onNavigate: (x: number, y: number) => void
  onViewportPan?: (contentDeltaX: number, contentDeltaY: number) => void
}

const MINI_MAP_WIDTH = 200
const MINI_MAP_HEIGHT = 150

export const MiniMapPanel: React.FC<MiniMapPanelProps> = ({
  layout,
  svgWidth,
  svgHeight,
  translate,
  scale,
  containerWidth,
  containerHeight,
  onNavigate,
  onViewportPan,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const miniScale = useMemo(() => {
    const safeW = Math.max(svgWidth, 1)
    const safeH = Math.max(svgHeight, 1)
    const scaleX = MINI_MAP_WIDTH / safeW
    const scaleY = MINI_MAP_HEIGHT / safeH
    return Math.min(scaleX, scaleY)
  }, [svgWidth, svgHeight])

  // Viewport rectangle in mini-map coordinates
  const viewportRect = useMemo(() => {
    const safeScale = scale > 1e-6 ? scale : 1
    const x = (-translate.x / safeScale) * miniScale
    const y = (-translate.y / safeScale) * miniScale
    const w = (containerWidth / safeScale) * miniScale
    const h = (containerHeight / safeScale) * miniScale
    return { x, y, w, h }
  }, [translate, scale, miniScale, containerWidth, containerHeight])

  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      if (isDragging) return
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      // Convert mini-map coordinates back to content coordinates
      const contentX = clickX / miniScale
      const contentY = clickY / miniScale
      onNavigate(contentX, contentY)
    },
    [miniScale, onNavigate, isDragging]
  )

  const handleViewportMouseDown = useCallback((e: React.MouseEvent<SVGRectElement>): void => {
    e.stopPropagation()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent): void => {
      if (!dragStartRef.current || !onViewportPan) return
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      // Convert mini-map pixel delta to content coordinates
      const contentDeltaX = dx / miniScale
      const contentDeltaY = dy / miniScale
      onViewportPan(contentDeltaX, contentDeltaY)
    }

    const handleMouseUp = (): void => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, miniScale, onViewportPan])

  return (
    <div className={styles.miniMapPanel} data-testid="mini-map-panel">
      {isExpanded && (
        <div className={styles.panel}>
          <svg
            width={MINI_MAP_WIDTH}
            height={MINI_MAP_HEIGHT}
            className={styles.miniMapSvg}
            data-testid="mini-map-svg"
            onClick={handleMiniMapClick}
          >
            <rect
              x={0}
              y={0}
              width={MINI_MAP_WIDTH}
              height={MINI_MAP_HEIGHT}
              fill="#fafafa"
              stroke="#d9d9d9"
              strokeWidth={1}
            />
            {layout.map(node => renderMiniNode(node, miniScale))}
            {/* Viewport indicator */}
            <rect
              x={viewportRect.x}
              y={viewportRect.y}
              width={viewportRect.w}
              height={viewportRect.h}
              fill="rgba(24, 144, 255, 0.15)"
              stroke="#1890ff"
              strokeWidth={1}
              strokeDasharray="4 2"
              style={{ cursor: onViewportPan ? 'move' : 'default' }}
              onMouseDown={handleViewportMouseDown}
            />
          </svg>
        </div>
      )}
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Collapse MiniMap' : 'Expand MiniMap'}
      >
        {isExpanded ? <EyeInvisibleOutlined /> : <EyeOutlined />}
      </button>
    </div>
  )
}
