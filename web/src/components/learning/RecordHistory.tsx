import React, { useState } from 'react';
import { List, Tag, Typography, Empty, Spin, Button } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import type { LearningRecord } from '../../types/learning-record.types';
import { MASTERY_LEVEL_CONFIG } from '../../types/learning-record.types';
import styles from './RecordHistory.module.css';

const { Text, Paragraph } = Typography;

/**
 * RecordHistory 组件 Props
 */
export interface RecordHistoryProps {
  /** 学习记录列表 */
  records: LearningRecord[];
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 学习历史记录组件
 * 显示知识点的历史学习记录列表
 */
export const RecordHistory: React.FC<RecordHistoryProps> = ({
  records,
  loading = false,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin tip="加载历史记录..." />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无学习记录"
        className={styles.emptyState}
      >
        <Text type="secondary">开始学习后，您的学习记录将显示在这里</Text>
      </Empty>
    );
  }

  return (
    <List
      className={styles.recordList}
      itemLayout="vertical"
      dataSource={records}
      renderItem={(record) => {
        const config = MASTERY_LEVEL_CONFIG[record.masteryLevel];
        const isExpanded = expandedIds.has(record.id);
        const notesText = record.notes ?? '';
        const hasNotes = notesText.trim().length > 0;

        return (
          <List.Item className={styles.recordItem}>
            <div className={styles.recordHeader}>
              <div className={styles.recordInfo}>
                <Text type="secondary" className={styles.recordTime}>
                  {formatDateTime(record.createdAt)}
                </Text>
                <Tag color={config.color} className={styles.masteryTag}>
                  {config.label} ({record.masteryLevel})
                </Tag>
              </div>
              <Text className={styles.duration}>
                {record.durationMinutes} 分钟
              </Text>
            </div>

            {hasNotes && (
              <div className={styles.notesSection}>
                <Paragraph
                  ellipsis={
                    !isExpanded
                      ? {
                          rows: 2,
                          expandable: false,
                        }
                      : false
                  }
                  className={styles.notes}
                >
                  {notesText}
                </Paragraph>
                {notesText.length > 50 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => toggleExpand(record.id)}
                    className={styles.expandButton}
                  >
                    {isExpanded ? (
                      <>
                        收起 <UpOutlined />
                      </>
                    ) : (
                      <>
                        展开 <DownOutlined />
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </List.Item>
        );
      }}
    />
  );
};

export default RecordHistory;
