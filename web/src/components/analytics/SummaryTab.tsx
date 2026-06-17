import React from 'react'
import { Card, Empty, Typography } from 'antd'
import type { TextbookSummary, WeakPoints, LearningTrend } from '../../types/analytics.types'
import { generateSummary } from './summaryTemplates'
import styles from './SummaryTab.module.css'

export interface SummaryTabProps {
  summary: TextbookSummary | null
  weakPoints: WeakPoints | null
  learningTrend: LearningTrend | null
  totalDurationMinutes: number
  loading: boolean
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  summary,
  weakPoints,
  learningTrend,
  totalDurationMinutes,
  loading,
}) => {
  const mostRecentDate = React.useMemo(() => {
    if (!learningTrend?.trend) return undefined
    for (let i = learningTrend.trend.length - 1; i >= 0; i--) {
      if (learningTrend.trend[i].count > 0) {
        return learningTrend.trend[i].date
      }
    }
    return undefined
  }, [learningTrend])

  const text = React.useMemo(() => {
    if (!summary) return ''
    return generateSummary({
      textbookName: summary.textbookName,
      totalKnowledgePoints: summary.totalKnowledgePoints,
      learnedCount: summary.learnedKnowledgePoints,
      weakPointCount: weakPoints?.weakPoints.length || 0,
      totalDurationMinutes,
      mostRecentLearningDate: mostRecentDate,
      topWeakPointName: weakPoints?.weakPoints[0]?.name,
    })
  }, [summary, weakPoints, mostRecentDate])

  return (
    <Card title="学习总结与建议" loading={loading} className={styles.card}>
      {text ? (
        <Typography.Paragraph className={styles.summary}>{text}</Typography.Paragraph>
      ) : (
        <Empty description="暂无足够数据生成总结" />
      )}
    </Card>
  )
}
