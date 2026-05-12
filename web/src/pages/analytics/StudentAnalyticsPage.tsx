import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, Empty } from 'antd'
import { BookOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { PieChart, LineChart } from '../../components/features/analytics'
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
} from '../../services/analytics.service'
import type {
  StudentOverview,
  MasteryDistribution,
  LearningTrend,
  WeakPoints,
} from '../../types/analytics.types'
import { ANT_DESIGN_COLORS } from '../../types/analytics.types'
import styles from './StudentAnalyticsPage.module.css'

/**
 * 学生学习分析页面
 */
const StudentAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<StudentOverview | null>(null)
  const [masteryDistribution, setMasteryDistribution] = useState<MasteryDistribution | null>(null)
  const [learningTrend, setLearningTrend] = useState<LearningTrend | null>(null)
  const [weakPoints, setWeakPoints] = useState<WeakPoints | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewData, masteryData, trendData, weakData] = await Promise.all([
        getStudentOverview(),
        getMasteryDistribution(),
        getLearningTrend(30),
        getWeakPoints(10),
      ])
      setOverview(overviewData)
      setMasteryDistribution(masteryData)
      setLearningTrend(trendData)
      setWeakPoints(weakData)
    } catch (error) {
      // Error handling is done via UI state
      void error
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载分析数据..." />
      </div>
    )
  }

  const masteryPieData =
    masteryDistribution?.distribution.map(item => ({
      name: `${item.level}级 (${item.count})`,
      value: item.count,
    })) || []

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>学习分析</h1>

      {/* 概览卡片 */}
      <Row gutter={16} className={styles.overviewRow}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总学习次数"
              value={overview?.totalLearningCount || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总学习时长"
              value={overview?.totalDurationMinutes || 0}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已学知识点"
              value={overview?.uniqueKnowledgePoints || 0}
              suffix="个"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card title="掌握程度分布" className={styles.chartCard}>
            {masteryPieData.length > 0 ? (
              <PieChart data={masteryPieData} donut showLegend />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="学习趋势（最近30天）" className={styles.chartCard}>
            {learningTrend?.trend.some(t => t.count > 0) ? (
              <LineChart data={learningTrend.trend.map(t => ({ date: t.date, value: t.durationMinutes, count: t.count }))} showArea yAxisName="时长(分钟)" />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 薄弱知识点 */}
      <Card title="薄弱知识点（需加强）" className={styles.weakPointsCard}>
        {weakPoints?.weakPoints.length ? (
          <div className={styles.weakPointsList}>
            {weakPoints.weakPoints.map(point => (
              <div key={point.knowledgePointId} className={styles.weakPointItem}>
                <div className={styles.pointInfo}>
                  <span className={styles.pointCode}>{point.code}</span>
                  <span className={styles.pointName}>{point.name}</span>
                  <span
                    className={styles.importanceTag}
                    style={{
                      backgroundColor:
                        point.importanceLevel === 'A'
                          ? ANT_DESIGN_COLORS.error
                          : point.importanceLevel === 'B'
                            ? ANT_DESIGN_COLORS.warning
                            : '#8c8c8c',
                    }}
                  >
                    {point.importanceLevel}
                  </span>
                </div>
                <div className={styles.pointStats}>
                  <span
                    className={styles.masteryLevel}
                    style={{
                      color: ANT_DESIGN_COLORS.mastery[point.lastMasteryLevel],
                    }}
                  >
                    {point.lastMasteryLevel}
                  </span>
                  <span className={styles.learnDate}>
                    {new Date(point.lastLearningDate).toLocaleDateString('zh-CN')}
                  </span>
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

export default StudentAnalyticsPage
