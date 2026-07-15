import React from 'react'
import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'

export interface EditKnowledgePointButtonProps {
  canEdit: boolean
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

export const EditKnowledgePointButton: React.FC<EditKnowledgePointButtonProps> = ({
  canEdit,
  disabled = false,
  loading = false,
  onClick,
}) => {
  return (
    <Button
      size="small"
      icon={<EditOutlined />}
      onClick={onClick}
      disabled={!canEdit || disabled}
      loading={loading}
    >
      编辑概要
    </Button>
  )
}

export default EditKnowledgePointButton
