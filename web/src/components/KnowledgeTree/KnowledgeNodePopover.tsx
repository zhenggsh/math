import React from 'react'
import { Tag } from 'antd'
import type { KnowledgeTreeNode } from './types'
import type { ImportanceLevel } from '../../types/knowledge.types'
import styles from './KnowledgeNodePopover.module.css'

interface KnowledgeNodePopoverProps {
  node: KnowledgeTreeNode
  visible: boolean
}

const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  A: '#ff4d4f',
  B: '#faad14',
  C: '#8c8c8c',
}

export const KnowledgeNodePopover: React.FC<KnowledgeNodePopoverProps> = ({ node, visible }) => {
  if (!visible) return null

  const definition = node.data?.definition
  const displayDefinition = definition && definition.trim().length > 0 ? definition : '暂无定义'

  return (
    <div className={styles.popover}>
      <div className={styles.title}>{node.title}</div>
      <div className={styles.meta}>
        <Tag
          color={IMPORTANCE_COLORS[node.importanceLevel] || 'default'}
          className={styles.importanceTag}
        >
          {node.importanceLevel}
        </Tag>
      </div>
      <div className={styles.definition}>{displayDefinition}</div>
    </div>
  )
}
