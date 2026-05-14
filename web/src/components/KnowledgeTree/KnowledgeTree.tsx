import React, { useState, useCallback, useEffect } from 'react'
import { Segmented, Spin, Empty } from 'antd'
import { PartitionOutlined, ApartmentOutlined } from '@ant-design/icons'
import { TreeView } from './TreeView'
import { MindMapView } from './MindMapView'
import type { KnowledgeTreeProps, ViewMode, LayoutMode, KnowledgeTreeNode } from './types'
import styles from './KnowledgeTree.module.css'

const VIEW_MODE_KEY = 'mathtong:knowledge-tree:view-mode'
const LAYOUT_MODE_KEY = 'mathtong:knowledge-tree:layout-mode'

/**
 * 知识树主组件
 * 集成树图和思维导图两种视图模式
 */
export const KnowledgeTree: React.FC<KnowledgeTreeProps> = ({
  data,
  selectedKey,
  viewMode: controlledViewMode,
  layoutMode: controlledLayoutMode,
  loading = false,
  onSelect,
  onViewModeChange,
  onLayoutModeChange,
  onExpand,
  expandedKeys,
  defaultExpandedKeys,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(() => {
    // 从 localStorage 恢复视图模式
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_KEY)
      if (saved === 'tree' || saved === 'mindmap') {
        return saved
      }
    }
    return 'tree'
  })

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode

  const [internalLayoutMode, setInternalLayoutMode] = useState<LayoutMode>(() => {
    // 从 localStorage 恢复布局模式
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LAYOUT_MODE_KEY)
      if (saved === 'tree' || saved === 'balanced') {
        return saved
      }
    }
    return 'tree'
  })

  const layoutMode = controlledLayoutMode !== undefined ? controlledLayoutMode : internalLayoutMode

  // 保存视图模式到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && controlledViewMode === undefined) {
      localStorage.setItem(VIEW_MODE_KEY, viewMode)
    }
  }, [viewMode, controlledViewMode])

  // 保存布局模式到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && controlledLayoutMode === undefined) {
      localStorage.setItem(LAYOUT_MODE_KEY, layoutMode)
    }
  }, [layoutMode, controlledLayoutMode])

  // 处理视图模式切换
  const handleViewModeChange = useCallback(
    (value: ViewMode) => {
      if (controlledViewMode === undefined) {
        setInternalViewMode(value)
      }
      onViewModeChange?.(value)
    },
    [controlledViewMode, onViewModeChange]
  )

  // 处理布局模式切换
  const handleLayoutModeChange = useCallback(
    (value: LayoutMode) => {
      if (controlledLayoutMode === undefined) {
        setInternalLayoutMode(value)
      }
      onLayoutModeChange?.(value)
    },
    [controlledLayoutMode, onLayoutModeChange]
  )

  // 处理节点选择
  const handleSelect = useCallback(
    (node: KnowledgeTreeNode) => {
      onSelect?.(node)
    },
    [onSelect]
  )

  // 视图选项
  const viewOptions = [
    { value: 'tree' as ViewMode, label: 'Tree View', icon: <PartitionOutlined /> },
    { value: 'mindmap' as ViewMode, label: 'Mind Map', icon: <ApartmentOutlined /> },
  ]

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="Loading knowledge tree..." />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Empty description="No knowledge points available" />
      </div>
    )
  }

  return (
    <div className={styles.knowledgeTree}>
      <div className={styles.header}>
        <Segmented
          options={viewOptions}
          value={viewMode}
          onChange={value => handleViewModeChange(value)}
          className={styles.viewModeSwitch}
        />
      </div>
      <div className={styles.content}>
        {viewMode === 'tree' ? (
          <TreeView
            data={data}
            selectedKey={selectedKey}
            expandedKeys={expandedKeys}
            defaultExpandedKeys={defaultExpandedKeys}
            loading={loading}
            onSelect={handleSelect}
            onExpand={onExpand}
          />
        ) : (
          <MindMapView
            data={data}
            selectedKey={selectedKey}
            layoutMode={layoutMode}
            onLayoutModeChange={handleLayoutModeChange}
            loading={false}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  )
}

export default KnowledgeTree
