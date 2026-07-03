import React, { useCallback } from 'react'
import { Space, Tag } from 'antd'
import styles from './FollowUpChips.module.css'

export interface FollowUpChipsProps {
  questions: string[]
  onClick: (question: string) => void
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ questions, onClick }) => {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>, question: string): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick(question)
      }
    },
    [onClick]
  )

  return (
    <div className={styles.container}>
      <Space size="small" wrap>
        {questions.map((question, index) => (
          <Tag
            key={index}
            className={styles.chip}
            color="blue"
            onClick={() => onClick(question)}
            onKeyDown={event => handleKeyDown(event, question)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            {question}
          </Tag>
        ))}
      </Space>
    </div>
  )
}

export default FollowUpChips
