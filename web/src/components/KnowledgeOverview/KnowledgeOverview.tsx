import React from 'react';
import { Card, Tag } from 'antd';
import type { ImportanceLevel } from '../../types/knowledge.types';
import styles from './KnowledgeOverview.module.css';

const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  A: '#FF4D4F',
  B: '#FAAD14',
  C: '#1890FF',
};

interface KnowledgeOverviewProps {
  definition?: string;
  characteristics?: string;
  importanceLevel?: string;
}

export const KnowledgeOverview: React.FC<KnowledgeOverviewProps> = ({
  definition,
  characteristics,
  importanceLevel,
}) => {
  if (!definition && !characteristics && !importanceLevel) {
    return null;
  }

  return (
    <Card className={styles.overviewCard} size="small">
      <div className={styles.overviewContent}>
        {definition && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>定义：</span>
            <span className={styles.value}>{definition}</span>
          </div>
        )}
        {characteristics && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>特性：</span>
            <span className={styles.value}>{characteristics}</span>
          </div>
        )}
        {importanceLevel && (
          <div className={styles.overviewItem}>
            <span className={styles.label}>重要性：</span>
            <Tag
              color={IMPORTANCE_COLORS[importanceLevel as ImportanceLevel] || '#1890FF'}
              className={styles.importanceTag}
            >
              {importanceLevel}
            </Tag>
          </div>
        )}
      </div>
    </Card>
  );
};

export default KnowledgeOverview;
