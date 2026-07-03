import React from 'react'
import { BookOutlined } from '@ant-design/icons'
import { Space, Typography } from 'antd'
import styles from './KnowledgeContextBar.module.css'

export interface KnowledgeContextBarProps {
  title: string
}

export const KnowledgeContextBar: React.FC<KnowledgeContextBarProps> = ({ title }) => {
  return (
    <div className={styles.contextBar}>
      <Space>
        <BookOutlined className={styles.icon} />
        <Typography.Text className={styles.title} ellipsis={{ tooltip: title }}>
          {title}
        </Typography.Text>
      </Space>
    </div>
  )
}

export default KnowledgeContextBar
