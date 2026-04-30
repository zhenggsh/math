/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-misused-promises */
import React, { useState } from 'react'
import { Modal, Upload, Button, Space, Typography, Alert, Input, Form } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileMarkdownOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload'

const { Text } = Typography

interface UploadModalProps {
  open: boolean
  onCancel: () => void
  onUpload: (frameworkFile: File, contentFile: File | null, baseName: string) => Promise<void>
  loading: boolean
}

export const UploadModal: React.FC<UploadModalProps> = ({ open, onCancel, onUpload, loading }) => {
  const [form] = Form.useForm()
  const [frameworkFile, setFrameworkFile] = useState<UploadFile | null>(null)
  const [contentFile, setContentFile] = useState<UploadFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 提取基础文件名
  const extractBaseName = (fileName: string): string => {
    const match = fileName.match(/^(.+?)\.(xlsx|csv)$/i)
    return match ? match[1] : fileName.replace(/\.[^/.]+$/, '')
  }

  // 框架文件上传配置
  const frameworkUploadProps: UploadProps = {
    beforeUpload: file => {
      const isExcel =
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx')
      const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv')

      if (!isExcel && !isCsv) {
        setError('框架文件必须是 Excel (.xlsx) 或 CSV (.csv) 格式')
        return Upload.LIST_IGNORE
      }

      setFrameworkFile(file)
      setError(null)

      // 自动填充 baseName
      const baseName = extractBaseName(file.name)
      form.setFieldsValue({ baseName })

      return false // 阻止自动上传
    },
    onRemove: () => {
      setFrameworkFile(null)
      form.setFieldsValue({ baseName: '' })
    },
    fileList: frameworkFile ? [frameworkFile] : [],
    maxCount: 1,
  }

  // 内容文件上传配置
  const contentUploadProps: UploadProps = {
    beforeUpload: file => {
      const isMarkdown = file.type === 'text/markdown' || file.name.endsWith('.md')

      if (!isMarkdown) {
        setError('内容文件必须是 Markdown (.md) 格式')
        return Upload.LIST_IGNORE
      }

      setContentFile(file)
      setError(null)
      return false
    },
    onRemove: () => {
      setContentFile(null)
    },
    fileList: contentFile ? [contentFile] : [],
    maxCount: 1,
  }

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!frameworkFile || !frameworkFile.originFileObj) {
        setError('请选择框架文件')
        return
      }

      await onUpload(
        frameworkFile.originFileObj,
        contentFile?.originFileObj || null,
        values.baseName
      )

      // 重置表单
      form.resetFields()
      setFrameworkFile(null)
      setContentFile(null)
      setError(null)
    } catch (err) {
      // 验证错误或上传错误
      console.error('Upload failed:', err)
    }
  }

  // 处理取消
  const handleCancel = () => {
    form.resetFields()
    setFrameworkFile(null)
    setContentFile(null)
    setError(null)
    onCancel()
  }

  return (
    <Modal
      title="上传教材"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="上传"
      cancelText="取消"
      width={560}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {error && (
          <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} />
        )}

        <div>
          <Text strong>
            <FileExcelOutlined /> 框架文件（必需）
          </Text>
          <div style={{ marginTop: 8 }}>
            <Upload {...frameworkUploadProps}>
              <Button icon={<UploadOutlined />}>选择 Excel 或 CSV 文件</Button>
            </Upload>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 .xlsx 或 .csv 格式，包含知识点层级结构
          </Text>
        </div>

        <div>
          <Text strong>
            <FileMarkdownOutlined /> 内容文件（可选）
          </Text>
          <div style={{ marginTop: 8 }}>
            <Upload {...contentUploadProps}>
              <Button icon={<UploadOutlined />}>选择 Markdown 文件</Button>
            </Upload>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            支持 .md 格式，包含知识点的详细内容
          </Text>
        </div>

        <Form form={form} layout="vertical" requiredMark>
          <Form.Item
            name="baseName"
            label="教材名称"
            rules={[
              { required: true, message: '请输入教材名称' },
              {
                pattern: /^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/,
                message: '名称只能包含字母、数字、中文、下划线和横线',
              },
            ]}
          >
            <Input placeholder="例如：math01" />
          </Form.Item>
        </Form>

        <Alert
          message="提示"
          description="文件名将作为教材的唯一标识，上传后不能修改。请确保框架文件和教材名称匹配。"
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  )
}
