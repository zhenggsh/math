import { useState, useCallback, useMemo } from 'react'
import { Tree, Tag, Spin, Empty, Button } from 'antd'
import type { TreeProps } from 'antd'
import {
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import type { TreeViewProps, KnowledgeTreeNode } from './types'
import type { ImportanceLevel } from '../../types/knowledge.types'
import { KnowledgeNodePopover } from './KnowledgeNodePopover'
import styles from './TreeView.module.css'

/**
 * 重要性级别标签颜色
 */
const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  A: 'red',
  B: 'orange',
  C: 'default',
}

/**
 * 根据 key 在树节点中递归查找节点
 */
const findNodeByKey = (nodes: KnowledgeTreeNode[], key: string): KnowledgeTreeNode | null => {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children) {
      const found = findNodeByKey(node.children, key)
      if (found) return found
    }
  }
  return null
}

/**
 * 学习状态图标和颜色
 */
const LEARNING_STATUS_CONFIG = {
  not_started: { icon: null, color: '' },
  learning: { icon: <SyncOutlined spin />, color: '#1890ff' },
  mastered: { icon: <CheckCircleOutlined />, color: '#52c41a' },
  review_needed: { icon: <ExclamationCircleOutlined />, color: '#faad14' },
}

/**
 * 将 KnowledgeTreeNode 转换为 Ant Design Tree 的数据格式
 */
const convertToTreeData = (nodes: KnowledgeTreeNode[]): TreeProps['treeData'] => {
  return nodes.map(node => ({
    key: node.key,
    title: <TreeNodeTitle node={node} />,
    children: node.children ? convertToTreeData(node.children) : undefined,
    isLeaf: node.isLeaf || !node.children || node.children.length === 0,
  }))
}

/**
 * 树节点标题组件
 */
const TreeNodeTitle: React.FC<{ node: KnowledgeTreeNode }> = ({ node }) => {
  const [isHovered, setIsHovered] = useState(false)
  const statusConfig = node.learningStatus ? LEARNING_STATUS_CONFIG[node.learningStatus] : null

  return (
    <div
      className={styles.treeNodeTitle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={styles.nodeIcon}>
        <BookOutlined />
      </span>
      <span className={styles.nodeText} title={node.title}>
        {node.title}
      </span>
      <Tag color={IMPORTANCE_COLORS[node.importanceLevel]} className={styles.importanceTag}>
        {node.importanceLevel}
      </Tag>
      {statusConfig?.icon && (
        <span className={styles.statusIcon} style={{ color: statusConfig.color }}>
          {statusConfig.icon}
        </span>
      )}
      <KnowledgeNodePopover node={node} visible={isHovered} />
    </div>
  )
}

/**
 * 树图视图组件
 * 使用 Ant Design Tree 实现，支持虚拟滚动
 */
export const TreeView: React.FC<TreeViewProps> = ({
  data,
  selectedKey,
  expandedKeys: controlledExpandedKeys,
  defaultExpandedKeys,
  loading = false,
  onSelect,
  onExpand,
}) => {
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(
    defaultExpandedKeys || []
  )
  const [autoExpandParent, setAutoExpandParent] = useState(true)

  const expandedKeys =
    controlledExpandedKeys !== undefined ? controlledExpandedKeys : internalExpandedKeys

  // 转换树数据
  const treeData = useMemo(() => convertToTreeData(data), [data])

  // 处理节点选择
  const handleSelect: TreeProps['onSelect'] = useCallback(
    (selectedKeys: React.Key[]) => {
      const key = String(selectedKeys[0] || '')
      if (key && onSelect) {
        const node = findNodeByKey(data, key)
        if (node) {
          onSelect(node)
        }
      }
    },
    [data, onSelect]
  )

  // 处理展开/折叠
  const handleExpand: TreeProps['onExpand'] = useCallback(
    (keys: React.Key[]) => {
      setAutoExpandParent(false)
      const stringKeys = keys as string[]
      if (controlledExpandedKeys === undefined) {
        setInternalExpandedKeys(stringKeys)
      }
      onExpand?.(stringKeys)
    },
    [controlledExpandedKeys, onExpand]
  )

  // 展开全部
  const expandAll = useCallback((): void => {
    const getAllKeys = (nodes: KnowledgeTreeNode[]): string[] => {
      const keys: string[] = []
      nodes.forEach(node => {
        keys.push(node.key)
        if (node.children) {
          keys.push(...getAllKeys(node.children))
        }
      })
      return keys
    }
    const allKeys = getAllKeys(data)
    if (controlledExpandedKeys === undefined) {
      setInternalExpandedKeys(allKeys)
    }
    onExpand?.(allKeys)
  }, [data, controlledExpandedKeys, onExpand])

  // 折叠全部
  const collapseAll = useCallback((): void => {
    if (controlledExpandedKeys === undefined) {
      setInternalExpandedKeys([])
    }
    onExpand?.([])
  }, [controlledExpandedKeys, onExpand])

  // 键盘导航：查找当前选中节点的相邻节点
  const findNextNode = useCallback(
    (direction: 'up' | 'down'): KnowledgeTreeNode | null => {
      const flatten = (nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] => {
        const result: KnowledgeTreeNode[] = []
        for (const node of nodes) {
          result.push(node)
          if (node.children && expandedKeys.includes(node.key)) {
            result.push(...flatten(node.children))
          }
        }
        return result
      }
      const flat = flatten(data)
      const currentIndex = flat.findIndex(n => n.key === selectedKey)
      if (currentIndex === -1) return flat[0] || null
      if (direction === 'up') {
        return flat[currentIndex - 1] || null
      }
      return flat[currentIndex + 1] || null
    },
    [data, selectedKey, expandedKeys]
  )

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const node = findNextNode('up')
        if (node && onSelect) onSelect(node)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const node = findNextNode('down')
        if (node && onSelect) onSelect(node)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (selectedKey && expandedKeys.includes(selectedKey)) {
          const keys = expandedKeys.filter(k => k !== selectedKey)
          if (controlledExpandedKeys === undefined) {
            setInternalExpandedKeys(keys)
          }
          onExpand?.(keys)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (selectedKey && !expandedKeys.includes(selectedKey)) {
          const keys = [...expandedKeys, selectedKey]
          if (controlledExpandedKeys === undefined) {
            setInternalExpandedKeys(keys)
          }
          onExpand?.(keys)
        }
      } else if (e.key === 'Enter' && selectedKey && onSelect) {
        e.preventDefault()
        const node = findNodeByKey(data, selectedKey)
        if (node) onSelect(node)
      }
    },
    [selectedKey, expandedKeys, controlledExpandedKeys, onSelect, onExpand, findNextNode, data]
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
    <div className={styles.treeView} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarActions}>
          <Button icon={<PlusOutlined />} onClick={expandAll} size="small">
            Expand All
          </Button>
          <Button icon={<MinusOutlined />} onClick={collapseAll} size="small">
            Collapse All
          </Button>
        </div>
      </div>
      <Tree
        treeData={treeData}
        selectedKeys={selectedKey ? [selectedKey] : []}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        onSelect={handleSelect}
        onExpand={handleExpand}
        virtual
        height={600}
        showLine
        className={styles.tree}
      />
    </div>
  )
}

export default TreeView
