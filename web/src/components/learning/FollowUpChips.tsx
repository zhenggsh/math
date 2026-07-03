import React from 'react'
import { Space, Tag } from 'antd'
import styles from './FollowUpChips.module.css'

export interface FollowUpChipsProps {
  questions: string[]
  onClick: (question: string) => void
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ questions, onClick }) => {
  return (
    <div className={styles.container}>
      <Space size="small" wrap>
        {questions.map((question, index) => (
          <Tag
            key={index}
            className={styles.chip}
            color="blue"
            onClick={() => onClick(question)}
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
