import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { Alert, Drawer, Typography, Button } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import { useStudyAgent } from '../../hooks/useStudyAgent'
import { KnowledgeContextBar } from './KnowledgeContextBar'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { FollowUpChips } from './FollowUpChips'
import styles from './StudyAgentPanel.module.css'

const { Text } = Typography

const MIN_WIDTH = 320
const MAX_WIDTH = 1200
const DEFAULT_WIDTH = 380
const FULLSCREEN_WIDTH = '100vw'

function generateStarterQuestions(title: string): string[] {
  return [`什么是${title}？`, `学习${title}时有哪些常见易错点？`, `请给我一些${title}的练习题`]
}

export interface StudyAgentPanelProps {
  open: boolean
  onClose: () => void
  knowledgePointId: string
  knowledgePointTitle: string
}

export const StudyAgentPanel: React.FC<StudyAgentPanelProps> = ({
  open,
  onClose,
  knowledgePointId,
  knowledgePointTitle,
}) => {
  const {
    session,
    isLoading,
    error,
    sendMessage,
    isSending,
    regenerate,
    isRegenerating,
    submitFeedback,
    isSubmittingFeedback,
  } = useStudyAgent(knowledgePointId, knowledgePointTitle)

  const [drawerWidth, setDrawerWidth] = useState<number>(DEFAULT_WIDTH)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ x: number; width: number } | null>(null)

  const starterQuestions = useMemo(
    () => generateStarterQuestions(knowledgePointTitle),
    [knowledgePointTitle]
  )

  const messages = session?.messages ?? []
  const isEmpty = messages.length === 0
  const isBusy = isSending || isRegenerating || isSubmittingFeedback

  const handleSend = useCallback(
    (content: string): void => {
      void sendMessage(content)
    },
    [sendMessage]
  )

  const handleFollowUp = useCallback(
    (question: string): void => {
      void sendMessage(question)
    },
    [sendMessage]
  )

  const handleRegenerate = useCallback(
    (userMessageId: string): void => {
      void regenerate(userMessageId)
    },
    [regenerate]
  )

  const handleFeedback = useCallback(
    (messageId: string, feedback?: 'positive' | 'negative'): void => {
      void submitFeedback(messageId, feedback)
    },
    [submitFeedback]
  )

  const toggleFullscreen = useCallback((): void => {
    setIsFullscreen(prev => !prev)
  }, [])

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>): void => {
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      dragStartRef.current = { x: clientX, width: drawerWidth }
      setIsDragging(true)
    },
    [drawerWidth]
  )

  useEffect(() => {
    if (!isDragging) {
      return undefined
    }

    const handleMove = (event: MouseEvent | TouchEvent): void => {
      if (dragStartRef.current == null) {
        return
      }
      const clientX = event instanceof TouchEvent ? event.touches[0].clientX : event.clientX
      const delta = dragStartRef.current.x - clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartRef.current.width + delta))
      setDrawerWidth(newWidth)
    }

    const handleEnd = (): void => {
      dragStartRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging])

  const title = (
    <div className={styles.header}>
      <div className={styles.headerTitle}>
        <KnowledgeContextBar title={knowledgePointTitle} />
      </div>
      <Button
        type="text"
        size="small"
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? '退出全屏' : '全屏'}
      />
    </div>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={isFullscreen ? FULLSCREEN_WIDTH : drawerWidth}
      title={title}
      className={styles.drawer}
      destroyOnHidden
    >
      {!isFullscreen && (
        <div
          className={styles.resizeHandle}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          role="separator"
          aria-label="调整侧边栏宽度"
          style={{ cursor: isDragging ? 'col-resize' : 'ew-resize' }}
        />
      )}
      <div className={styles.container}>
        {error && (
          <Alert title={error} type="error" showIcon closable className={styles.errorAlert} />
        )}

        <div className={styles.messagesArea}>
          {isLoading && (
            <div className={styles.centered}>
              <Text type="secondary">正在初始化 AI 学习助手...</Text>
            </div>
          )}

          {!isLoading && (
            <ChatMessageList
              messages={messages}
              knowledgePointTitle={knowledgePointTitle}
              onFeedback={handleFeedback}
              onRegenerate={handleRegenerate}
              onFollowUp={handleFollowUp}
              isLoading={isSending || isRegenerating}
            />
          )}

          {isEmpty && !isLoading && (
            <div className={styles.welcome}>
              <Text className={styles.welcomeText}>
                你好！我是你的 AI 学习助手。你可以问我关于「{knowledgePointTitle}
                」的任何问题，我会基于当前知识点为你解答。
              </Text>
              <div className={styles.starters}>
                <Text type="secondary" className={styles.startersHint}>
                  你可以从这些问题开始：
                </Text>
                <FollowUpChips questions={starterQuestions} onClick={handleFollowUp} />
              </div>
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} loading={isBusy || isLoading || Boolean(error)} />
      </div>
    </Drawer>
  )
}

export default StudyAgentPanel
