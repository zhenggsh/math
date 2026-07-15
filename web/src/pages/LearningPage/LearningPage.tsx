import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { EditKnowledgePointFormValues } from '../../components/knowledge-point/EditKnowledgePointModal'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Breadcrumb, Empty, Button, Segmented, Dropdown, App } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  BookOutlined,
  LeftOutlined,
  RightOutlined,
  ExportOutlined,
  EyeOutlined,
  CodeOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { MultiPaneLayout } from '../../components/Layout'
import { KnowledgeTree } from '../../components/KnowledgeTree'
import { MarkdownPreview } from '../../components/MarkdownPreview'
import { KnowledgeOverview } from '../../components/KnowledgeOverview'
import { AIFab } from '../../components/learning/AIFab'
import { FeedbackPanel } from '../../components/learning/FeedbackPanel'
import { AddChildKnowledgePointButton } from '../../components/knowledge-point/AddChildKnowledgePointButton'
import { AddChildKnowledgePointModal } from '../../components/knowledge-point/AddChildKnowledgePointModal'
import { EditKnowledgePointButton } from '../../components/knowledge-point/EditKnowledgePointButton'
import { EditKnowledgePointModal } from '../../components/knowledge-point/EditKnowledgePointModal'
import { DeleteKnowledgePointButton } from '../../components/knowledge-point/DeleteKnowledgePointButton'
import { useAuth } from '../../hooks/useAuth'
import { useTextbook } from '../../hooks/useTextbook'
import { knowledgeApi } from '../../services/knowledgeApi'
import type { KnowledgeTreeNode } from '../../types/knowledge.types'
import type { ImportanceLevel } from '../../types/knowledge.types'
import type {
  CreateKnowledgePointDto,
  UpdateKnowledgePointDto,
} from '../../types/knowledge-point.types'
import { convertToTreeData, findNodeInTree } from '../../utils/knowledgeTree'
import styles from './LearningPage.module.css'

/**
 * 学习页面组件
 * 集成知识树、Markdown 预览的多栏式学习界面，AI 助手通过浮动按钮访问
 */
/**
 * 查找第一个叶子节点
 */
const findFirstLeaf = (node: KnowledgeTreeNode): KnowledgeTreeNode => {
  if (!node.children || node.children.length === 0) {
    return node
  }
  return findFirstLeaf(node.children[0])
}

const LearningPage: React.FC = () => {
  const { message } = App.useApp()
  const { textbookId: urlTextbookId } = useParams<{ textbookId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const canEdit = user?.role === 'TEACHER' || user?.role === 'ADMIN'

  const { selectedTextbookIds, selectMultiple } = useTextbook()

  // Derive active textbook ID: URL param wins, else Context's first selection
  const activeTextbookId = urlTextbookId ?? selectedTextbookIds[0] ?? undefined

  // URL-Context sync guard: prevent infinite loops
  const lastSyncedId = useRef<string | null>(null)

  useEffect(() => {
    if (urlTextbookId && lastSyncedId.current !== urlTextbookId) {
      // If URL has a different ID than Context, sync URL into Context
      if (!selectedTextbookIds.includes(urlTextbookId)) {
        lastSyncedId.current = urlTextbookId
        selectMultiple([urlTextbookId])
      }
    }
  }, [urlTextbookId, selectedTextbookIds, selectMultiple])

  // Reset selected node when textbook changes
  const prevTextbookIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (activeTextbookId !== prevTextbookIdRef.current) {
      prevTextbookIdRef.current = activeTextbookId
      setSelectedNode(null)
      setTreeData([])
    }
  }, [activeTextbookId])

  const [loading, setLoading] = useState(true)
  const [treeData, setTreeData] = useState<KnowledgeTreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<KnowledgeTreeNode | null>(null)
  const [content, setContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [detail, setDetail] = useState<{
    code?: string
    name?: string
    definition?: string
    characteristics?: string
    importanceLevel?: ImportanceLevel
  }>({})
  const [showRaw, setShowRaw] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [showOverview, setShowOverview] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const toggleOverview = useCallback(() => {
    setShowOverview(prev => !prev)
  }, [])

  const [showFeedback, setShowFeedback] = useState(true)

  const toggleFeedback = useCallback(() => {
    setShowFeedback(prev => !prev)
  }, [])

  // 编辑弹窗初始值（避免每次渲染重建对象导致表单重置）
  const editModalInitialValues = useMemo<EditKnowledgePointFormValues>(
    () => ({
      code: selectedNode?.code,
      name: detail.name || selectedNode?.title,
      definition: detail.definition,
      characteristics: detail.characteristics,
      importanceLevel: detail.importanceLevel,
    }),
    [detail, selectedNode]
  )

  // 设置页面标题
  useEffect(() => {
    const baseTitle = 'Math Learning'
    if (selectedNode) {
      document.title = `${selectedNode.title} - ${baseTitle}`
    } else if (activeTextbookId) {
      document.title = `Learning - ${baseTitle}`
    } else {
      document.title = baseTitle
    }
    return () => {
      document.title = baseTitle
    }
  }, [selectedNode, activeTextbookId])

  // DFS 扁平化遍历序列（用于导航）
  const flatSequence = useMemo(() => {
    const result: KnowledgeTreeNode[] = []
    const dfs = (nodes: KnowledgeTreeNode[]) => {
      for (const node of nodes) {
        result.push(node)
        if (node.children) {
          dfs(node.children)
        }
      }
    }
    dfs(treeData)
    return result
  }, [treeData])

  const existingCodes = useMemo(() => flatSequence.map(node => node.code), [flatSequence])

  const currentIndex = useMemo(() => {
    return flatSequence.findIndex(n => n.key === selectedNode?.key)
  }, [flatSequence, selectedNode])

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < flatSequence.length - 1

  // 处理节点选择（必须在 navigateToNode 之前定义）
  const handleSelectNode = useCallback(
    async (node: KnowledgeTreeNode) => {
      setSelectedNode(node)

      if (node.data.id) {
        try {
          setContentLoading(true)
          const pointDetail = await knowledgeApi.getKnowledgePointDetail(node.data.id)
          const initialContent =
            pointDetail.content || pointDetail.definition || 'No content available'
          setContent(initialContent)
          setEditedContent(initialContent)
          setDetail({
            code: pointDetail.code,
            name: pointDetail.name ?? undefined,
            definition: pointDetail.definition || undefined,
            characteristics: pointDetail.characteristics || undefined,
            importanceLevel: pointDetail.importanceLevel,
          })
        } catch {
          message.error('Failed to load content')
          setContent('Failed to load content. Please try again.')
        } finally {
          setContentLoading(false)
        }
      }
    },
    [message]
  )

  const navigateToNode = useCallback(
    (targetNode: KnowledgeTreeNode) => {
      // 自动展开目标节点的父级
      const parentCodes: string[] = []
      const parts = targetNode.code.split('.')
      for (let i = 1; i < parts.length; i++) {
        parentCodes.push(parts.slice(0, i).join('.'))
      }
      const parentKeys = flatSequence.filter(n => parentCodes.includes(n.code)).map(n => n.key)
      setExpandedKeys(prev => {
        const next = new Set([...prev, ...parentKeys])
        return Array.from(next)
      })
      void handleSelectNode(targetNode)
    },
    [flatSequence, handleSelectNode]
  )

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      navigateToNode(flatSequence[currentIndex - 1])
    }
  }, [hasPrevious, currentIndex, flatSequence, navigateToNode])

  const handleNext = useCallback(() => {
    if (hasNext) {
      navigateToNode(flatSequence[currentIndex + 1])
    }
  }, [hasNext, currentIndex, flatSequence, navigateToNode])

  // 加载知识树数据
  useEffect(() => {
    if (!activeTextbookId) {
      setLoading(false)
      return
    }

    void (async () => {
      try {
        setLoading(true)
        const data = await knowledgeApi.getKnowledgeTree(activeTextbookId)
        const tree = convertToTreeData(data)
        setTreeData(tree)

        // 默认选中第一个节点（仅在初始加载时）
        if (tree.length > 0 && !selectedNode) {
          const firstNode = findFirstLeaf(tree[0])
          if (firstNode) {
            void handleSelectNode(firstNode)
          }
        }
      } catch {
        message.error('Failed to load knowledge tree')
      } finally {
        setLoading(false)
      }
    })()
    // Only reload when activeTextbookId changes, not when selectedNode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTextbookId])

  // When global selection changes while on LearningPage, update URL
  useEffect(() => {
    if (
      selectedTextbookIds.length > 0 &&
      selectedTextbookIds[0] !== urlTextbookId &&
      location.pathname.startsWith('/learning')
    ) {
      void navigate(`/learning/${selectedTextbookIds[0]}`, { replace: true })
    }
  }, [selectedTextbookIds, urlTextbookId, navigate, location.pathname])

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
            <BookOutlined /> Learning
          </>
        ),
      },
    ]
    if (selectedNode) {
      const parts = [
        selectedNode.data.level1,
        selectedNode.data.level2,
        selectedNode.data.level3,
      ].filter((p): p is string => !!p)
      items.push({ title: <span>{parts.join('.')}</span> })
    }
    return items
  }, [selectedNode, navigate])

  // 导出 Markdown
  const handleExportMarkdown = useCallback(() => {
    const parts: string[] = []
    if (selectedNode) {
      parts.push(`# ${selectedNode.title}`)
      parts.push(`\n**编号**: ${selectedNode.code}`)
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
    }
    const blob = new Blob([parts.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = selectedNode?.title.replace(/[^\w\u4e00-\u9fa5]/g, '_') || 'knowledge'
    a.download = `${selectedNode?.code || 'export'}-${safeTitle}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [selectedNode, detail, content])

  // 导出 PDF（使用 html2canvas + jsPDF）
  const handleExportPdf = useCallback(async () => {
    if (!selectedNode) return
    setExportLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule

      // 等待异步渲染（Mermaid/KaTeX）完成
      // 若内容包含 Mermaid 图表，最大等待 3 秒；否则等待 800ms
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

      const safeTitle = selectedNode.title.replace(/[^\w\u4e00-\u9fa5]/g, '_') || 'knowledge'
      pdf.save(`${selectedNode.code || 'export'}-${safeTitle}.pdf`)
    } catch {
      message.error('PDF export failed')
    } finally {
      setExportLoading(false)
    }
  }, [selectedNode, content, message])

  // 保存内容到 MD 文件
  const handleSaveContent = useCallback(async () => {
    if (!selectedNode || !activeTextbookId) return
    setIsSaving(true)
    try {
      await knowledgeApi.saveKnowledgePointContent(
        activeTextbookId,
        selectedNode.data.id,
        editedContent
      )
      setContent(editedContent)
      message.success('内容已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }, [selectedNode, activeTextbookId, editedContent, message])

  const handleCreateKnowledgePoint = useCallback(
    async (dto: CreateKnowledgePointDto) => {
      if (!activeTextbookId || !selectedNode) return
      setIsAdding(true)
      try {
        const newPoint = await knowledgeApi.createKnowledgePoint(activeTextbookId, dto)
        const tree = await knowledgeApi.getKnowledgeTree(activeTextbookId)
        const newTree = convertToTreeData(tree)
        setTreeData(newTree)

        const newNode = findNodeInTree(newTree, newPoint.id)
        if (newNode) {
          await handleSelectNode(newNode)
          setShowRaw(true)
        }

        setIsAddModalOpen(false)
        message.success('新增子知识点成功')
      } catch {
        message.error('新增失败')
      } finally {
        setIsAdding(false)
      }
    },
    [activeTextbookId, selectedNode, handleSelectNode, message]
  )

  const handleUpdateKnowledgePoint = useCallback(
    async (dto: UpdateKnowledgePointDto) => {
      if (!activeTextbookId || !selectedNode) return
      setIsEditing(true)
      try {
        await knowledgeApi.updateKnowledgePoint(activeTextbookId, selectedNode.data.id, dto)
        const tree = await knowledgeApi.getKnowledgeTree(activeTextbookId)
        const newTree = convertToTreeData(tree)
        setTreeData(newTree)
        const updatedNode = findNodeInTree(newTree, selectedNode.data.id)
        if (updatedNode) {
          await handleSelectNode(updatedNode)
        }
        setIsEditModalOpen(false)
        message.success('更新成功')
      } catch {
        message.error('更新失败')
      } finally {
        setIsEditing(false)
      }
    },
    [activeTextbookId, selectedNode, handleSelectNode, message]
  )

  const handleDeleteKnowledgePoint = useCallback(async () => {
    if (!activeTextbookId || !selectedNode) return
    setIsDeleting(true)
    try {
      await knowledgeApi.deleteKnowledgePoint(activeTextbookId, selectedNode.data.id)
      const tree = await knowledgeApi.getKnowledgeTree(activeTextbookId)
      setTreeData(convertToTreeData(tree))
      setSelectedNode(null)
      setContent('')
      setEditedContent('')
      setDetail({})
      message.success('删除成功')
    } catch {
      message.error('删除失败')
    } finally {
      setIsDeleting(false)
    }
  }, [activeTextbookId, selectedNode, message])

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

  // 渲染知识树面板
  const knowledgeTreePanel = (
    <KnowledgeTree
      data={treeData}
      selectedKey={selectedNode?.key}
      expandedKeys={expandedKeys}
      onExpand={setExpandedKeys}
      loading={loading}
      onSelect={node => void handleSelectNode(node)}
    />
  )

  // 渲染 Markdown 内容面板
  const markdownPanel = (
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
              selectedNode
                ? { id: selectedNode.data.id, code: selectedNode.code, title: selectedNode.title }
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
            hasChildren={!!selectedNode?.children?.length}
            onConfirm={() => void handleDeleteKnowledgePoint()}
            loading={isDeleting}
          />
          <Button size="small" onClick={toggleOverview}>
            {showOverview ? '隐藏概要区' : '显示概要区'}
          </Button>
          <Button size="small" onClick={toggleFeedback}>
            {showFeedback ? '隐藏反馈区' : '显示反馈区'}
          </Button>
          <Button
            icon={<LeftOutlined />}
            size="small"
            disabled={!hasPrevious}
            onClick={handlePrevious}
          />
          <Button icon={<RightOutlined />} size="small" disabled={!hasNext} onClick={handleNext} />
          {showRaw && canEdit && (
            <Button
              size="small"
              type="primary"
              loading={isSaving}
              onClick={() => void handleSaveContent()}
            >
              保存
            </Button>
          )}
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button icon={<ExportOutlined />} size="small">
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
            content={showRaw ? editedContent : content}
            loading={contentLoading}
            showRaw={showRaw}
            editable={canEdit}
            onContentChange={setEditedContent}
          />
        </div>
      </div>
      <AddChildKnowledgePointModal
        open={isAddModalOpen}
        parentNode={
          selectedNode
            ? { id: selectedNode.data.id, code: selectedNode.code, title: selectedNode.title }
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
  )

  // 渲染学习反馈面板
  const learningFeedbackPanel =
    selectedNode?.data.id && showFeedback ? (
      <FeedbackPanel key={selectedNode.data.id} knowledgePointId={selectedNode.data.id} />
    ) : null

  if (!activeTextbookId) {
    return (
      <div className={styles.emptyState}>
        <Empty
          description="Please select a textbook to start learning"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  return (
    <div className={styles.learningPage}>
      <MultiPaneLayout
        knowledgeTreePanel={knowledgeTreePanel}
        markdownPanel={markdownPanel}
        learningFeedbackPanel={learningFeedbackPanel}
        showBottomPanel={!!selectedNode && showFeedback}
      />
      <AIFab knowledgePointId={selectedNode?.data.id} knowledgePointTitle={selectedNode?.title} />
    </div>
  )
}

export default LearningPage
