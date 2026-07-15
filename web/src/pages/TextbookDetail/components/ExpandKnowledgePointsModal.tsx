import React, { useState } from 'react'
import { Modal, Upload, Button, Space, Alert, Typography } from 'antd'
import { FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'

interface ExpandKnowledgePointsModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (frameworkFile: File, contentFile: File) => Promise<void>
  loading: boolean
  error: string | null
}

export const ExpandKnowledgePointsModal: React.FC<ExpandKnowledgePointsModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  error,
}) => {
  const [frameworkFile, setFrameworkFile] = useState<File | null>(null)
  const [contentFile, setContentFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!frameworkFile || !contentFile) return
    await onSubmit(frameworkFile, contentFile)
  }

  const handleClose = () => {
    setFrameworkFile(null)
    setContentFile(null)
    onCancel()
  }

  const handleFrameworkChange = (info: { file: UploadFile }) => {
    const file = info.file.originFileObj || (info.file as unknown as File)
    setFrameworkFile(file instanceof File ? file : null)
  }

  const handleContentChange = (info: { file: UploadFile }) => {
    const file = info.file.originFileObj || (info.file as unknown as File)
    setContentFile(file instanceof File ? file : null)
  }

  return (
    <Modal
      title="扩充知识点"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!frameworkFile || !contentFile}
          onClick={() => {
            void handleSubmit()
          }}
        >
          确认上传
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          上传新的 xlsx（知识点概述）和 md（知识点详述）文件，编号不冲突的知识点将被追加到当前教材。
        </Typography.Text>

        {error && <Alert message={error} type="error" showIcon />}

        <Upload
          accept=".xlsx"
          maxCount={1}
          beforeUpload={() => false}
          onChange={handleFrameworkChange}
          onRemove={() => {
            setFrameworkFile(null)
          }}
        >
          <Button icon={<FileExcelOutlined />}>选择框架文件 (.xlsx)</Button>
        </Upload>

        <Upload
          accept=".md"
          maxCount={1}
          beforeUpload={() => false}
          onChange={handleContentChange}
          onRemove={() => {
            setContentFile(null)
          }}
        >
          <Button icon={<FileTextOutlined />}>选择内容文件 (.md)</Button>
        </Upload>
      </Space>
    </Modal>
  )
}
