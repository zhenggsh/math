import React from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ParentKnowledgeNode } from '../../types/knowledge-point.types'

export interface AddChildKnowledgePointButtonProps {
  parentNode: ParentKnowledgeNode | null
  canEdit: boolean
  onClick: () => void
}

export const AddChildKnowledgePointButton: React.FC<AddChildKnowledgePointButtonProps> = ({
  parentNode,
  canEdit,
  onClick,
}) => {
  const disabled = !parentNode || parentNode.code.split('.').length >= 3 || !canEdit

  return (
    <Button size="small" icon={<PlusOutlined />} onClick={onClick} disabled={disabled}>
      新增子知识点
    </Button>
  )
}

export default AddChildKnowledgePointButton
