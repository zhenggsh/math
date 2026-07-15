import React from 'react'
import { Card, Tag } from 'antd'
import type { ImportanceLevel } from '../../types/knowledge.types'
import styles from './KnowledgeOverview.module.css'

const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  A: '#FF4D4F',
  B: '#FAAD14',
  C: '#1890FF',
}

interface KnowledgeOverviewProps {
  definition?: string
  characteristics?: string
  importanceLevel?: ImportanceLevel
}

export const KnowledgeOverview: React.FC<KnowledgeOverviewProps> = ({
  definition,
  characteristics,
  importanceLevel,
}) => {
  const hasDefinition = !!definition
  const hasCharacteristics = !!characteristics
  const hasImportance = !!importanceLevel

  if (!hasDefinition && !hasCharacteristics && !hasImportance) {
    return null
  }

  return (
    <Card className={styles.overviewCard} size="small" title="知识点概览">
      <div className={styles.overviewContent}>
        {hasDefinition && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>定义：</span>
            <span className={styles.value}>{definition}</span>
          </div>
        )}
        {hasCharacteristics && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>特性：</span>
            <span className={styles.value}>{characteristics}</span>
          </div>
        )}
        {hasImportance && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>重要性：</span>
            <Tag
              color={IMPORTANCE_COLORS[importanceLevel] || '#1890FF'}
              className={styles.importanceTag}
            >
              {importanceLevel}
            </Tag>
          </div>
        )}
      </div>
    </Card>
  )
}

export default KnowledgeOverview
