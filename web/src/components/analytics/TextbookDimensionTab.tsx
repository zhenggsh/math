import React from 'react'
import { Card, Row, Col, Statistic, Empty } from 'antd'
import { BookOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { PieChart } from '../features/analytics'
import type { TextbookSummary } from '../../types/analytics.types'
import { getImportanceLevelOrder } from './utils'
import styles from './TextbookDimensionTab.module.css'

export interface TextbookDimensionTabProps {
  data: TextbookSummary | null
  loading: boolean
}

export const TextbookDimensionTab: React.FC<TextbookDimensionTabProps> = ({ data, loading }) => {
  const masteryPieData =
    data?.masteryDistribution.map(item => ({
      name: `${item.level}级 (${item.count})`,
      value: item.count,
    })) || []

  const importanceData =
    data?.importanceDistribution
      .slice()
      .sort((a, b) => getImportanceLevelOrder(a.level) - getImportanceLevelOrder(b.level))
      .map(item => ({
        name: `${item.level}级 (${item.count})`,
        value: item.count,
      })) || []

  return (
    <div className={styles.container}>
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="知识点总数"
              value={data?.totalKnowledgePoints || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="已学习"
              value={data?.learnedKnowledgePoints || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="未学习"
              value={data?.unlearnedKnowledgePoints || 0}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card title="掌握度分布" loading={loading} className={styles.chartCard}>
            {masteryPieData.length > 0 ? (
              <PieChart data={masteryPieData} donut showLegend />
            ) : (
              <Empty description="暂无已学知识点" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="重要性分布" loading={loading} className={styles.chartCard}>
            {importanceData.length > 0 ? (
              <PieChart data={importanceData} showLegend />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
