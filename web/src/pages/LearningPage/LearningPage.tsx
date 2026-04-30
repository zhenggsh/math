import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Breadcrumb, Empty, message } from 'antd'
import { HomeOutlined, BookOutlined } from '@ant-design/icons'
import { MultiPaneLayout } from '../../components/Layout'
import { KnowledgeTree } from '../../components/KnowledgeTree'
import { MarkdownPreview } from '../../components/MarkdownPreview'
import { AISidebar } from '../../components/AISidebar'
import { FeedbackPanel } from '../../components/learning/FeedbackPanel'
import { useAuth } from '../../hooks/useAuth'
import { knowledgeApi } from '../../services/knowledgeApi'
import type { KnowledgeTreeNode } from '../../types/knowledge.types'
import { convertToTreeData } from '../../utils/knowledgeTree'
import styles from './LearningPage.module.css'

/**
 * 学习页面组件
 * 集成知识树、Markdown 预览、AI 侧栏的多栏式学习界面
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
  const { textbookId } = useParams<{ textbookId?: string }>()
  const navigate = useNavigate()
  useAuth()

  const [loading, setLoading] = useState(true)
  const [treeData, setTreeData] = useState<KnowledgeTreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<KnowledgeTreeNode | null>(null)
  const [content, setContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)

  // 设置页面标题
  useEffect(() => {
    const baseTitle = 'Math Learning'
    if (selectedNode) {
      document.title = `${selectedNode.title} - ${baseTitle}`
    } else if (textbookId) {
      document.title = `Learning - ${baseTitle}`
    } else {
      document.title = baseTitle
    }
    return () => {
      document.title = baseTitle
    }
  }, [selectedNode, textbookId])

  // 处理节点选择
  const handleSelectNode = useCallback(async (node: KnowledgeTreeNode) => {
    setSelectedNode(node)

    if (node.data.id) {
      try {
        setContentLoading(true)
        const detail = await knowledgeApi.getKnowledgePointDetail(node.data.id)
        setContent(
          detail.content ||
            (detail.data as { definition?: string }).definition ||
            'No content available'
        )
      } catch {
        message.error('Failed to load content')
        setContent('Failed to load content. Please try again.')
      } finally {
        setContentLoading(false)
      }
    }
  }, [])

  // 加载知识树数据
  useEffect(() => {
    if (!textbookId) {
      setLoading(false)
      return
    }

    void (async () => {
      try {
        setLoading(true)
        const data = await knowledgeApi.getKnowledgeTree(textbookId)
        const tree = convertToTreeData(data)
        setTreeData(tree)

        // 默认选中第一个节点
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
  }, [textbookId, selectedNode, handleSelectNode])

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
      items.push({ title: selectedNode.title })
    }
    return items
  }, [selectedNode, navigate])

  // 渲染知识树面板
  const knowledgeTreePanel = (
    <KnowledgeTree
      data={treeData}
      selectedKey={selectedNode?.key}
      loading={loading}
      onSelect={node => void handleSelectNode(node)}
    />
  )

  // 渲染 Markdown 内容面板
  const markdownPanel = (
    <div className={styles.markdownPanel}>
      <Breadcrumb items={breadcrumbItems} className={styles.breadcrumb} />
      <div className={styles.markdownContent}>
        <MarkdownPreview content={content} loading={contentLoading} />
      </div>
    </div>
  )

  // 渲染 AI 侧栏
  const aiSidebarPanel = (
    <AISidebar knowledgePointId={selectedNode?.data.id} knowledgePointTitle={selectedNode?.title} />
  )

  // 渲染学习反馈面板
  const learningFeedbackPanel = selectedNode?.data.id ? (
    <FeedbackPanel key={selectedNode.data.id} knowledgePointId={selectedNode.data.id} />
  ) : null

  if (!textbookId) {
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
        aiSidebarPanel={aiSidebarPanel}
        learningFeedbackPanel={learningFeedbackPanel}
        showAISidebar={true}
        showBottomPanel={true}
      />
    </div>
  )
}

export default LearningPage
