import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { EditKnowledgePointFormValues } from '../../components/knowledge-point/EditKnowledgePointModal'
import { Button, App, Breadcrumb, Segmented, Dropdown } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
  FileTextOutlined,
  LoadingOutlined,
  EyeOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ResizableLayout } from '../../components/Layout/ResizableLayout'
import { SmartLearningNav } from '../../components/smart-learning/SmartLearningNav'
import { MarkdownPreview } from '../../components/MarkdownPreview'
import { KnowledgeOverview } from '../../components/KnowledgeOverview'
import { FeedbackPanel } from '../../components/learning/FeedbackPanel'
import { AIFab } from '../../components/learning/AIFab'
import { AddChildKnowledgePointButton } from '../../components/knowledge-point/AddChildKnowledgePointButton'
import { AddChildKnowledgePointModal } from '../../components/knowledge-point/AddChildKnowledgePointModal'
import { EditKnowledgePointButton } from '../../components/knowledge-point/EditKnowledgePointButton'
import { EditKnowledgePointModal } from '../../components/knowledge-point/EditKnowledgePointModal'
import { DeleteKnowledgePointButton } from '../../components/knowledge-point/DeleteKnowledgePointButton'
import {
  useRecommendations,
  useRefreshRecommendations,
  type RecommendationMode,
  type UnifiedRecommendationItem,
} from '../../hooks/useRecommendations'
import { useKnowledgePointDetail } from '../../hooks/useKnowledgePointDetail'
import { useTextbook } from '../../hooks/useTextbook'
import { useAuth } from '../../hooks/useAuth'
import { knowledgeApi } from '../../services/knowledgeApi'
import type { ImportanceLevel } from '../../types/knowledge.types'
import type {
  CreateKnowledgePointDto,
  UpdateKnowledgePointDto,
} from '../../types/knowledge-point.types'
import styles from './SmartLearningPage.module.css'

interface KnowledgeDetailState {
  code?: string
  name?: string
  definition?: string
  characteristics?: string
  importanceLevel?: ImportanceLevel
}

/**
 * 智能学习主页面
 * 三栏布局：左侧导航、中间内容、底部反馈
 */
const SmartLearningPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focusKnowledgePointId')
  const hasNotifiedMissingRef = useRef(false)
  const { user } = useAuth()
  const canEdit = user?.role === 'TEACHER' || user?.role === 'ADMIN'
  const [mode, setMode] = useState<RecommendationMode>('weak')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set())
  const [goalCount, setGoalCount] = useState<number>(5)
  const [showNextCta, setShowNextCta] = useState<boolean>(false)
  const [showRaw, setShowRaw] = useState<boolean>(false)
  const [exportLoading, setExportLoading] = useState<boolean>(false)
  const [showOverview, setShowOverview] = useState<boolean>(true)

  const toggleOverview = useCallback(() => {
    setShowOverview(prev => !prev)
  }, [])

  const [showFeedback, setShowFeedback] = useState<boolean>(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [isAdding, setIsAdding] = useState<boolean>(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const toggleFeedback = useCallback(() => {
    setShowFeedback(prev => !prev)
  }, [])

  const { items, isLoading, isError, error, refetch } = useRecommendations(mode)
  const { refresh } = useRefreshRecommendations()
  const { selectedTextbookIds } = useTextbook()

  // 根据 selectedId 和 items 派生当前选中的推荐项
  const selectedItem = useMemo<UnifiedRecommendationItem | null>(() => {
    if (items.length === 0) {
      return null
    }
    const found = items.find(item => item.id === selectedId)
    return found ?? items[0]
  }, [items, selectedId])

  const existingCodes = useMemo(
    () => items.map(item => item.code).filter((code): code is string => !!code),
    [items]
  )

  const hasSelectedChildren = useMemo(() => {
    if (!selectedItem) return false
    const prefix = `${selectedItem.code}.`
    return items.some(item => item.code?.startsWith(prefix))
  }, [selectedItem, items])

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
      return detailData.content || detailData.definition || 'No content available'
    }
    return ''
  }, [selectedItem, detailData])

  const detail = useMemo<KnowledgeDetailState>(() => {
    if (!detailData) {
      return {}
    }
    return {
      code: detailData.code,
      name: detailData.name || undefined,
      definition: detailData.definition,
      characteristics: detailData.characteristics,
      importanceLevel: detailData.importanceLevel,
    }
  }, [detailData])

  // 编辑弹窗初始值（避免每次渲染重建对象导致表单重置）
  const editModalInitialValues = useMemo<EditKnowledgePointFormValues>(
    () => ({
      code: detail.code || selectedItem?.code,
      name: detail.name || selectedItem?.name,
      definition: detail.definition,
      characteristics: detail.characteristics,
      importanceLevel: detail.importanceLevel,
    }),
    [detail, selectedItem]
  )

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

  // 当推荐列表变化时（模式切换/教材过滤），保持选中状态：
  // 若当前选中的项仍在新列表中则保留，否则选第一个
  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null)
      return
    }
    const stillExists = items.some(item => item.id === selectedId)
    if (!stillExists) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  // 根据 URL 参数自动聚焦到指定知识点
  useEffect(() => {
    if (!focusId) {
      hasNotifiedMissingRef.current = false
      return
    }
    if (isLoading || items.length === 0) return

    const exists = items.some(item => item.id === focusId)
    if (exists) {
      hasNotifiedMissingRef.current = false
      setSelectedId(focusId)
      return
    }

    if (mode !== 'weak') {
      setMode('weak')
      return
    }

    if (!hasNotifiedMissingRef.current) {
      hasNotifiedMissingRef.current = true
      message.info('该知识点不在当前推荐列表中')
    }
  }, [focusId, items, isLoading, mode, message])

  const handleModeChange = useCallback((newMode: RecommendationMode): void => {
    setMode(newMode)
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

  // 面包屑路径
  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: (
          <>
            <HomeOutlined /> Home
          </>
        ),
        onClick: () => navigate('/'),
      },
      {
        title: (
          <>
            <BookOutlined /> SmartLearning
          </>
        ),
      },
    ]
    if (selectedItem) {
      const parts = [selectedItem.level1, selectedItem.level2, selectedItem.level3].filter(
        (p): p is string => !!p
      )
      items.push({ title: <span>{parts.join(' > ')}</span> })
    }
    return items
  }, [selectedItem, navigate])

  const handleExportMarkdown = useCallback((): void => {
    if (!selectedItem) return
    const parts: string[] = []
    parts.push(`# ${selectedItem.name}`)
    parts.push(`\n**编号**: ${selectedItem.code}`)
    if (detail.importanceLevel) {
      parts.push(`**重要性**: ${detail.importanceLevel}`)
    }
    if (detail.definition) {
      parts.push(`\n## 定义\n\n${detail.definition}`)
    }
    if (detail.characteristics) {
      parts.push(`\n## 特性\n\n${detail.characteristics}`)
    }
    if (content && content !== 'No content available') {
      parts.push(`\n## 详细内容\n\n${content}`)
    }

    const blob = new Blob([parts.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = selectedItem.name.replace(/[^\w一-龥]/g, '_') || 'knowledge'
    a.download = `${selectedItem.code || 'export'}-${safeTitle}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [selectedItem, content, detail])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (!selectedItem) return
    setExportLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule

      const hasMermaid = content.includes('```mermaid')
      const waitTime = hasMermaid ? 3000 : 800
      await new Promise(resolve => setTimeout(resolve, waitTime))

      const element = document.querySelector(`.${styles.exportArea}`) as HTMLElement
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const scaledWidth = imgWidth * ratio
      const scaledHeight = imgHeight * ratio

      let heightLeft = scaledHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - scaledHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, scaledWidth, scaledHeight)
        heightLeft -= pdfHeight
      }

      const safeTitle = selectedItem.name.replace(/[^\w一-龥]/g, '_') || 'knowledge'
      pdf.save(`${selectedItem.code || 'export'}-${safeTitle}.pdf`)
    } catch {
      message.error('PDF export failed')
    } finally {
      setExportLoading(false)
    }
  }, [selectedItem, content, message])

  const handleCreateKnowledgePoint = useCallback(
    async (dto: CreateKnowledgePointDto) => {
      if (!selectedItem || selectedTextbookIds.length === 0) return
      setIsAdding(true)
      try {
        const newPoint = await knowledgeApi.createKnowledgePoint(selectedTextbookIds[0], dto)
        await refetch()
        setSelectedId(newPoint.id)
        setShowRaw(true)
        setIsAddModalOpen(false)
        message.success('新增子知识点成功')
      } catch {
        message.error('新增失败')
      } finally {
        setIsAdding(false)
      }
    },
    [selectedItem, selectedTextbookIds, refetch, message]
  )

  const handleUpdateKnowledgePoint = useCallback(
    async (dto: UpdateKnowledgePointDto) => {
      if (!selectedItem || selectedTextbookIds.length === 0) return
      setIsEditing(true)
      try {
        await knowledgeApi.updateKnowledgePoint(selectedTextbookIds[0], selectedItem.id, dto)
        await queryClient.invalidateQueries({
          queryKey: ['knowledgePointDetail', selectedItem.id],
        })
        await refetch()
        setIsEditModalOpen(false)
        message.success('更新成功')
      } catch {
        message.error('更新失败')
      } finally {
        setIsEditing(false)
      }
    },
    [selectedItem, selectedTextbookIds, refetch, message, queryClient]
  )

  const handleDeleteKnowledgePoint = useCallback(async () => {
    if (!selectedItem || selectedTextbookIds.length === 0) return
    setIsDeleting(true)
    try {
      await knowledgeApi.deleteKnowledgePoint(selectedTextbookIds[0], selectedItem.id)
      await refetch()
      setSelectedId(null)
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedItem, selectedTextbookIds, refetch, message])

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'markdown',
      icon: <FileTextOutlined />,
      label: '导出 Markdown',
      onClick: handleExportMarkdown,
    },
    {
      key: 'pdf',
      icon: exportLoading ? <LoadingOutlined /> : <ExportOutlined />,
      label: exportLoading ? '导出中...' : '导出 PDF',
      disabled: exportLoading,
      onClick: () => void handleExportPdf(),
    },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.layoutWrapper}>
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
              selectedTextbookIds={selectedTextbookIds}
              studiedCount={studiedIds.size}
              goalCount={goalCount}
              onGoalChange={setGoalCount}
            />
          }
          centerPanel={
            <div className={styles.markdownPanel}>
              <Breadcrumb items={breadcrumbItems} className={styles.breadcrumb} />
              <div className={styles.contentToolbar}>
                <Segmented
                  options={[
                    { value: 'preview', label: 'Preview', icon: <EyeOutlined /> },
                    { value: 'raw', label: 'Raw', icon: <CodeOutlined /> },
                  ]}
                  value={showRaw ? 'raw' : 'preview'}
                  onChange={value => setShowRaw(value === 'raw')}
                />
                <div className={styles.toolbarRight}>
                  <AddChildKnowledgePointButton
                    parentNode={
                      selectedItem
                        ? { id: selectedItem.id, code: selectedItem.code, title: selectedItem.name }
                        : null
                    }
                    canEdit={canEdit}
                    onClick={() => setIsAddModalOpen(true)}
                  />
                  <EditKnowledgePointButton
                    canEdit={canEdit}
                    disabled={contentLoading}
                    loading={contentLoading}
                    onClick={() => setIsEditModalOpen(true)}
                  />
                  <DeleteKnowledgePointButton
                    canEdit={canEdit}
                    hasChildren={hasSelectedChildren}
                    onConfirm={() => void handleDeleteKnowledgePoint()}
                    loading={isDeleting}
                  />
                  <Button size="small" onClick={toggleOverview}>
                    {showOverview ? '隐藏概要区' : '显示概要区'}
                  </Button>
                  <Button size="small" onClick={toggleFeedback}>
                    {showFeedback ? '隐藏反馈区' : '显示反馈区'}
                  </Button>
                  <Button icon={<LeftOutlined />} size="small" disabled />
                  <Button icon={<RightOutlined />} size="small" disabled />
                  <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                    <Button icon={<ExportOutlined />} size="small" disabled={!selectedItem}>
                      导出
                    </Button>
                  </Dropdown>
                </div>
              </div>
              <div className={styles.exportArea}>
                {showOverview && (
                  <KnowledgeOverview
                    definition={detail.definition}
                    characteristics={detail.characteristics}
                    importanceLevel={detail.importanceLevel}
                  />
                )}
                <div className={styles.markdownContent}>
                  <MarkdownPreview
                    content={content}
                    loading={contentLoading}
                    showRaw={showRaw}
                    editable={false}
                  />
                </div>
              </div>
              <AddChildKnowledgePointModal
                open={isAddModalOpen}
                parentNode={
                  selectedItem
                    ? { id: selectedItem.id, code: selectedItem.code, title: selectedItem.name }
                    : null
                }
                existingCodes={existingCodes}
                loading={isAdding}
                onCancel={() => setIsAddModalOpen(false)}
                onSubmit={handleCreateKnowledgePoint}
              />
              <EditKnowledgePointModal
                open={isEditModalOpen}
                initialValues={editModalInitialValues}
                loading={isEditing}
                onCancel={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdateKnowledgePoint}
              />
            </div>
          }
          bottomPanel={
            <div className={styles.bottomPanel}>
              {selectedItem && showFeedback && (
                <FeedbackPanel
                  knowledgePointId={selectedItem.id}
                  onSubmitSuccess={handleFeedbackSuccess}
                />
              )}
              {showNextCta && showFeedback && (
                <div className={styles.ctaArea}>
                  <Button type="primary" onClick={handleNext} className={styles.ctaButton}>
                    {isLastItem ? '已学完当前列表，刷新查看新推荐' : '下一个推荐'}
                  </Button>
                </div>
              )}
            </div>
          }
          showBottomPanel={!!selectedItem && showFeedback}
          showRightPanel={false}
          defaultSizes={{ left: 300, center: 600, bottom: 200 }}
          minSizes={{ left: 220, center: 400, bottom: 150 }}
        />
      </div>
      {selectedItem && (
        <AIFab knowledgePointId={selectedItem.id} knowledgePointTitle={selectedItem.name} />
      )}
    </div>
  )
}

export default SmartLearningPage
