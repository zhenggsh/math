import React from 'react'
import { Button, Result } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import styles from './TabErrorFallback.module.css'

export interface TabErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const TabErrorFallback: React.FC<TabErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <Result
      status="error"
      title="该维度数据加载失败"
      subTitle={error.message || '请稍后重试'}
      extra={
        <Button type="primary" icon={<ReloadOutlined />} onClick={resetErrorBoundary}>
          重试
        </Button>
      }
      className={styles.fallback}
    />
  )
}
