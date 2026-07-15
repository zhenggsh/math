import React from 'react'
import { Button, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

export interface DeleteKnowledgePointButtonProps {
  canEdit: boolean
  hasChildren: boolean
  onConfirm: () => void
  loading?: boolean
}

export const DeleteKnowledgePointButton: React.FC<DeleteKnowledgePointButtonProps> = ({
  canEdit,
  hasChildren,
  onConfirm,
  loading = false,
}) => {
  return (
    <Popconfirm
      title="确认删除知识点？"
      description="删除后将同时移除数据库记录和文件中的内容块，且无法撤销。"
      onConfirm={() => void onConfirm()}
      okText="删除"
      cancelText="取消"
      disabled={!canEdit || hasChildren}
    >
      <Button
        size="small"
        danger
        icon={<DeleteOutlined />}
        loading={loading}
        disabled={!canEdit || hasChildren}
      >
        删除
      </Button>
    </Popconfirm>
  )
}

export default DeleteKnowledgePointButton
