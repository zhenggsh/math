/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-enum-comparison */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Alert, App, Empty } from 'antd'
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useTextbooks } from './hooks/useTextbooks'
import { TextbookTable } from './components/TextbookTable'
import { UploadModal } from './components/UploadModal'
import { SyncButton } from './components/SyncButton'
import { useAuth } from '../../hooks/useAuth'

const { Title, Text } = Typography

const TextbookManagePage: React.FC = () => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const { textbooks, loading, error, fetchTextbooks, syncAll, refresh, remove, upload } =
    useTextbooks()

  // 检查权限 - 只有教师和管理员可以访问
  const canManage = user?.role === 'TEACHER' || user?.role === 'ADMIN'

  // 处理刷新
  const handleRefresh = async (id: string) => {
    try {
      await refresh(id)
      message.success('教材刷新成功')
    } catch {
      message.error('教材刷新失败')
    }
  }

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await remove(id)
      message.success('教材删除成功')
    } catch {
      message.error('教材删除失败')
    }
  }

  // 处理上传
  const handleUpload = async (frameworkFile: File, contentFile: File | null, baseName: string) => {
    try {
      const result = await upload(frameworkFile, contentFile, baseName)
      if (result?.success) {
        message.success('教材上传成功')
        setUploadModalOpen(false)
      } else {
        message.error(result?.message || '上传失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败'
      message.error(errorMessage)
    }
  }

  // 如果没有权限，显示提示
  if (!canManage) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="权限不足"
          description="只有教师和管理员可以管理教材。"
          type="warning"
          showIcon
          action={<Button onClick={() => navigate(-1)}>返回</Button>}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 头部 */}
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              教材管理
            </Title>
          </Space>
          <Space>
            <SyncButton onSync={syncAll} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModalOpen(true)}>
              上传教材
            </Button>
          </Space>
        </Space>

        {/* 说明文字 */}
        <Text type="secondary">
          管理教材文件（Excel/CSV + Markdown）。上传后会自动解析框架文件中的知识点结构。
        </Text>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="加载失败"
            description={error}
            type="error"
            showIcon
            closable
            action={
              <Button size="small" onClick={fetchTextbooks}>
                重试
              </Button>
            }
          />
        )}

        {/* 教材列表 */}
        <Card>
          {textbooks.length === 0 && !loading && !error ? (
            <Empty description="暂无教材" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setUploadModalOpen(true)}
              >
                上传教材
              </Button>
            </Empty>
          ) : (
            <TextbookTable
              textbooks={textbooks}
              loading={loading}
              onRefresh={handleRefresh}
              onDelete={handleDelete}
            />
          )}
        </Card>
      </Space>

      {/* 上传弹窗 */}
      <UploadModal
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        loading={loading}
      />
    </div>
  )
}

export default TextbookManagePage
