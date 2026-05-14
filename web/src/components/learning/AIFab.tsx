import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button, Card, Spin, Typography, Space } from 'antd'
import {
  RobotOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  AlertOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import styles from './AIFab.module.css'

const { Title, Text } = Typography

export interface AIFabProps {
  knowledgePointId?: string
  knowledgePointTitle?: string
}

interface PromptItem {
  key: string
  label: string
  icon: React.ReactNode
  mockResponse: string
}

function generatePrompts(title: string | undefined): PromptItem[] {
  const t = title || '当前知识点'
  return [
    {
      key: 'questions',
      icon: <QuestionCircleOutlined />,
      label: `生成「${t}」的常见题目`,
      mockResponse: `以下是「${t}」的常见题目类型：\n\n1. 基础概念题——理解核心定义与性质\n2. 计算题——掌握基本运算方法与技巧\n3. 综合应用题——结合多个知识点解决实际问题\n4. 证明题——运用定理进行逻辑推理\n\n建议先完成基础概念题，再逐步挑战综合应用题。`,
    },
    {
      key: 'mistakes',
      icon: <AlertOutlined />,
      label: `「${t}」易错点分析`,
      mockResponse: `「${t}」学习中的常见易错点：\n\n1. 概念混淆——容易与其他相近概念混为一谈\n2. 公式误用——忽略公式成立的前提条件\n3. 计算失误——符号处理、边界条件考虑不周\n4. 思路局限——未能灵活运用多种解题方法\n\n建议建立错题本，定期回顾易错点。`,
    },
    {
      key: 'video',
      icon: <PlayCircleOutlined />,
      label: `「${t}」名师讲解视频`,
      mockResponse: `推荐以下「${t}」名师讲解资源：\n\n1. 【基础精讲】从零开始理解${t}——适合预习与复习\n2. 【典型例题】${t}必考题型解析——掌握高频考点\n3. 【易错专项】${t}常见错误分析——避开失分陷阱\n4. 【拔高训练】${t}压轴题突破——冲刺高分\n\n建议按顺序观看，配合课后练习效果更佳。`,
    },
  ]
}

interface PromptPanelProps {
  knowledgePointTitle?: string
  onClose: () => void
}

const PromptPanel: React.FC<PromptPanelProps> = ({ knowledgePointTitle, onClose }) => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [responseContent, setResponseContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prompts = useMemo(() => generatePrompts(knowledgePointTitle), [knowledgePointTitle])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePromptClick = useCallback((item: PromptItem): void => {
    setSelectedPrompt(item.key)
    setIsLoading(true)
    setResponseContent(null)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setResponseContent(item.mockResponse)
      setIsLoading(false)
    }, 800)
  }, [])

  return (
    <div className={styles.panelOverlay}>
      <div className={styles.panel} role="dialog" aria-label="AI 学习助手">
        <div className={styles.panelHeader}>
          <Space>
            <RobotOutlined className={styles.headerIcon} />
            <Title level={5} className={styles.headerTitle}>
              AI 学习助手
            </Title>
          </Space>
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="关闭" />
        </div>

        <div className={styles.panelContent}>
          {!selectedPrompt && (
            <div className={styles.promptsList}>
              {prompts.map(item => (
                <Card
                  key={item.key}
                  className={styles.promptCard}
                  hoverable
                  size="small"
                  onClick={() => handlePromptClick(item)}
                >
                  <Space>
                    {item.icon}
                    <Text>{item.label}</Text>
                  </Space>
                </Card>
              ))}
            </div>
          )}

          {selectedPrompt && (
            <div className={styles.responseArea}>
              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <Spin description="正在思考..." />
                </div>
              ) : (
                <div className={styles.responseText}>
                  {responseContent?.split('\n').map((line, idx) => (
                    <p key={idx} className={line.startsWith(' ') ? styles.indentedLine : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const AIFab: React.FC<AIFabProps> = ({ knowledgePointId, knowledgePointTitle }) => {
  const [panelOpen, setPanelOpen] = useState(false)

  const handleClose = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const handleFabClick = useCallback(() => {
    setPanelOpen(true)
  }, [])

  return (
    <>
      {!panelOpen && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined />}
          onClick={handleFabClick}
          className={styles.fabButton}
          aria-label="AI 助手"
        />
      )}

      {panelOpen && (
        <PromptPanel
          key={knowledgePointId ?? knowledgePointTitle}
          knowledgePointTitle={knowledgePointTitle}
          onClose={handleClose}
        />
      )}
    </>
  )
}

export default AIFab
