import React, { useState } from 'react'
import { Layout, Typography, Divider } from 'antd'
import {
  LearningModeSelector,
  type LearningMode,
  WeakPointView,
  ImportanceView,
  RandomView,
} from '../../components/smart-learning'
import { useLearningStats } from '../../hooks/useSmartLearning'
import styles from './SmartLearningPage.module.css'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography

/**
 * 智能学习主页面
 * 整合三种学习模式：薄弱点、重要性分级、随机
 */
const SmartLearningPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<LearningMode>('weak')
  const { data: stats, isLoading: statsLoading } = useLearningStats()

  const renderContent = () => {
    switch (activeMode) {
      case 'weak':
        return <WeakPointView />
      case 'importance':
        return <ImportanceView />
      case 'random':
        return <RandomView />
      default:
        return <WeakPointView />
    }
  }

  return (
    <Layout className={styles.page}>
      <Header className={styles.header}>
        <Title level={3} className={styles.title}>
          Smart Learning
        </Title>
        <Paragraph className={styles.subtitle}>
          Personalized learning recommendations based on your progress
        </Paragraph>
      </Header>

      <Content className={styles.content}>
        <div className={styles.selectorSection}>
          <LearningModeSelector
            activeMode={activeMode}
            onModeChange={setActiveMode}
            stats={{
              weakPointCount: stats?.weakPointCount || 0,
              importanceStats: stats?.importanceStats || { A: 0, B: 0, C: 0 },
            }}
            loading={statsLoading}
          />
        </div>

        <Divider className={styles.divider} />

        <div className={styles.viewSection}>{renderContent()}</div>
      </Content>
    </Layout>
  )
}

export default SmartLearningPage
