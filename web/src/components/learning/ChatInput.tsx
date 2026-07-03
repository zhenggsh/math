import React, { useState, useCallback } from 'react'
import { Input, Button, Space } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import styles from './ChatInput.module.css'

export interface ChatInputProps {
  onSend: (content: string) => void
  loading: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading }) => {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setValue('')
  }, [value, loading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className={styles.chatInput}>
      <Space.Compact className={styles.compact}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入问题..."
          disabled={loading}
          className={styles.input}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          disabled={loading || !value.trim()}
          onClick={handleSend}
        >
          发送
        </Button>
      </Space.Compact>
    </div>
  )
}

export default ChatInput
