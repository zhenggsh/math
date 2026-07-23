import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button, Space, Typography, Descriptions, Spin, Alert, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Allotment } from 'allotment'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'
import { FrameworkPreview, MdPreview } from '../../components/textbook-preview'
import { findMdLineByCode } from '../../utils/mdLineLocator'

const { Title } = Typography
const NARROW_BREAKPOINT = 768

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('expand') === '1')
  const [highlightedCodes, setHighlightedCodes] = useState<string[]>([])
  const [highlightedMdLine, setHighlightedMdLine] = useState<number | undefined>(undefined)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT)
  const {
    textbook,
    loading,
    error,
    expanding,
    expandError,
    validating,
    validationResult,
    validationError,
    frameworkFile,
    contentFile,
    filesLoading,
    filesError,
    expand,
    fetchTextbook,
    fetchFiles,
    validate,
    resetValidation,
  } = useTextbookDetail(id || '')

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 扩充成功高亮：3 秒后自动取消（移植自原 newPointCodes 逻辑）
  useEffect(() => {
    if (highlightedCodes.length === 0) {
      return
    }
    const timer = setTimeout(() => setHighlightedCodes([]), 3000)
    return () => clearTimeout(timer)
  }, [highlightedCodes])

  const handleFrameworkRowClick = useCallback(
    (code: string) => {
      if (!contentFile?.content) {
        return
      }
      const line = findMdLineByCode(contentFile.content, code)
      if (line !== undefined) {
        setHighlightedMdLine(line)
      }
    },
    [contentFile]
  )

  const handleExpand = async (framework: File, content: File) => {
    const result = await expand(framework, content)
    if (result?.success) {
      // 扩充写入了磁盘文件：重新拉取文件预览（不依赖 DB 刷新）
      await Promise.all([fetchTextbook(), fetchFiles()])
      if (result.data?.addedCodes.length) {
        setHighlightedCodes(result.data.addedCodes)
      }
      setModalOpen(false)
    }
  }

  const handleValidate = async (framework: File, content: File) => {
    await validate(framework, content)
  }

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

  // 文件 mtime 与 DB lastModifiedAt 分歧检测（容忍 1 秒内的取整差异）
  const dbTime = new Date(textbook.lastModifiedAt).getTime()
  const fileTime = frameworkFile?.lastModifiedAt
    ? new Date(frameworkFile.lastModifiedAt).getTime()
    : null
  const diverged = fileTime !== null && Math.abs(fileTime - dbTime) > 1000

  const frameworkPane = filesError ? (
    <Alert message="文件加载失败" description={filesError} type="error" showIcon />
  ) : filesLoading && !frameworkFile ? (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <Spin />
    </div>
  ) : (
    <FrameworkPreview
      rows={frameworkFile?.rows ?? []}
      errors={[]}
      highlightedCodes={highlightedCodes}
      emptyDescription="暂无框架文件内容"
      onRowClick={handleFrameworkRowClick}
    />
  )

  const mdPane = contentFile?.empty ? (
    <FrameworkPreview rows={[]} errors={[]} emptyDescription="暂无内容文件" />
  ) : filesError ? (
    <Alert message="文件加载失败" description={filesError} type="error" showIcon />
  ) : filesLoading && !contentFile ? (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <Spin />
    </div>
  ) : (
    <MdPreview
      content={contentFile?.content ?? ''}
      errors={[]}
      highlightedLine={highlightedMdLine}
      emptyDescription="暂无内容文件"
    />
  )

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
            {diverged && (
              <Tag icon={<WarningOutlined />} color="warning">
                文件与数据库不一致
              </Tag>
            )}
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void fetchFiles()
              }}
            >
              重新加载
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              扩充知识点
            </Button>
          </Space>
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
            {frameworkFile?.sheetName && (
              <Descriptions.Item label="框架工作表">{frameworkFile.sheetName}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card
          title={`教材文件预览（${frameworkFile?.fileName ?? '…'} / ${contentFile?.fileName ?? '…'}）`}
          styles={{ body: { height: 480, padding: 12 } }}
        >
          {isNarrow ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ height: 300, overflow: 'auto' }}>{frameworkPane}</div>
              <div style={{ height: 300, overflow: 'auto' }}>{mdPane}</div>
            </Space>
          ) : (
            <div style={{ height: '100%' }}>
              <Allotment proportionalLayout={false}>
                <Allotment.Pane minSize={280}>{frameworkPane}</Allotment.Pane>
                <Allotment.Pane minSize={320}>{mdPane}</Allotment.Pane>
              </Allotment>
            </div>
          )}
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
