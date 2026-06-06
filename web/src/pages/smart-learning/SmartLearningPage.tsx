import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, App } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { ResizableLayout } from '../../components/Layout/ResizableLayout'
import { SmartLearningNav } from '../../components/smart-learning/SmartLearningNav'
import { StudyGoalTracker } from '../../components/smart-learning/StudyGoalTracker'
import { MarkdownPreview } from '../../components/MarkdownPreview'
import { KnowledgeOverview } from '../../components/KnowledgeOverview'
import { FeedbackPanel } from '../../components/learning/FeedbackPanel'
import { AIFab } from '../../components/learning/AIFab'
import {
  useRecommendations,
  useRefreshRecommendations,
  type RecommendationMode,
  type UnifiedRecommendationItem,
} from '../../hooks/useRecommendations'
import { useKnowledgePointDetail } from '../../hooks/useKnowledgePointDetail'
import styles from './SmartLearningPage.module.css'

interface KnowledgeDetailState {
  definition?: string
  characteristics?: string
  importanceLevel?: string
}

/**
 * 智能学习主页面
 * 三栏布局：左侧导航、中间内容、底部反馈
 */
const SmartLearningPage: React.FC = () => {
  const { message } = App.useApp()
  const [mode, setMode] = useState<RecommendationMode>('weak')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set())
  const [goalCount, setGoalCount] = useState<number>(5)
  const [showNextCta, setShowNextCta] = useState<boolean>(false)

  const { items, isLoading, isError, error, refetch } = useRecommendations(mode)
  const { refresh } = useRefreshRecommendations()

  // 根据 selectedId 和 items 派生当前选中的推荐项
  const selectedItem = useMemo<UnifiedRecommendationItem | null>(() => {
    if (items.length === 0) {
      return null
    }
    const found = items.find(item => item.id === selectedId)
    return found ?? items[0]
  }, [items, selectedId])

  // 加载选中项的详情内容
  const {
    data: detailData,
    isPending: contentLoading,
    error: detailError,
  } = useKnowledgePointDetail(selectedItem?.id)

  const content = useMemo<string>(() => {
    if (!selectedItem) {
      return ''
    }
    if (detailData) {
      return detailData.content || detailData.definition || '暂无内容'
    }
    return ''
  }, [selectedItem, detailData])

  const detail = useMemo<KnowledgeDetailState>(() => {
    if (!detailData) {
      return {}
    }
    return {
      definition: detailData.definition,
      characteristics: detailData.characteristics,
      importanceLevel: detailData.importanceLevel,
    }
  }, [detailData])

  // 推荐列表加载失败时提示错误
  useEffect(() => {
    if (isError && error) {
      message.error('加载推荐列表失败')
    }
  }, [isError, error, message])

  // 详情加载失败时提示错误
  useEffect(() => {
    if (detailError) {
      message.error('加载内容失败')
    }
  }, [detailError, message])

  const handleModeChange = useCallback((newMode: RecommendationMode): void => {
    setMode(newMode)
    setSelectedId(null)
    setShowNextCta(false)
  }, [])

  const handleSelectItem = useCallback((item: UnifiedRecommendationItem): void => {
    setSelectedId(item.id)
    setShowNextCta(false)
  }, [])

  const handleFeedbackSuccess = useCallback((): void => {
    if (selectedItem) {
      setStudiedIds(prev => new Set(prev).add(selectedItem.id))
    }
    setShowNextCta(true)
  }, [selectedItem])

  const currentIndex = selectedItem ? items.findIndex(item => item.id === selectedItem.id) : -1
  const isLastItem = currentIndex >= 0 && currentIndex === items.length - 1

  const handleNext = useCallback((): void => {
    if (isLastItem) {
      refresh(mode)
      void refetch()
      setShowNextCta(false)
      return
    }
    const nextIndex = currentIndex + 1
    if (nextIndex >= 0 && nextIndex < items.length) {
      setSelectedId(items[nextIndex].id)
      setShowNextCta(false)
    }
  }, [isLastItem, currentIndex, items, mode, refresh, refetch])

  const handleRefresh = useCallback((): void => {
    refresh(mode)
    void refetch()
  }, [mode, refresh, refetch])

  const handleExportMarkdown = useCallback((): void => {
    if (!selectedItem) return
    const safeName = selectedItem.name.replace(/[\\/:*?"<>|]/g, '_')
    const lines: string[] = [
      `# ${selectedItem.name}`,
      '',
      `- 编号：${selectedItem.code}`,
      `- 重要性：${selectedItem.importanceLevel}`,
      '',
    ]
    if (detail.definition) {
      lines.push(`## 定义\n\n${detail.definition}\n`)
    }
    if (detail.characteristics) {
      lines.push(`## 特性\n\n${detail.characteristics}\n`)
    }
    lines.push('## 内容\n\n', content)

    const markdown = lines.join('\n')
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedItem.code}-${safeName}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [selectedItem, content, detail])

  return (
    <div className={styles.page}>
      <ResizableLayout
        leftPanel={
          <SmartLearningNav
            mode={mode}
            onModeChange={handleModeChange}
            items={items}
            selectedId={selectedItem?.id}
            onSelectItem={handleSelectItem}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        }
        centerPanel={
          <div className={styles.centerPanel}>
            <div className={styles.centerHeader}>
              <StudyGoalTracker
                studiedCount={studiedIds.size}
                goalCount={goalCount}
                onGoalChange={setGoalCount}
              />
              <Button
                type="default"
                icon={<ExportOutlined />}
                onClick={handleExportMarkdown}
                disabled={!selectedItem}
                className={styles.exportButton}
              >
                导出 Markdown
              </Button>
            </div>
            <div className={styles.centerContent}>
              <KnowledgeOverview
                definition={detail.definition}
                characteristics={detail.characteristics}
                importanceLevel={detail.importanceLevel}
              />
              <MarkdownPreview content={content} loading={contentLoading} />
            </div>
          </div>
        }
        bottomPanel={
          <div className={styles.bottomPanel}>
            {selectedItem && (
              <FeedbackPanel
                knowledgePointId={selectedItem.id}
                onSubmitSuccess={handleFeedbackSuccess}
              />
            )}
            {showNextCta && (
              <div className={styles.ctaArea}>
                <Button type="primary" onClick={handleNext} className={styles.ctaButton}>
                  {isLastItem ? '已学完当前列表，刷新查看新推荐' : '下一个推荐'}
                </Button>
              </div>
            )}
          </div>
        }
        showBottomPanel={!!selectedItem}
        showRightPanel={false}
        defaultSizes={{ left: 320, center: 600, bottom: 220 }}
      />
      {selectedItem && (
        <AIFab knowledgePointId={selectedItem.id} knowledgePointTitle={selectedItem.name} />
      )}
    </div>
  )
}

export default SmartLearningPage
