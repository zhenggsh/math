import React, { useState, useMemo } from 'react'
import { Tabs, Spin } from 'antd'
import { ErrorBoundary } from 'react-error-boundary'
import type { FallbackProps } from 'react-error-boundary'
import { useTextbook } from '../../hooks/useTextbook'
import {
  useTextbookSummary,
  useStudentOverview,
  useLearningTrend,
  useWeakPoints,
  useLearnedKnowledgePoints,
  useKnowledgePointProgress,
} from '../../hooks/useAnalytics'
import { TextbookHeader } from '../../components/analytics/TextbookHeader'
import { TextbookDimensionTab } from '../../components/analytics/TextbookDimensionTab'
import { BehaviorDimensionTab } from '../../components/analytics/BehaviorDimensionTab'
import { KnowledgePointDimensionTab } from '../../components/analytics/KnowledgePointDimensionTab'
import { SummaryTab } from '../../components/analytics/SummaryTab'
import { TabErrorFallback } from '../../components/analytics/TabErrorFallback'
import styles from './StudentAnalyticsPage.module.css'

const FallbackAdapter: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => (
  <TabErrorFallback error={error as Error} resetErrorBoundary={resetErrorBoundary} />
)

const createResetHandler = (refetch: () => Promise<unknown>) => () => {
  void refetch()
}

export const StudentAnalyticsPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('textbook')
  const [days, setDays] = useState(30)
  const { selectedTextbookIds } = useTextbook()
  const textbookId = selectedTextbookIds[0]

  const summaryQuery = useTextbookSummary(textbookId)
  const overviewQuery = useStudentOverview(textbookId)
  const trendQuery = useLearningTrend(days, textbookId)
  const weakQuery = useWeakPoints(textbookId)
  const learnedQuery = useLearnedKnowledgePoints(textbookId)

  const defaultKnowledgePointId = useMemo(() => {
    const weakIds = new Set(weakQuery.data?.weakPoints.map(p => p.knowledgePointId) || [])
    const points = learnedQuery.data?.learnedKnowledgePoints || []
    const weakPoint = points.find(p => weakIds.has(p.knowledgePointId))
    if (weakPoint) return weakPoint.knowledgePointId
    return points[0]?.knowledgePointId
  }, [weakQuery.data, learnedQuery.data])

  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<string>('')

  React.useEffect(() => {
    if (defaultKnowledgePointId && !selectedKnowledgePointId) {
      setSelectedKnowledgePointId(defaultKnowledgePointId)
    }
  }, [defaultKnowledgePointId, selectedKnowledgePointId])

  const progressQuery = useKnowledgePointProgress(selectedKnowledgePointId)

  if (!textbookId) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>学习分析</h1>
          <TextbookHeader />
        </div>
      </div>
    )
  }

  const isInitialLoading =
    summaryQuery.isLoading ||
    overviewQuery.isLoading ||
    trendQuery.isLoading ||
    weakQuery.isLoading ||
    learnedQuery.isLoading

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>学习分析</h1>
        <TextbookHeader textbookName={summaryQuery.data?.textbookName} />
      </div>

      <div className={styles.content}>
        {isInitialLoading ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" description="加载分析数据..." />
          </div>
        ) : (
          <Tabs activeKey={activeKey} onChange={setActiveKey} className={styles.tabs}>
            <Tabs.TabPane tab="教材维度" key="textbook">
              <ErrorBoundary
                FallbackComponent={FallbackAdapter}
                onReset={createResetHandler(summaryQuery.refetch)}
              >
                <TextbookDimensionTab
                  data={summaryQuery.data || null}
                  loading={summaryQuery.isLoading}
                />
              </ErrorBoundary>
            </Tabs.TabPane>

            <Tabs.TabPane tab="学习行为维度" key="behavior">
              <ErrorBoundary
                FallbackComponent={FallbackAdapter}
                onReset={createResetHandler(trendQuery.refetch)}
              >
                <BehaviorDimensionTab
                  data={trendQuery.data || null}
                  loading={trendQuery.isLoading}
                  days={days}
                  onDaysChange={setDays}
                />
              </ErrorBoundary>
            </Tabs.TabPane>

            <Tabs.TabPane tab="知识点维度" key="knowledge">
              <ErrorBoundary
                FallbackComponent={FallbackAdapter}
                onReset={createResetHandler(learnedQuery.refetch)}
              >
                <KnowledgePointDimensionTab
                  learned={learnedQuery.data || null}
                  weakPoints={weakQuery.data || null}
                  progress={progressQuery.data || null}
                  progressLoading={progressQuery.isLoading}
                  selectedId={selectedKnowledgePointId}
                  onSelect={setSelectedKnowledgePointId}
                />
              </ErrorBoundary>
            </Tabs.TabPane>

            <Tabs.TabPane tab="总结与建议" key="summary">
              <ErrorBoundary
                FallbackComponent={FallbackAdapter}
                onReset={createResetHandler(summaryQuery.refetch)}
              >
                <SummaryTab
                  summary={summaryQuery.data || null}
                  weakPoints={weakQuery.data || null}
                  learningTrend={trendQuery.data || null}
                  totalDurationMinutes={overviewQuery.data?.totalDurationMinutes || 0}
                  loading={summaryQuery.isLoading}
                />
              </ErrorBoundary>
            </Tabs.TabPane>
          </Tabs>
        )}
      </div>
    </div>
  )
}

export default StudentAnalyticsPage
