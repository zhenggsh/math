import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, Empty, Select } from 'antd'
import { BookOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons'
import { PieChart, LineChart, ProgressionChart } from '../../components/features/analytics'
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
  getLearnedKnowledgePoints,
  getKnowledgePointProgress,
} from '../../services/analytics.service'
import type {
  StudentOverview,
  MasteryDistribution,
  LearningTrend,
  WeakPoints,
  KnowledgePointProgress,
  LearnedKnowledgePoints,
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
  const [learnedPoints, setLearnedPoints] = useState<LearnedKnowledgePoints | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [knowledgePointProgress, setKnowledgePointProgress] =
    useState<KnowledgePointProgress | null>(null)
  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<string>('')

  const learnedKnowledgePoints = useMemo(() => {
    if (!learnedPoints?.learnedKnowledgePoints.length) return []
    return learnedPoints.learnedKnowledgePoints
  }, [learnedPoints])

  useEffect(() => {
    if (learnedKnowledgePoints.length > 0 && !selectedKnowledgePointId) {
      const weakest = learnedKnowledgePoints.reduce((min, current) => {
        const levelOrder = { E: 0, D: 1, C: 2, B: 3, A: 4 }
        const currentOrder = levelOrder[current.lastMasteryLevel as keyof typeof levelOrder] ?? 5
        const minOrder = levelOrder[min.lastMasteryLevel as keyof typeof levelOrder] ?? 5
        return currentOrder < minOrder ? current : min
      })
      setSelectedKnowledgePointId(weakest.knowledgePointId)
    }
  }, [learnedKnowledgePoints, selectedKnowledgePointId])

  useEffect(() => {
    if (selectedKnowledgePointId) {
      void loadKnowledgePointProgress(selectedKnowledgePointId)
    }
  }, [selectedKnowledgePointId])

  const loadKnowledgePointProgress = async (knowledgePointId: string): Promise<void> => {
    try {
      setProgressLoading(true)
      const data = await getKnowledgePointProgress(knowledgePointId)
      setKnowledgePointProgress(data)
    } catch (error) {
      void error
    } finally {
      setProgressLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewData, masteryData, trendData, weakData, learnedData] = await Promise.all([
        getStudentOverview(),
        getMasteryDistribution(),
        getLearningTrend(30),
        getWeakPoints(10),
        getLearnedKnowledgePoints(),
      ])
      setOverview(overviewData)
      setMasteryDistribution(masteryData)
      setLearningTrend(trendData)
      setWeakPoints(weakData)
      setLearnedPoints(learnedData)
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

  const hasProgressData =
    knowledgePointProgress && knowledgePointProgress.progressRecords.length > 0
  const hasSingleRecord =
    knowledgePointProgress && knowledgePointProgress.progressRecords.length === 1

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
              <LineChart
                data={learningTrend.trend.map(t => ({
                  date: t.date,
                  value: t.durationMinutes,
                  count: t.count,
                }))}
                showArea
                yAxisName="时长(分钟)"
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 知识点掌握度轨迹 */}
      <Card
        title="知识点掌握度轨迹"
        className={styles.progressionCard}
        extra={
          learnedKnowledgePoints.length > 0 ? (
            <Select
              style={{ width: 280 }}
              placeholder="选择知识点"
              value={selectedKnowledgePointId || undefined}
              onChange={(value: string) => setSelectedKnowledgePointId(value)}
              options={learnedKnowledgePoints.map(kp => ({
                value: kp.knowledgePointId,
                label: `${kp.code} ${kp.name}`,
              }))}
            />
          ) : null
        }
      >
        {progressLoading ? (
          <div className={styles.loadingContainer}>
            <Spin size="default" description="加载轨迹数据..." />
          </div>
        ) : hasProgressData ? (
          <>
            <ProgressionChart
              records={knowledgePointProgress.progressRecords}
              title={knowledgePointProgress.title}
              loading={progressLoading}
            />
            {hasSingleRecord && (
              <div className={styles.singleRecordHint}>
                该知识点只有 1 条学习记录，继续学习以查看进步轨迹
              </div>
            )}
          </>
        ) : (
          <Empty description="开始学习知识点后，这里将展示你的掌握度进步轨迹" />
        )}
      </Card>

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
