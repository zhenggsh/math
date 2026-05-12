import React, { useState, useMemo, useCallback } from 'react'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import type { MindMapNodeLayout } from './types'
import styles from './MiniMapPanel.module.css'

interface MiniMapPanelProps {
  layout: MindMapNodeLayout[]
  svgWidth: number
  svgHeight: number
  translate: { x: number; y: number }
  scale: number
  containerWidth: number
  containerHeight: number
  onNavigate: (x: number, y: number) => void
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
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const scaleX = MINI_MAP_WIDTH / svgWidth
  const scaleY = MINI_MAP_HEIGHT / svgHeight
  const miniScale = Math.min(scaleX, scaleY)

  // Viewport rectangle in mini-map coordinates
  const viewportRect = useMemo(() => {
    const x = (-translate.x / scale) * miniScale
    const y = (-translate.y / scale) * miniScale
    const w = (containerWidth / scale) * miniScale
    const h = (containerHeight / scale) * miniScale
    return { x, y, w, h }
  }, [translate, scale, miniScale, containerWidth, containerHeight])

  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      // Convert mini-map coordinates back to content coordinates
      const contentX = clickX / miniScale
      const contentY = clickY / miniScale
      onNavigate(contentX, contentY)
    },
    [miniScale, scale, onNavigate]
  )

  const renderMiniNode = (node: MindMapNodeLayout): React.ReactNode => (
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
          {renderMiniNode(child)}
        </g>
      ))}
    </g>
  )

  return (
    <div className={styles.miniMapPanel} data-testid="mini-map-panel">
      {isExpanded && (
        <div className={styles.panel}>
          <svg
            width={MINI_MAP_WIDTH}
            height={MINI_MAP_HEIGHT}
            className={styles.miniMapSvg}
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
            {layout.map(renderMiniNode)}
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
