import React from 'react'
import { Empty, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import styles from './TextbookHeader.module.css'

export interface TextbookHeaderProps {
  textbookName?: string
}

export const TextbookHeader: React.FC<TextbookHeaderProps> = ({ textbookName }) => {
  if (!textbookName) {
    return (
      <Empty
        description="请先在全局教材选择器中选择一本教材"
        className={styles.empty}
      />
    )
  }

  return (
    <div className={styles.header}>
      <BookOutlined className={styles.icon} />
      <Typography.Title level={4} className={styles.title}>
        当前分析教材：{textbookName}
      </Typography.Title>
    </div>
  )
}
