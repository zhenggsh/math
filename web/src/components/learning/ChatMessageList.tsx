import React, { useEffect, useRef } from 'react'
import { Avatar, Button, Space, Spin, Typography } from 'antd'
import {
  DislikeOutlined,
  LikeOutlined,
  ReloadOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { StudyMessage } from '../../types/study-agent.types'
import { FollowUpChips } from './FollowUpChips'
import styles from './ChatMessageList.module.css'

export interface ChatMessageListProps {
  messages: StudyMessage[]
  knowledgePointTitle: string
  onFeedback: (messageId: string, feedback?: 'positive' | 'negative') => void
  onRegenerate: (userMessageId: string) => void
  onFollowUp: (question: string) => void
  isLoading?: boolean
}

const { Text } = Typography

function getUserMessageId(messages: StudyMessage[], agentIndex: number): string | undefined {
  for (let i = agentIndex - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') {
      return messages[i]?.id
    }
  }
  return undefined
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  knowledgePointTitle,
  onFeedback,
  onRegenerate,
  onFollowUp,
  isLoading = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = bottomRef.current
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const lastAgentIndex = [...messages].reverse().findIndex(m => m.role === 'agent')
  const latestAgentIndex =
    lastAgentIndex === -1 ? -1 : messages.length - 1 - lastAgentIndex

  return (
    <div className={styles.messageList}>
      {messages.map((message, index) => {
        const isAgent = message.role === 'agent'
        const isLatestAgent = index === latestAgentIndex
        const userMessageId = isAgent ? getUserMessageId(messages, index) : undefined

        return (
          <div
            key={message.id}
            className={`${styles.messageRow} ${isAgent ? styles.agentRow : styles.userRow}`}
          >
            <div className={`${styles.bubble} ${isAgent ? styles.agentBubble : styles.userBubble}`}>
              <div className={styles.messageHeader}>
                <Space size="small">
                  <Avatar
                    size="small"
                    icon={isAgent ? <RobotOutlined /> : <UserOutlined />}
                    className={isAgent ? styles.agentAvatar : styles.userAvatar}
                  />
                  <Text className={styles.roleLabel}>{isAgent ? 'AI 助手' : '我'}</Text>
                </Space>

                {isAgent && (
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<LikeOutlined />}
                      className={message.feedback === 'positive' ? styles.activePositive : ''}
                      onClick={() =>
                        onFeedback(message.id, message.feedback === 'positive' ? undefined : 'positive')
                      }
                      aria-label="点赞"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DislikeOutlined />}
                      className={message.feedback === 'negative' ? styles.activeNegative : ''}
                      onClick={() =>
                        onFeedback(message.id, message.feedback === 'negative' ? undefined : 'negative')
                      }
                      aria-label="点踩"
                    />
                    {isLatestAgent && userMessageId && (
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => onRegenerate(userMessageId)}
                        aria-label="重新生成"
                      />
                    )}
                  </Space>
                )}
              </div>

              <div className={styles.messageContent}>{message.content}</div>

              {isAgent && (
                <div className={styles.grounding}>
                  <Text type="secondary" className={styles.groundingText}>
                    来源：{knowledgePointTitle}
                  </Text>
                </div>
              )}

              {isAgent && message.followUps.length > 0 && (
                <FollowUpChips questions={message.followUps} onClick={onFollowUp} />
              )}
            </div>
          </div>
        )
      })}

      {isLoading && (
        <div className={`${styles.messageRow} ${styles.agentRow}`}>
          <div className={`${styles.bubble} ${styles.agentBubble}`}>
            <div className={styles.loadingWrapper}>
              <Spin size="small" />
              <Text type="secondary">AI 助手正在思考...</Text>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

export default ChatMessageList
