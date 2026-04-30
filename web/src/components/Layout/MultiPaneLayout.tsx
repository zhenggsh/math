import React from 'react'
import { ResizableLayout } from './ResizableLayout'
import styles from './MultiPaneLayout.module.css'

export interface MultiPaneLayoutProps {
  /** 知识树面板内容 */
  knowledgeTreePanel: React.ReactNode
  /** Markdown 内容面板 */
  markdownPanel: React.ReactNode
  /** AI 侧栏面板（可选） */
  aiSidebarPanel?: React.ReactNode
  /** 底部学习反馈面板（可选） */
  learningFeedbackPanel?: React.ReactNode
  /** 是否显示 AI 侧栏 */
  showAISidebar?: boolean
  /** 是否显示底部面板 */
  showBottomPanel?: boolean
}

/**
 * 多栏布局组合组件
 * 学习页面的主布局组件，组合左侧知识树、中间 Markdown 内容、右侧 AI 侧栏
 */
export const MultiPaneLayout: React.FC<MultiPaneLayoutProps> = ({
  knowledgeTreePanel,
  markdownPanel,
  aiSidebarPanel,
  learningFeedbackPanel,
  showAISidebar = true,
  showBottomPanel = false,
}) => {
  return (
    <div className={styles.multiPaneLayout}>
      <ResizableLayout
        leftPanel={<div className={styles.knowledgeTreeContainer}>{knowledgeTreePanel}</div>}
        centerPanel={<div className={styles.markdownContainer}>{markdownPanel}</div>}
        rightPanel={aiSidebarPanel}
        bottomPanel={learningFeedbackPanel}
        showRightPanel={showAISidebar}
        showBottomPanel={showBottomPanel}
        defaultSizes={{
          left: 300,
          center: 600,
          right: 350,
          bottom: 200,
        }}
        minSizes={{
          left: 220,
          center: 400,
          right: 280,
          bottom: 150,
        }}
      />
    </div>
  )
}

export default MultiPaneLayout
