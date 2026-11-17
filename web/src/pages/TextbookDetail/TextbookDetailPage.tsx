import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Spin,
  Alert,
  Tag,
  message,
  Drawer,
  List,
  Badge,
  Input,
  Tooltip,
  Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
  EyeOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  FormOutlined,
} from '@ant-design/icons'
import { Allotment } from 'allotment'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'
import { FrameworkPreview, MdPreview } from '../../components/textbook-preview'
import {
  EditKnowledgePointModal,
  type EditKnowledgePointFormValues,
} from '../../components/knowledge-point/EditKnowledgePointModal'
import { AddChildKnowledgePointModal } from '../../components/knowledge-point/AddChildKnowledgePointModal'
import { findMdLineByCode, extractMdBlockByCode } from '../../utils/mdLineLocator'
import { getRecordCode, type XlsxPreviewRow } from '../../utils/textbookFilePreview'
import { useAuth } from '../../hooks/useAuth'
import { knowledgeApi } from '../../services/knowledgeApi'
import { downloadFrameworkFile, downloadContentFile } from '../../services/textbook.service'
import type { KnowledgePoint } from '../../types/knowledge.types'
import type { CreateKnowledgePointDto } from '../../types/knowledge-point.types'
import type { DivergenceIssue } from '../../types/textbook.types'

const { Title } = Typography
const NARROW_BREAKPOINT = 768

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }
  return err instanceof Error ? err.message : fallback
}

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('expand') === '1')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addChildModalOpen, setAddChildModalOpen] = useState(false)
  const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState<KnowledgePoint | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [highlightedCodes, setHighlightedCodes] = useState<string[]>([])
  const [highlightedMdLine, setHighlightedMdLine] = useState<number | undefined>(undefined)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  const [divergenceDrawerOpen, setDivergenceDrawerOpen] = useState(false)
  const [infoExpanded, setInfoExpanded] = useState(true)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [mdEditing, setMdEditing] = useState(false)
  const [mdDraft, setMdDraft] = useState('')
  const [mdSaving, setMdSaving] = useState(false)
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
    frameworkFile,
    contentFile,
    filesLoading,
    filesError,
    divergenceReport,
    divergenceLoading,
    fetchFiles,
    fetchTextbook,
    expand,
    validate,
    resetValidation,
  } = useTextbookDetail(id || '')

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT)
      setViewportHeight(window.innerHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 扩充/操作成功高亮：3 秒后自动取消
  useEffect(() => {
    if (highlightedCodes.length === 0) {
      return
    }
    const timer = setTimeout(() => setHighlightedCodes([]), 3000)
    return () => clearTimeout(timer)
  }, [highlightedCodes])

  const handleFrameworkRowClick = useCallback(
    (code: string) => {
      setSelectedCode(code)
      // 切换选中行时退出 md 编辑，避免草稿串到错误的知识点
      setMdEditing(false)
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

  const handleReloadFiles = useCallback(() => {
    // 内容可能变化：清空旧行号高亮，避免高亮到错误行
    setHighlightedMdLine(undefined)
    void fetchFiles()
  }, [fetchFiles])

  const handleValidate = async (framework: File, content: File) => {
    await validate(framework, content)
  }

  const frameworkType = frameworkFile?.fileType
  const canEdit =
    (user?.role === 'TEACHER' || user?.role === 'ADMIN') &&
    (frameworkType === 'xlsx' || frameworkType === 'csv')

  // 文件 mtime 与 DB lastModifiedAt 分歧检测（容忍 1 秒内的取整差异）
  const dbTime = new Date(textbook?.lastModifiedAt ?? 0).getTime()
  const fileTime = frameworkFile?.lastModifiedAt
    ? new Date(frameworkFile.lastModifiedAt).getTime()
    : null
  const mtimeDiverged = fileTime !== null && Math.abs(fileTime - dbTime) > 1000
  // 优先使用精确的分歧报告，加载失败或未加载时回退到 mtime 检测
  const diverged = divergenceReport !== null ? divergenceReport.diverged : mtimeDiverged

  // 教材信息折叠后，预览区自动占用释放出来的视口高度；展开时保持原有 480px
  const previewHeight = infoExpanded ? 480 : Math.max(480, viewportHeight - 280)

  const findKnowledgePointByCode = useCallback(
    (code: string): KnowledgePoint | undefined => {
      return knowledgePoints.find(kp => kp.code === code)
    },
    [knowledgePoints]
  )

  const selectedRow = useMemo(() => {
    if (!selectedCode || !frameworkFile?.rows) {
      return undefined
    }
    return frameworkFile.rows.find(row => getRecordCode(row) === selectedCode)
  }, [selectedCode, frameworkFile])

  const selectedKp = useMemo(
    () => (selectedCode ? findKnowledgePointByCode(selectedCode) : undefined),
    [selectedCode, findKnowledgePointByCode]
  )

  const selectedCodeDepth = selectedCode ? selectedCode.split('.').length : 0

  const selectedIsLeaf = useMemo(() => {
    if (!selectedCode || !frameworkFile?.rows) {
      return false
    }
    return !frameworkFile.rows.some(row => {
      const code = getRecordCode(row)
      return code !== undefined && code !== selectedCode && code.startsWith(`${selectedCode}.`)
    })
  }, [selectedCode, frameworkFile])

  const handleEdit = useCallback(
    (row: XlsxPreviewRow) => {
      const code = getRecordCode(row)
      const kp = code ? findKnowledgePointByCode(code) : undefined
      if (kp) {
        setSelectedKnowledgePoint(kp)
        setEditModalOpen(true)
      }
    },
    [findKnowledgePointByCode]
  )

  const handleEditSubmit = useCallback(
    async (dto: EditKnowledgePointFormValues) => {
      if (!selectedKnowledgePoint || !id) {
        return
      }
      setActionLoading(true)
      try {
        const result = await knowledgeApi.updateKnowledgePoint(id, selectedKnowledgePoint.id, dto)
        message.success('知识点已更新')
        await Promise.all([fetchTextbook(), fetchFiles()])
        setHighlightedCodes([result.code])
        // code 可能被修改：选中态跟随新编号
        setSelectedCode(result.code)
        setEditModalOpen(false)
      } catch (err) {
        message.error(extractErrorMessage(err, '更新失败'))
      } finally {
        setActionLoading(false)
      }
    },
    [selectedKnowledgePoint, id, fetchTextbook, fetchFiles]
  )

  const handleAddChild = useCallback(
    (row: XlsxPreviewRow) => {
      const code = getRecordCode(row)
      const kp = code ? findKnowledgePointByCode(code) : undefined
      if (kp) {
        setSelectedKnowledgePoint(kp)
        setAddChildModalOpen(true)
      }
    },
    [findKnowledgePointByCode]
  )

  const handleAddChildSubmit = useCallback(
    async (dto: CreateKnowledgePointDto) => {
      if (!id) {
        return
      }
      setActionLoading(true)
      try {
        const result = await knowledgeApi.createKnowledgePoint(id, dto)
        message.success('子知识点已创建')
        await Promise.all([fetchTextbook(), fetchFiles()])
        setHighlightedCodes([result.code])
        setAddChildModalOpen(false)
      } catch (err) {
        message.error(extractErrorMessage(err, '创建失败'))
      } finally {
        setActionLoading(false)
      }
    },
    [id, fetchTextbook, fetchFiles]
  )

  const handleDelete = useCallback(
    async (row: XlsxPreviewRow) => {
      const code = getRecordCode(row)
      const kp = code ? findKnowledgePointByCode(code) : undefined
      if (!kp || !id) {
        return
      }
      setActionLoading(true)
      try {
        await knowledgeApi.deleteKnowledgePoint(id, kp.id)
        message.success('知识点已删除')
        await Promise.all([fetchTextbook(), fetchFiles()])
        setHighlightedCodes([])
        setSelectedCode(null)
        setMdEditing(false)
      } catch (err) {
        message.error(extractErrorMessage(err, '删除失败'))
      } finally {
        setActionLoading(false)
      }
    },
    [findKnowledgePointByCode, id, fetchTextbook, fetchFiles]
  )

  const existingCodes = useMemo(() => knowledgePoints.map(kp => kp.code), [knowledgePoints])

  const editInitialValues: EditKnowledgePointFormValues = useMemo(() => {
    if (!selectedKnowledgePoint) {
      return {}
    }
    return {
      code: selectedKnowledgePoint.code,
      name: selectedKnowledgePoint.name ?? '',
      definition: selectedKnowledgePoint.definition ?? '',
      characteristics: selectedKnowledgePoint.characteristics ?? '',
      importanceLevel: selectedKnowledgePoint.importanceLevel,
    }
  }, [selectedKnowledgePoint])

  const handleDownloadFramework = useCallback(async () => {
    if (!id || !textbook?.frameworkPath) {
      return
    }
    try {
      await downloadFrameworkFile(id, textbook.frameworkPath)
    } catch (err) {
      message.error(extractErrorMessage(err, '下载框架文件失败'))
    }
  }, [id, textbook?.frameworkPath])

  const handleDownloadContent = useCallback(async () => {
    if (!id || !textbook?.contentPath) {
      return
    }
    try {
      await downloadContentFile(id, textbook.contentPath)
    } catch (err) {
      message.error(extractErrorMessage(err, '下载内容文件失败'))
    }
  }, [id, textbook?.contentPath])

  const handleStartEditMd = useCallback(() => {
    if (!selectedKp || !contentFile?.content) {
      return
    }
    const block = extractMdBlockByCode(contentFile.content, selectedKp.code)
    if (!block) {
      message.warning('未在内容文件中找到该知识点的内容块')
      return
    }
    setMdDraft(block.block)
    setMdEditing(true)
  }, [selectedKp, contentFile])

  const handleSaveMd = useCallback(async () => {
    if (!id || !selectedKp) {
      return
    }
    setMdSaving(true)
    try {
      await knowledgeApi.saveKnowledgePointContent(id, selectedKp.id, mdDraft)
      message.success('内容已保存')
      await fetchFiles()
      setMdEditing(false)
    } catch (err) {
      message.error(extractErrorMessage(err, '保存内容失败'))
    } finally {
      setMdSaving(false)
    }
  }, [id, selectedKp, mdDraft, fetchFiles])

  const divergedTooltip = diverged ? '文件与数据库不一致，请先重新加载' : undefined
  const noSelectionTooltip = !selectedCode ? '请先选择一行' : undefined

  const editSummaryDisabled = diverged || !selectedKp
  const addChildDisabled = diverged || !selectedRow || selectedCodeDepth >= 3
  const addChildTooltip =
    divergedTooltip ??
    (selectedCodeDepth >= 3 && selectedCode ? '三级知识点不能添加子节点' : noSelectionTooltip)
  const deleteDisabled = diverged || !selectedKp || !selectedIsLeaf
  const deleteTooltip =
    divergedTooltip ?? (!selectedKp ? noSelectionTooltip : !selectedIsLeaf ? '存在子节点，不能删除' : undefined)
  const mdEditDisabled = diverged || !selectedKp || !contentFile || contentFile.empty
  const mdEditTooltip =
    divergedTooltip ??
    (!selectedCode ? noSelectionTooltip : !selectedKp ? '该知识点在数据库中不存在' : undefined)

  // 操作按钮区放在卡片标题栏：不随表格滚动，始终可见
  const actionBar = canEdit ? (
    <Space size="small" wrap>
      <Typography.Text type="secondary">选中：{selectedCode ?? '无'}</Typography.Text>
      <Tooltip title={divergedTooltip ?? (!selectedKp ? noSelectionTooltip : undefined)}>
        <span>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label="编辑概要"
            disabled={editSummaryDisabled}
            onClick={() => selectedRow && handleEdit(selectedRow)}
          >
            编辑概要
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={addChildTooltip}>
        <span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            aria-label="新增子知识点"
            disabled={addChildDisabled}
            onClick={() => selectedRow && handleAddChild(selectedRow)}
          >
            新增子知识点
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={deleteTooltip}>
        <span>
          {deleteDisabled ? (
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="删除" disabled>
              删除
            </Button>
          ) : (
            <Popconfirm
              title="确认删除"
              description={`确定要删除知识点 ${selectedCode} 吗？`}
              onConfirm={() => selectedRow && void handleDelete(selectedRow)}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />} aria-label="删除">
                删除
              </Button>
            </Popconfirm>
          )}
        </span>
      </Tooltip>
      <Tooltip title={mdEditTooltip}>
        <span>
          <Button
            size="small"
            icon={<FormOutlined />}
            aria-label="编辑内容"
            disabled={mdEditDisabled}
            onClick={handleStartEditMd}
          >
            编辑内容
          </Button>
        </span>
      </Tooltip>
    </Space>
  ) : null

  const parentNode = useMemo(() => {
    if (!selectedKnowledgePoint) {
      return null
    }
    return {
      id: selectedKnowledgePoint.id,
      code: selectedKnowledgePoint.code,
      title: selectedKnowledgePoint.name ?? selectedKnowledgePoint.code,
    }
  }, [selectedKnowledgePoint])

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: '知识点名称',
      level1: '一级知识点',
      level2: '二级知识点',
      level3: '三级知识点',
      definition: '定义',
      characteristics: '特性',
      importanceLevel: '重要性级别',
    }
    return labels[field] ?? field
  }

  const getIssueBadge = (type: DivergenceIssue['type']) => {
    switch (type) {
      case 'missing-in-db':
        return <Badge status="error" text="数据库缺失" />
      case 'missing-in-file':
        return <Badge status="warning" text="文件缺失" />
      case 'changed':
        return <Badge status="processing" text="字段不一致" />
      default:
        return null
    }
  }

  const formatValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
      return '（空）'
    }
    return value
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
      canEdit={canEdit}
      fileDiverged={diverged}
      onEdit={handleEdit}
      onAddChild={handleAddChild}
      onDelete={(row): void => {
        void handleDelete(row)
      }}
      selectedCode={selectedCode}
      hideToolbar
    />
  )

  const mdPane = mdEditing ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <Space>
        <Button
          type="primary"
          size="small"
          loading={mdSaving}
          onClick={() => {
            void handleSaveMd()
          }}
        >
          保存
        </Button>
        <Button size="small" onClick={() => setMdEditing(false)}>
          取消
        </Button>
        <Typography.Text type="secondary">正在编辑：{selectedKp?.code}</Typography.Text>
      </Space>
      <Input.TextArea
        value={mdDraft}
        onChange={e => setMdDraft(e.target.value)}
        style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, resize: 'none' }}
      />
    </div>
  ) : contentFile?.empty ? (
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
            {diverged && (
              <Button
                size="small"
                icon={<EyeOutlined />}
                loading={divergenceLoading}
                onClick={() => setDivergenceDrawerOpen(true)}
              >
                查看差异
              </Button>
            )}
          </Space>
          <Space>
            <Button
              icon={infoExpanded ? <InfoCircleOutlined /> : <InfoCircleOutlined />}
              onClick={() => setInfoExpanded(prev => !prev)}
            >
              {infoExpanded ? '隐藏教材信息' : '显示教材信息'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReloadFiles}>
              重新加载
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              扩充知识点
            </Button>
          </Space>
        </Space>

        {infoExpanded && (
          <Card title="教材信息">
            <Descriptions bordered size="small">
              <Descriptions.Item label="文件名">{textbook.fileName}</Descriptions.Item>
              <Descriptions.Item label="框架类型">
                {textbook.frameworkType.toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="知识点数量">
                {textbook.knowledgePointCount}
              </Descriptions.Item>
              <Descriptions.Item label="内容文件">
                {textbook.hasContent ? <Tag color="success">已上传</Tag> : <Tag>未上传</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="最后修改">
                {new Date(textbook.lastModifiedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              {frameworkFile?.sheetName && (
                <Descriptions.Item label="框架工作表">{frameworkFile.sheetName}</Descriptions.Item>
              )}
              <Descriptions.Item label="框架文件位置">
                <Space>
                  <Typography.Text code>iksm/{textbook.frameworkPath}</Typography.Text>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      void handleDownloadFramework()
                    }}
                  >
                    下载
                  </Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="内容文件位置">
                {textbook.contentPath ? (
                  <Space>
                    <Typography.Text code>iksm/{textbook.contentPath}</Typography.Text>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        void handleDownloadContent()
                      }}
                    >
                      下载
                    </Button>
                  </Space>
                ) : (
                  <Typography.Text type="secondary">未上传</Typography.Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card
          title={`教材文件预览（${frameworkFile?.fileName ?? '…'} / ${contentFile?.fileName ?? '…'}）`}
          extra={actionBar}
          styles={{ body: { height: previewHeight, padding: 12, transition: 'height 0.2s ease' } }}
        >
          {isNarrow ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{frameworkPane}</div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{mdPane}</div>
            </div>
          ) : (
            <div style={{ height: '100%' }}>
              <Allotment proportionalLayout={false}>
                {/* pane 会裁剪 overflow：包一层滚动容器，滚动发生在预览内部 */}
                <Allotment.Pane minSize={280}>
                  <div style={{ height: '100%', overflow: 'auto' }}>{frameworkPane}</div>
                </Allotment.Pane>
                <Allotment.Pane minSize={320}>
                  <div style={{ height: '100%', overflow: 'auto' }}>{mdPane}</div>
                </Allotment.Pane>
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

      <EditKnowledgePointModal
        open={editModalOpen}
        initialValues={editInitialValues}
        onCancel={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        loading={actionLoading}
      />

      <AddChildKnowledgePointModal
        open={addChildModalOpen}
        parentNode={parentNode}
        existingCodes={existingCodes}
        onCancel={() => setAddChildModalOpen(false)}
        onSubmit={handleAddChildSubmit}
        loading={actionLoading}
      />

      <Drawer
        title="框架文件与数据库差异"
        placement="right"
        open={divergenceDrawerOpen}
        onClose={() => setDivergenceDrawerOpen(false)}
        styles={{ wrapper: { width: 640 } }}
      >
        {divergenceReport ? (
          <List
            dataSource={divergenceReport.issues}
            renderItem={(issue: DivergenceIssue) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <Space style={{ marginBottom: 8 }}>
                    <Typography.Text strong>{issue.code}</Typography.Text>
                    {getIssueBadge(issue.type)}
                  </Space>
                  {issue.type === 'changed' && issue.changes && (
                    <Descriptions bordered size="small" column={1}>
                      {issue.changes.map(change => (
                        <Descriptions.Item key={change.field} label={getFieldLabel(change.field)}>
                          <div>
                            <Typography.Text type="secondary">文件：</Typography.Text>
                            <Typography.Text>{formatValue(change.fileValue)}</Typography.Text>
                          </div>
                          <div>
                            <Typography.Text type="secondary">数据库：</Typography.Text>
                            <Typography.Text>{formatValue(change.dbValue)}</Typography.Text>
                          </div>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}
                  {issue.type === 'missing-in-db' && issue.fileRow && (
                    <Descriptions bordered size="small" column={1}>
                      {Object.entries(issue.fileRow).map(([key, value]) => (
                        <Descriptions.Item key={key} label={key}>
                          {formatValue(value)}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}
                  {issue.type === 'missing-in-file' && issue.dbRow && (
                    <Descriptions bordered size="small" column={1}>
                      {Object.entries(issue.dbRow).map(([key, value]) => (
                        <Descriptions.Item key={key} label={getFieldLabel(key)}>
                          {formatValue(value)}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Spin />
        )}
      </Drawer>
    </div>
  )
}

export default TextbookDetailPage
