import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Select, Radio, Button, Empty, Tag } from 'antd'
import { RiseOutlined, FallOutlined, MinusOutlined, BookOutlined } from '@ant-design/icons'
import { ProgressionChart } from '../features/analytics'
import type {
  LearnedKnowledgePoints,
  WeakPoints,
  KnowledgePointProgress,
} from '../../types/analytics.types'
import { getMasteryLevelOrder } from './utils'
import styles from './KnowledgePointDimensionTab.module.css'

type FilterType = 'all' | 'progressing' | 'regressing' | 'weak'

export interface KnowledgePointDimensionTabProps {
  learned: LearnedKnowledgePoints | null
  weakPoints: WeakPoints | null
  progress: KnowledgePointProgress | null
  progressLoading: boolean
  selectedId: string
  onSelect: (id: string) => void
}

export const TREND_ICONS = {
  progressing: <RiseOutlined />,
  regressing: <FallOutlined />,
  flat: <MinusOutlined />,
}

const TREND_LABELS = {
  progressing: '进步中',
  regressing: '退步中',
  flat: '持平',
}

export const KnowledgePointDimensionTab: React.FC<KnowledgePointDimensionTabProps> = ({
  learned,
  weakPoints,
  progress,
  progressLoading,
  selectedId,
  onSelect,
}) => {
  const navigate = useNavigate()
  const [filter, setFilter] = React.useState<FilterType>('all')

  const weakIds = useMemo(
    () => new Set(weakPoints?.weakPoints.map(p => p.knowledgePointId) || []),
    [weakPoints]
  )

  const trend = (levels: [string, string]): keyof typeof TREND_LABELS => {
    const previous = getMasteryLevelOrder(levels[0])
    const latest = getMasteryLevelOrder(levels[1])
    if (latest > previous) return 'progressing'
    if (latest < previous) return 'regressing'
    return 'flat'
  }

  const filteredPoints = useMemo(() => {
    const points = learned?.learnedKnowledgePoints || []
    if (filter === 'all') return points
    if (filter === 'weak') return points.filter(p => weakIds.has(p.knowledgePointId))
    return points.filter(p => trend(p.lastTwoMasteryLevels) === filter)
  }, [learned, filter, weakIds])

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Radio.Group value={filter} onChange={e => setFilter(e.target.value)}>
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="progressing">进步中</Radio.Button>
          <Radio.Button value="regressing">退步中</Radio.Button>
          <Radio.Button value="weak">薄弱点</Radio.Button>
        </Radio.Group>
      </div>

      <Card
        title="知识点掌握度轨迹"
        className={styles.progressionCard}
        extra={
          filteredPoints.length > 0 ? (
            <Select
              style={{ width: 280 }}
              placeholder="选择知识点"
              value={selectedId || undefined}
              onChange={onSelect}
              options={filteredPoints.map(kp => ({
                value: kp.knowledgePointId,
                label: `${kp.code} ${kp.name}`,
              }))}
            />
          ) : null
        }
      >
        {progressLoading ? (
          <div>加载中...</div>
        ) : progress && progress.progressRecords.length > 0 ? (
          <ProgressionChart records={progress.progressRecords} title={progress.title} />
        ) : (
          <Empty description="选择知识点以查看掌握度轨迹" />
        )}
      </Card>

      <Card title="薄弱知识点列表" className={styles.weakPointsCard}>
        {weakPoints?.weakPoints.length ? (
          <div className={styles.weakPointsList}>
            {weakPoints.weakPoints.map(point => (
              <div key={point.knowledgePointId} className={styles.weakPointItem}>
                <div className={styles.pointInfo}>
                  <span className={styles.pointCode}>{point.code}</span>
                  <span className={styles.pointName}>{point.name}</span>
                  <Tag
                    color={
                      point.importanceLevel === 'A'
                        ? 'red'
                        : point.importanceLevel === 'B'
                          ? 'orange'
                          : 'default'
                    }
                  >
                    {point.importanceLevel}
                  </Tag>
                </div>
                <div className={styles.pointStats}>
                  <span className={styles.masteryLevel}>{point.lastMasteryLevel}</span>
                  <span className={styles.learnDate}>
                    {new Date(point.lastLearningDate).toLocaleDateString('zh-CN')}
                  </span>
                  <Button
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() =>
                      navigate(`/smart-learning?focusKnowledgePointId=${point.knowledgePointId}`)
                    }
                  >
                    去学习
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="太棒了！没有薄弱知识点" />
        )}
      </Card>
    </div>
  )
}
