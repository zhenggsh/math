import React from 'react'
import { Card, Row, Col, Statistic, Radio, Empty } from 'antd'
import { ClockCircleOutlined, BookOutlined, CalendarOutlined } from '@ant-design/icons'
import type { LearningTrend } from '../../types/analytics.types'
import { ComboChart } from './ComboChart'
import styles from './BehaviorDimensionTab.module.css'

export interface BehaviorDimensionTabProps {
  data: LearningTrend | null
  loading: boolean
  days: number
  onDaysChange: (days: number) => void
}

export const BehaviorDimensionTab: React.FC<BehaviorDimensionTabProps> = ({
  data,
  loading,
  days,
  onDaysChange,
}) => {
  const totalDuration = data?.trend.reduce((sum, item) => sum + item.durationMinutes, 0) || 0
  const totalCount = data?.trend.reduce((sum, item) => sum + item.count, 0) || 0
  const avgDuration = data?.trend.length ? Math.round(totalDuration / data.trend.length) : 0

  const hasData = data?.trend.some(t => t.count > 0)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Radio.Group value={days} onChange={e => onDaysChange(Number(e.target.value))}>
          <Radio.Button value={7}>近7天</Radio.Button>
          <Radio.Button value={30}>近30天</Radio.Button>
          <Radio.Button value={90}>近90天</Radio.Button>
        </Radio.Group>
      </div>

      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="总学习时长"
              value={totalDuration}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="总学习次数" value={totalCount} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="日均学习时长"
              value={avgDuration}
              suffix="分钟"
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="每日学习行为" loading={loading} className={styles.chartCard}>
        {hasData ? (
          <ComboChart data={data?.trend || []} loading={loading} />
        ) : (
          <Empty description="该时间段暂无学习记录" />
        )}
      </Card>
    </div>
  )
}
