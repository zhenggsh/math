import React, { useCallback } from 'react'
import { Tag } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'

interface ErrorTagProps {
  issue: ValidationIssue
  onClick: (location: ValidationIssue['location']) => void
}

export const ErrorTag: React.FC<ErrorTagProps> = ({ issue, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(issue.location)
  }, [issue.location, onClick])

  const prefix = issue.location.code
    ? `编号 ${issue.location.code}`
    : issue.location.row
      ? `第 ${issue.location.row} 行`
      : '未知位置'

  return (
    <Tag color="error" style={{ cursor: 'pointer' }} onClick={handleClick}>
      ✗ {prefix}：{issue.message}
    </Tag>
  )
}

export default ErrorTag
