import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button, Space, Typography, Descriptions, Spin, Alert, Table, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'
import type { KnowledgePoint } from '../../types/knowledge.types'

const { Title } = Typography

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('expand') === '1')
  const [newPointCodes, setNewPointCodes] = useState<string[]>([])
  const {
    textbook,
    knowledgePoints,
    loading,
    error,
    expanding,
    expandError,
    validating,
    validationResult,
    validationError,
    expand,
    validate,
    resetValidation,
  } = useTextbookDetail(id || '')

  useEffect(() => {
    if (newPointCodes.length === 0) {
      return
    }
    const element = document.querySelector('.highlighted-new-point')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    const timer = setTimeout(() => {
      setNewPointCodes([])
    }, 3000)
    return () => clearTimeout(timer)
  }, [newPointCodes, knowledgePoints])

  const handleExpand = async (frameworkFile: File, contentFile: File) => {
    const result = await expand(frameworkFile, contentFile)
    if (result?.success && result.data?.addedCodes.length) {
      setNewPointCodes(result.data.addedCodes)
      setModalOpen(false)
    } else if (result?.success) {
      setModalOpen(false)
    }
  }

  const handleValidate = async (frameworkFile: File, contentFile: File) => {
    await validate(frameworkFile, contentFile)
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
            rowClassName={(record: KnowledgePoint) =>
              newPointCodes.includes(record.code) ? 'highlighted-new-point' : ''
            }
          />
        </Card>
      </Space>

      <ExpandKnowledgePointsModal
        key={modalOpen ? 'open' : 'closed'}
        open={modalOpen}
        textbookId={id || ''}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleExpand}
        onValidate={handleValidate}
        onResetValidation={resetValidation}
        loading={expanding}
        validating={validating}
        error={expandError}
        validationResult={validationResult}
        validationError={validationError}
      />
    </div>
  )
}

export default TextbookDetailPage
