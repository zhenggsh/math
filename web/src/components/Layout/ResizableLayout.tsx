import React, { useLayoutEffect, useState, useCallback } from 'react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import styles from './ResizableLayout.module.css'

export interface ResizableLayoutProps {
  /** 左侧面板内容 */
  leftPanel: React.ReactNode
  /** 中间主内容区 */
  centerPanel: React.ReactNode
  /** 右侧面板内容（可选） */
  rightPanel?: React.ReactNode
  /** 底部面板内容（可选） */
  bottomPanel?: React.ReactNode
  /** 初始分栏尺寸 */
  defaultSizes?: {
    left?: number
    center?: number
    right?: number
    bottom?: number
  }
  /** 最小分栏尺寸 */
  minSizes?: {
    left?: number
    center?: number
    right?: number
    bottom?: number
  }
  /** 是否显示右侧面板 */
  showRightPanel?: boolean
  /** 是否显示底部面板 */
  showBottomPanel?: boolean
  /** 尺寸变化回调 */
  onSizesChange?: (sizes: number[]) => void
}

const STORAGE_KEY = 'mathtong:layout:sizes'

const DEFAULT_SIZES = {
  left: 280,
  center: 600,
  right: 320,
  bottom: 200,
}

const MIN_SIZES = {
  left: 200,
  center: 400,
  right: 250,
  bottom: 150,
}

/**
 * 可拖拽分栏布局组件
 * 支持左/中/右三栏水平布局，以及主内容区/底部垂直布局
 */
export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  defaultSizes = DEFAULT_SIZES,
  minSizes = MIN_SIZES,
  showRightPanel = true,
  showBottomPanel = false,
  onSizesChange,
}) => {
  const [horizontalSizes, setHorizontalSizes] = useState<number[]>(() => {
    // 从 localStorage 恢复尺寸
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { left?: number; center?: number; right?: number }
          const sizes: number[] = [
            (parsed.left || defaultSizes.left || DEFAULT_SIZES.left) as number,
            (parsed.center || defaultSizes.center || DEFAULT_SIZES.center) as number,
          ]
          if (showRightPanel) {
            sizes.push((parsed.right || defaultSizes.right || DEFAULT_SIZES.right) as number)
          }
          return sizes
        } catch {
          // 解析失败使用默认值
        }
      }
    }
    const sizes = [defaultSizes.left, defaultSizes.center]
    if (showRightPanel) {
      sizes.push(defaultSizes.right)
    }
    return sizes as number[]
  })

  const [verticalSizes, setVerticalSizes] = useState<number[]>([
    100 - (defaultSizes.bottom || 200) / 8,
    defaultSizes.bottom || 200,
  ])

  // 保存尺寸到 localStorage
  const saveSizes = useCallback(
    (sizes: number[]) => {
      if (typeof window !== 'undefined') {
        const [left, center, right] = sizes
        const saved = {
          left,
          center,
          right,
          bottom: defaultSizes.bottom,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      }
    },
    [defaultSizes.bottom]
  )

  // 处理水平分栏尺寸变化
  const handleHorizontalChange = useCallback(
    (sizes: number[]) => {
      setHorizontalSizes(sizes)
      saveSizes(sizes)
      onSizesChange?.(sizes)
    },
    [saveSizes, onSizesChange]
  )

  // 处理垂直分栏尺寸变化
  const handleVerticalChange = useCallback((sizes: number[]) => {
    setVerticalSizes(sizes)
  }, [])

  // 当显示/隐藏面板时更新尺寸数组
  useLayoutEffect(() => {
    queueMicrotask(() => {
      setHorizontalSizes(prev => {
        const [left, center, right] = prev
        if (showRightPanel && prev.length === 2) {
          return [left, center, right || defaultSizes.right] as number[]
        } else if (!showRightPanel && prev.length === 3) {
          return [left, center] as number[]
        }
        return prev
      })
    })
  }, [showRightPanel, defaultSizes.right])

  // 主内容区（可能包含底部面板）
  const mainContent = showBottomPanel ? (
    <Allotment vertical onChange={handleVerticalChange} defaultSizes={verticalSizes}>
      <Allotment.Pane minSize={300}>{centerPanel}</Allotment.Pane>
      <Allotment.Pane minSize={minSizes.bottom}>{bottomPanel}</Allotment.Pane>
    </Allotment>
  ) : (
    centerPanel
  )

  return (
    <div className={styles.resizableLayout}>
      <Allotment
        onChange={handleHorizontalChange}
        defaultSizes={horizontalSizes}
        proportionalLayout={false}
      >
        <Allotment.Pane minSize={minSizes.left} preferredSize={defaultSizes.left}>
          <div className={styles.panel}>{leftPanel}</div>
        </Allotment.Pane>

        <Allotment.Pane minSize={minSizes.center}>
          <div className={styles.panel}>{mainContent}</div>
        </Allotment.Pane>

        {showRightPanel && rightPanel && (
          <Allotment.Pane minSize={minSizes.right} preferredSize={defaultSizes.right}>
            <div className={styles.panel}>{rightPanel}</div>
          </Allotment.Pane>
        )}
      </Allotment>
    </div>
  )
}

export default ResizableLayout
