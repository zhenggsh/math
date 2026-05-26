import React from 'react'
import { List, Tag, Empty, Button, Spin, Statistic, Card } from 'antd'
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { useWeakPoints, useRefreshSmartLearning } from '../../hooks/useSmartLearning'
import type { WeakPointItem } from '../../services/smartLearningApi'
import styles from './WeakPointView.module.css'

export interface WeakPointViewProps {
  onSelectPoint?: (point: WeakPointItem) => void
}

const MASTERY_COLORS: Record<string, string> = {
  E: '#ff4d4f',
  D: '#faad14',
  C: '#1890ff',
}

const MASTERY_LABELS: Record<string, string> = {
  E: 'Need Review',
  D: 'Not Mastered',
  C: 'Basic',
}

export const WeakPointView: React.FC<WeakPointViewProps> = ({ onSelectPoint }) => {
  const { data, isLoading, error } = useWeakPoints({ limit: 20 })
  const { refreshWeakPoints } = useRefreshSmartLearning()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip="Loading weak points..." />
      </div>
    )
  }

  if (error) {
    return <Empty description="Failed to load weak points" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  if (!data || data.items.length === 0) {
    return (
      <Empty description="No weak points found! Great job!" image={Empty.PRESENTED_IMAGE_SIMPLE}>
        <Button icon={<ReloadOutlined />} onClick={refreshWeakPoints}>
          Refresh
        </Button>
      </Empty>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Card className={styles.statsCard}>
          <Statistic
            title="Total Weak Points"
            value={data.total}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
        <Button icon={<ReloadOutlined />} onClick={refreshWeakPoints}>
          Refresh
        </Button>
      </div>

      <List
        className={styles.list}
        dataSource={data.items}
        renderItem={item => (
          <List.Item
            className={styles.listItem}
            onClick={() => onSelectPoint?.(item)}
            actions={[
              <Tag color={MASTERY_COLORS[item.learningRecord.masteryLevel]} key="level">
                {item.learningRecord.masteryLevel} -{' '}
                {MASTERY_LABELS[item.learningRecord.masteryLevel]}
              </Tag>,
              <Tag icon={<ClockCircleOutlined />} key="time">
                {Math.ceil(
                  (Date.now() - new Date(item.learningRecord.startTime).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days ago
              </Tag>,
            ]}
          >
            <List.Item.Meta
              title={
                <span className={styles.title}>
                  {item.knowledgePoint.level1}
                  {item.knowledgePoint.level2 && ` > ${item.knowledgePoint.level2}`}
                  {item.knowledgePoint.level3 && ` > ${item.knowledgePoint.level3}`}
                </span>
              }
              description={
                <div>
                  <div className={styles.description}>
                    <span className={styles.code}>{item.knowledgePoint.code}</span>
                    {item.knowledgePoint.definition && (
                      <span className={styles.def}>{item.knowledgePoint.definition}</span>
                    )}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '4px' }}>
                    {item.recommendationReason}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  )
}

export default WeakPointView
