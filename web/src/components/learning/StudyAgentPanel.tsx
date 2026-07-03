import React, { useMemo, useCallback } from 'react'
import { Alert, Drawer, Typography } from 'antd'
import { useStudyAgent } from '../../hooks/useStudyAgent'
import { KnowledgeContextBar } from './KnowledgeContextBar'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { FollowUpChips } from './FollowUpChips'
import styles from './StudyAgentPanel.module.css'

const { Text } = Typography

export interface StudyAgentPanelProps {
  open: boolean
  onClose: () => void
  knowledgePointId: string
  knowledgePointTitle: string
}

function generateStarterQuestions(title: string): string[] {
  return [`什么是${title}？`, `学习${title}时有哪些常见易错点？`, `请给我一些${title}的练习题`]
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      size={380}
      title={<KnowledgeContextBar title={knowledgePointTitle} />}
      className={styles.drawer}
      destroyOnHidden
    >
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
