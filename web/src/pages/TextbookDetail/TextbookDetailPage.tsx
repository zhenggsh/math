import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Descriptions, Spin, Alert, Table, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'

const { Title } = Typography

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const { textbook, knowledgePoints, loading, error, expanding, expandError, expand } =
    useTextbookDetail(id || '')

  const handleExpand = async (frameworkFile: File, contentFile: File) => {
    const result = await expand(frameworkFile, contentFile)
    if (result?.success) {
      setModalOpen(false)
    }
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '一级知识点',
      dataIndex: 'level1',
      key: 'level1',
    },
    {
      title: '二级知识点',
      dataIndex: 'level2',
      key: 'level2',
      render: (level2: string | undefined) => level2 || '-',
    },
    {
      title: '三级知识点',
      dataIndex: 'level3',
      key: 'level3',
      render: (level3: string | undefined) => level3 || '-',
    },
    {
      title: '重要性',
      dataIndex: 'importanceLevel',
      key: 'importanceLevel',
      render: (level: string) => <Tag color="blue">{level}</Tag>,
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !textbook) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="加载失败"
          description={error || '教材不存在'}
          type="error"
          showIcon
          action={
            <Button
              onClick={() => {
                void navigate('/teacher/textbooks')
              }}
            >
              返回列表
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => {
                void navigate('/teacher/textbooks')
              }}
            >
              返回
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {textbook.name}
            </Title>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            扩充知识点
          </Button>
        </Space>

        <Card title="教材信息">
          <Descriptions bordered size="small">
            <Descriptions.Item label="文件名">{textbook.fileName}</Descriptions.Item>
            <Descriptions.Item label="框架类型">
              {textbook.frameworkType.toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="知识点数量">{textbook.knowledgePointCount}</Descriptions.Item>
            <Descriptions.Item label="内容文件">
              {textbook.hasContent ? <Tag color="success">已上传</Tag> : <Tag>未上传</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="最后修改">
              {new Date(textbook.lastModifiedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="知识点列表">
          <Table
            dataSource={knowledgePoints}
            rowKey="id"
            columns={columns}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Space>

      <ExpandKnowledgePointsModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleExpand}
        loading={expanding}
        error={expandError}
      />
    </div>
  )
}

export default TextbookDetailPage
