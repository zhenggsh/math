import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Drawer, Upload, Button, Space, Alert, Typography, Steps, Spin, Tooltip } from 'antd'
import { FileExcelOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import * as XLSX from 'xlsx'
import type { UploadFile, RcFile } from 'antd/es/upload'
import type {
  ValidationIssue,
  ValidationReport,
  ExpansionDraft,
} from '../../../types/textbook.types'
import { ValidationRulesPanel } from './ValidationRulesPanel'
import { FrameworkEditor } from './FrameworkEditor'
import { MdEditor } from './MdEditor'
import { useExpansionEditor } from '../hooks/useExpansionEditor'
import { FrameworkPreview, MdPreview } from '../../../components/textbook-preview'
import { ErrorTag } from './ErrorTag'
import { ImpactPreview } from './ImpactPreview'
import {
  parseFrameworkPreview,
  readTextFile,
  type XlsxPreviewRow,
} from '../../../utils/textbookFilePreview'
import { downloadErrorReport } from '../../../utils/exportErrorReport'
import { findMdLineByCode } from '../../../utils/mdLineLocator'

interface ExpandKnowledgePointsModalProps {
  open: boolean
  textbookId: string
  onCancel: () => void
  onSubmit: (frameworkFile: File, contentFile: File) => Promise<void>
  onValidate: (frameworkFile: File, contentFile: File) => Promise<void>
  onResetValidation: () => void
  loading: boolean
  validating: boolean
  error: string | null
  validationResult: ValidationReport | null
  validationError: string | null
}

const NARROW_BREAKPOINT = 768
const DRAFT_KEY_PREFIX = 'math-tong-expansion-draft'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const type = mimeMatch?.[1] ?? ''
  const binary = atob(base64)
  const length = binary.length
  const bytes = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], fileName, { type })
}

interface DraftState {
  frameworkFile: File | null
  contentFile: File | null
  frameworkFileList: UploadFile[]
  contentFileList: UploadFile[]
  currentStep: number
}

function loadDraftState(draftKey: string): DraftState | null {
  const raw = sessionStorage.getItem(draftKey)
  if (!raw) {
    return null
  }
  try {
    const draft = JSON.parse(raw) as ExpansionDraft
    if (!draft.frameworkFileContent && !draft.contentFileContent) {
      return null
    }
    const frameworkFile = draft.frameworkFileContent
      ? dataUrlToFile(draft.frameworkFileContent, draft.frameworkFileName || 'framework.csv')
      : null
    const contentFile = draft.contentFileContent
      ? dataUrlToFile(draft.contentFileContent, draft.contentFileName || 'content.md')
      : null
    return {
      frameworkFile,
      contentFile,
      frameworkFileList: frameworkFile
        ? [
            {
              uid: '-1',
              name: frameworkFile.name,
              status: 'done',
              originFileObj: frameworkFile as unknown as RcFile,
            },
          ]
        : [],
      contentFileList: contentFile
        ? [
            {
              uid: '-2',
              name: contentFile.name,
              status: 'done',
              originFileObj: contentFile as unknown as RcFile,
            },
          ]
        : [],
      currentStep: 1,
    }
  } catch {
    return null
  }
}

export const ExpandKnowledgePointsModal: React.FC<ExpandKnowledgePointsModalProps> = ({
  open,
  textbookId,
  onCancel,
  onSubmit,
  onValidate,
  onResetValidation,
  loading,
  validating,
  error,
  validationResult,
  validationError,
}) => {
  const draftKey = `${DRAFT_KEY_PREFIX}-${textbookId}`
  const [initialDraftState] = useState(() => loadDraftState(draftKey))

  const [currentStep, setCurrentStep] = useState(initialDraftState?.currentStep ?? 0)
  const [frameworkFile, setFrameworkFile] = useState<File | null>(
    initialDraftState?.frameworkFile ?? null
  )
  const [contentFile, setContentFile] = useState<File | null>(
    initialDraftState?.contentFile ?? null
  )
  const [frameworkFileList, setFrameworkFileList] = useState<UploadFile[]>(
    initialDraftState?.frameworkFileList ?? []
  )
  const [contentFileList, setContentFileList] = useState<UploadFile[]>(
    initialDraftState?.contentFileList ?? []
  )
  const [xlsxPreview, setXlsxPreview] = useState<XlsxPreviewRow[] | null>(null)
  const [mdPreview, setMdPreview] = useState<string | null>(null)
  const [xlsxPreviewError, setXlsxPreviewError] = useState<string | null>(null)
  const [mdPreviewError, setMdPreviewError] = useState<string | null>(null)
  const [highlightedFrameworkCode, setHighlightedFrameworkCode] = useState<string | undefined>(
    undefined
  )
  const [highlightedMdLine, setHighlightedMdLine] = useState<number | undefined>(undefined)
  const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT)
  const [resultCollapsed, setResultCollapsed] = useState(false)

  const originalRows = useMemo(() => xlsxPreview ?? [], [xlsxPreview])
  const originalMd = useMemo(() => mdPreview ?? '', [mdPreview])

  const editor = useExpansionEditor({
    textbookId,
    originalRows,
    originalMd,
    originalFrameworkFile: frameworkFile,
    originalContentFile: contentFile,
    onValidate,
    onResetValidation,
  })
  const { editMode, revalidateFiles } = editor

  const isCsvFramework = frameworkFile?.name.toLowerCase().endsWith('.csv') ?? false

  const getSheetCount = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          resolve(workbook.SheetNames.length)
        } catch (err) {
          reject(err instanceof Error ? err : new Error('读取文件失败'))
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsArrayBuffer(file)
    })
  }, [])

  const [sheetCount, setSheetCount] = useState<number | null>(null)

  useEffect(() => {
    if (!frameworkFile || isCsvFramework) {
      return
    }
    let cancelled = false
    getSheetCount(frameworkFile)
      .then(count => {
        if (!cancelled) {
          setSheetCount(count)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSheetCount(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [frameworkFile, isCsvFramework, getSheetCount])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(draftKey)
  }, [draftKey])

  const saveDraft = useCallback(async () => {
    if (!frameworkFile && !contentFile) {
      clearDraft()
      return
    }
    const [frameworkContent, contentContent] = await Promise.all([
      frameworkFile ? readFileAsDataUrl(frameworkFile) : Promise.resolve(undefined),
      contentFile ? readFileAsDataUrl(contentFile) : Promise.resolve(undefined),
    ])
    const draft: ExpansionDraft = {
      textbookId,
      frameworkFileName: frameworkFile?.name,
      frameworkFileContent: frameworkContent,
      contentFileName: contentFile?.name,
      contentFileContent: contentContent,
    }
    sessionStorage.setItem(draftKey, JSON.stringify(draft))
  }, [frameworkFile, contentFile, textbookId, draftKey, clearDraft])

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < NARROW_BREAKPOINT)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!frameworkFile) {
      return
    }
    let cancelled = false
    parseFrameworkPreview(frameworkFile)
      .then(rows => {
        if (!cancelled) {
          setXlsxPreview(rows)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setXlsxPreview(null)
          setXlsxPreviewError(err instanceof Error ? err.message : '框架文件解析失败')
        }
      })
    return () => {
      cancelled = true
    }
  }, [frameworkFile])

  useEffect(() => {
    if (!contentFile) {
      return
    }
    let cancelled = false
    readTextFile(contentFile)
      .then(text => {
        if (!cancelled) {
          setMdPreview(text)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMdPreview(null)
          setMdPreviewError(err instanceof Error ? err.message : '内容文件读取失败')
        }
      })
    return () => {
      cancelled = true
    }
  }, [contentFile])

  const extractFile = (file: UploadFile | File): File | null => {
    if (file instanceof File) {
      return file
    }
    const origin = file.originFileObj
    return origin instanceof File ? origin : null
  }

  const handleFrameworkChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setFrameworkFile(extracted)
      }
      setFrameworkFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      setXlsxPreview(null)
      setXlsxPreviewError(null)
      setSheetCount(null)
      onResetValidation()
      setHighlightedFrameworkCode(undefined)
    },
    [onResetValidation]
  )

  const handleContentChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setContentFile(extracted)
      }
      setContentFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      setMdPreview(null)
      setMdPreviewError(null)
      onResetValidation()
      setHighlightedMdLine(undefined)
    },
    [onResetValidation]
  )

  const handleFrameworkRemove = useCallback(() => {
    setFrameworkFile(null)
    setFrameworkFileList([])
    setXlsxPreview(null)
    setXlsxPreviewError(null)
    setSheetCount(null)
    onResetValidation()
    setHighlightedFrameworkCode(undefined)
    return true
  }, [onResetValidation])

  const handleContentRemove = useCallback(() => {
    setContentFile(null)
    setContentFileList([])
    setMdPreview(null)
    setMdPreviewError(null)
    onResetValidation()
    setHighlightedMdLine(undefined)
    return true
  }, [onResetValidation])

  const handleValidate = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    setHighlightedFrameworkCode(undefined)
    setHighlightedMdLine(undefined)
    setResultCollapsed(false)
    await onValidate(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onValidate])

  const handleSubmit = useCallback(async () => {
    const submitFrameworkFile = editMode ? editor.editedFrameworkFile : frameworkFile
    const submitContentFile = editMode ? editor.editedContentFile : contentFile
    if (!submitFrameworkFile || !submitContentFile) return
    await onSubmit(submitFrameworkFile, submitContentFile)
    clearDraft()
  }, [
    editMode,
    editor.editedFrameworkFile,
    editor.editedContentFile,
    frameworkFile,
    contentFile,
    onSubmit,
    clearDraft,
  ])

  const handleClose = useCallback(() => {
    if (!frameworkFile && !contentFile) {
      clearDraft()
      onCancel()
      return
    }
    Modal.confirm({
      title: '保存草稿',
      content: '检测到已选择文件，是否保存为草稿以便下次继续？',
      okText: '保存',
      cancelText: '不保存',
      onOk: async () => {
        await saveDraft()
        onCancel()
      },
      onCancel: () => {
        clearDraft()
        onCancel()
      },
    })
  }, [frameworkFile, contentFile, onCancel, saveDraft, clearDraft])

  // 在 md 内容中查找知识点编号对应的行号（1-based），共享实现见 utils/mdLineLocator
  const locateMdLine = useCallback(
    (code: string): number | undefined => findMdLineByCode(mdPreview ?? '', code),
    [mdPreview]
  )

  // 点击校验错误项：高亮框架行；有 md 行号则直接定位，
  // 否则（如编号冲突类错误只携带 code 无 row）按编号在 md 中查找定位
  const handleErrorClick = useCallback(
    (location: ValidationIssue['location']) => {
      if (location.code) {
        setHighlightedFrameworkCode(location.code)
        if (!location.row) {
          const line = locateMdLine(location.code)
          if (line !== undefined) {
            setHighlightedMdLine(line)
          }
        }
      }
      if (location.row) {
        setHighlightedMdLine(location.row)
      }
    },
    [locateMdLine]
  )

  const handleExportErrors = useCallback(() => {
    if (!validationResult) return
    downloadErrorReport(validationResult.errors, '校验错误报告.txt')
  }, [validationResult])

  // 点击框架文件行：高亮该行，并定位内容文件预览到相同知识点位置
  const handleFrameworkRowClick = useCallback(
    (code: string) => {
      setHighlightedFrameworkCode(code)
      const line = locateMdLine(code)
      if (line !== undefined) {
        setHighlightedMdLine(line)
      }
    },
    [locateMdLine]
  )

  const noopCustomRequest = useCallback(() => {}, [])

  const bothFilesSelected = frameworkFile !== null && contentFile !== null
  const canGoNext = currentStep === 0 ? bothFilesSelected : validationResult?.valid === true

  const editModeDisabled =
    !bothFilesSelected || isCsvFramework || (contentFile?.size ?? 0) > 1024 * 1024
  const editModeTooltip = isCsvFramework
    ? 'CSV 文件暂不支持在线编辑'
    : (contentFile?.size ?? 0) > 1024 * 1024
      ? 'Markdown 文件超过 1 MB，请本地编辑'
      : ''

  const handleEnterEditMode = useCallback(() => {
    if (sheetCount && sheetCount > 1) {
      Modal.confirm({
        title: '多 sheet 工作簿警告',
        content: '编辑模式只会读写第一个 sheet，其他 sheet 将在保存后丢失。是否继续？',
        onOk: () => editor.enterEditMode(),
      })
    } else {
      editor.enterEditMode()
    }
  }, [sheetCount, editor])

  const handleNext = useCallback(() => {
    if (currentStep < 2) {
      setCurrentStep(step => step + 1)
    }
  }, [currentStep])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1)
    }
  }, [currentStep])

  const renderValidationResult = () => {
    if (validating) {
      return (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin size="small" />
          <Typography.Text style={{ marginLeft: 8 }}>正在校验...</Typography.Text>
        </div>
      )
    }

    if (validationError) {
      return <Alert message={validationError} type="error" showIcon style={{ marginBottom: 16 }} />
    }

    if (!validationResult) {
      return null
    }

    const hasFailures = !validationResult.valid
    const totalCount = validationResult.checks.length
    const passedCount = validationResult.checks.filter(c => c.passed).length
    const failedCount = totalCount - passedCount

    return (
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        {/* 折叠标题栏：折叠后不占用高度空间 */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!resultCollapsed}
          onClick={() => setResultCollapsed(!resultCollapsed)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setResultCollapsed(!resultCollapsed)
            }
          }}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '2px 0',
          }}
        >
          <Typography.Text strong style={{ color: hasFailures ? '#ff4d4f' : '#52c41a' }}>
            {resultCollapsed ? '▸' : '▾'}
          </Typography.Text>
          <Typography.Text strong>
            校验结果：
            {hasFailures ? `${failedCount} 项未通过` : '全部通过'}（{passedCount}/{totalCount}{' '}
            项通过）
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {resultCollapsed ? '点击展开' : '点击折叠'}
          </Typography.Text>
        </div>

        {!resultCollapsed && (
          <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 4 }}>
            <Alert
              message={
                hasFailures
                  ? '校验未通过，请修正标记为 ✗ 的检查项后重新校验：'
                  : '校验通过，可以进入下一步确认扩充。'
              }
              type={hasFailures ? 'error' : 'success'}
              showIcon
              style={{ marginBottom: 8 }}
            />
            {/* 逐项校验结果：通过 ✓ / 不通过 ✗ */}
            <div>
              {validationResult.checks.map(check => (
                <div key={check.key} style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    {check.passed ? (
                      <Typography.Text style={{ color: '#52c41a', fontWeight: 600 }}>
                        ✓
                      </Typography.Text>
                    ) : (
                      <Typography.Text style={{ color: '#ff4d4f', fontWeight: 600 }}>
                        ✗
                      </Typography.Text>
                    )}
                    <Typography.Text
                      type={check.passed ? 'secondary' : undefined}
                      strong={!check.passed}
                    >
                      {check.label}
                    </Typography.Text>
                  </div>
                  {!check.passed && check.errors.length > 0 && (
                    <div style={{ paddingLeft: 24, marginTop: 2 }}>
                      {check.errors.map((err, index) => (
                        <ErrorTag
                          key={`${check.key}-${index}`}
                          issue={err}
                          onClick={handleErrorClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {hasFailures && (
              <Button size="small" onClick={handleExportErrors} style={{ marginTop: 8 }}>
                导出错误报告
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderUploadStep = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text>
        上传新的框架文件（xlsx / csv）和内容文件（md），编号不冲突的知识点将被追加到当前教材。
      </Typography.Text>
      <Button type="link" icon={<InfoCircleOutlined />} onClick={() => setRulesDrawerOpen(true)}>
        查看校验规则
      </Button>

      {error && <Alert message={error} type="error" showIcon />}

      <div>
        <label htmlFor="framework-upload" style={{ display: 'block', marginBottom: 8 }}>
          <Typography.Text strong>框架文件 (.xlsx / .csv)</Typography.Text>
        </label>
        <Upload
          id="framework-upload"
          accept=".xlsx,.csv"
          maxCount={1}
          fileList={frameworkFileList}
          beforeUpload={() => false}
          customRequest={noopCustomRequest}
          onChange={handleFrameworkChange}
          onRemove={handleFrameworkRemove}
        >
          <Button icon={<FileExcelOutlined />}>选择框架文件 (.xlsx / .csv)</Button>
        </Upload>
      </div>

      <div>
        <label htmlFor="content-upload" style={{ display: 'block', marginBottom: 8 }}>
          <Typography.Text strong>内容文件 (.md)</Typography.Text>
        </label>
        <Upload
          id="content-upload"
          accept=".md"
          maxCount={1}
          fileList={contentFileList}
          beforeUpload={() => false}
          customRequest={noopCustomRequest}
          onChange={handleContentChange}
          onRemove={handleContentRemove}
        >
          <Button icon={<FileTextOutlined />}>选择内容文件 (.md)</Button>
        </Upload>
      </div>
    </Space>
  )

  const renderPreviewStep = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 8,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <Typography.Text>左右预览已关联，点击错误标签或框架文件行可定位到对应位置。</Typography.Text>
      {renderValidationResult()}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        {editMode ? (
          <Button onClick={() => editor.exitEditMode()}>退出编辑模式</Button>
        ) : editModeTooltip ? (
          <Tooltip title={editModeTooltip}>
            <span style={{ display: 'inline-block' }}>
              <Button onClick={handleEnterEditMode} disabled={editModeDisabled}>
                进入编辑模式
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button onClick={handleEnterEditMode} disabled={editModeDisabled}>
            进入编辑模式
          </Button>
        )}
      </div>
      {(xlsxPreviewError || mdPreviewError) && (
        <Alert
          message={[xlsxPreviewError, mdPreviewError].filter(Boolean).join('；')}
          type="error"
          showIcon
          style={{ marginBottom: 8, flexShrink: 0 }}
        />
      )}
      {editMode ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            gap: 8,
            overflow: 'hidden',
          }}
        >
          <Alert
            message="编辑模式"
            description="xlsx 修改会自动同步到 Markdown 标题；直接编辑 Markdown 正文不会反向同步到 xlsx。编辑后必须重新校验。"
            type="info"
            showIcon
            style={{ flexShrink: 0 }}
          />
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <FrameworkEditor
              rows={editor.frameworkRows}
              selectedRowIds={editor.selectedRowIds}
              onRowChange={editor.updateRow}
              onSelectionChange={editor.toggleRowSelection}
              onAddRow={editor.addRow}
              onDeleteRow={editor.deleteRow}
              onInsertAfter={editor.insertRowAfter}
              mdSyncWarnings={editor.mdSyncWarnings}
            />
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <MdEditor
              content={editor.mdContent}
              onChange={editor.updateMdContent}
              fileSize={contentFile?.size ?? 0}
              selectedRows={editor.frameworkRows.filter(r =>
                editor.selectedRowIds.includes(r.rowId)
              )}
            />
          </div>
        </div>
      ) : isNarrow ? (
        // 窄屏（Drawer）：垂直堆叠，每个预览固定高度内部滚动
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          <div>
            <Typography.Text strong>框架文件预览</Typography.Text>
            <div style={{ marginTop: 8, height: 320, overflow: 'auto' }}>
              <FrameworkPreview
                rows={xlsxPreview || []}
                errors={validationResult?.errors || []}
                highlightedCodes={highlightedFrameworkCode ? [highlightedFrameworkCode] : []}
                onRowClick={handleFrameworkRowClick}
              />
            </div>
          </div>
          <div>
            <Typography.Text strong>内容文件预览</Typography.Text>
            <div
              style={{
                marginTop: 8,
                height: 320,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <MdPreview
                content={mdPreview || ''}
                errors={validationResult?.errors || []}
                highlightedLine={highlightedMdLine}
              />
            </div>
          </div>
        </div>
      ) : (
        // 桌面（Modal）：Allotment 可拖动分隔，滚动发生在预览内部
        <div
          style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Allotment proportionalLayout={false}>
            <Allotment.Pane minSize={280}>
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingRight: 8,
                }}
              >
                <Typography.Text strong>框架文件预览</Typography.Text>
                <div style={{ marginTop: 8, flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto' }}>
                  <FrameworkPreview
                    rows={xlsxPreview || []}
                    errors={validationResult?.errors || []}
                    highlightedCodes={highlightedFrameworkCode ? [highlightedFrameworkCode] : []}
                    onRowClick={handleFrameworkRowClick}
                  />
                </div>
              </div>
            </Allotment.Pane>
            <Allotment.Pane minSize={280}>
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  paddingLeft: 8,
                }}
              >
                <Typography.Text strong>内容文件预览</Typography.Text>
                <div
                  style={{
                    marginTop: 8,
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <MdPreview
                    content={mdPreview || ''}
                    errors={validationResult?.errors || []}
                    highlightedLine={highlightedMdLine}
                  />
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </div>
      )}
    </div>
  )

  const renderConfirmStep = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text>请确认以下知识点将被追加到当前教材。</Typography.Text>
      {error && <Alert message={error} type="error" showIcon />}
      <ImpactPreview rows={editMode ? editor.frameworkRows : xlsxPreview || []} />
    </Space>
  )

  const footerButtons = useMemo(() => {
    const cancelButton = (
      <Button key="cancel" onClick={handleClose} disabled={loading || validating}>
        取消
      </Button>
    )
    const prevButton = (
      <Button key="prev" disabled={currentStep === 0 || loading || validating} onClick={handlePrev}>
        上一步
      </Button>
    )
    const nextButton = (
      <Button
        key="next"
        type="primary"
        disabled={!canGoNext || loading || validating}
        onClick={handleNext}
      >
        下一步
      </Button>
    )
    const validateButton = (
      <Button
        key="validate"
        disabled={!bothFilesSelected || validating}
        loading={validating}
        onClick={() => {
          void (editMode ? revalidateFiles() : handleValidate())
        }}
      >
        {editMode ? '重新校验' : '开始校验'}
      </Button>
    )
    const submitButton = (
      <Button
        key="submit"
        type="primary"
        loading={loading}
        disabled={loading || !bothFilesSelected || validationResult?.valid !== true}
        onClick={() => {
          void handleSubmit()
        }}
      >
        确认扩充
      </Button>
    )

    if (currentStep === 0) {
      return [cancelButton, nextButton]
    }
    if (currentStep === 1) {
      return [cancelButton, prevButton, validateButton, nextButton]
    }
    return [cancelButton, prevButton, submitButton]
  }, [
    currentStep,
    canGoNext,
    bothFilesSelected,
    loading,
    validating,
    validationResult,
    editMode,
    revalidateFiles,
    handleClose,
    handlePrev,
    handleNext,
    handleValidate,
    handleSubmit,
  ])

  const steps = (
    <Steps
      current={currentStep}
      size="small"
      style={{ marginBottom: 24 }}
      items={[{ title: '上传文件' }, { title: '预览校验' }, { title: '确认扩充' }]}
    />
  )

  const body = (
    <div
      style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 16 }}
    >
      {steps}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {currentStep === 0 && renderUploadStep()}
        {currentStep === 1 && renderPreviewStep()}
        {currentStep === 2 && renderConfirmStep()}
      </div>
    </div>
  )

  return (
    <>
      {isNarrow ? (
        <Drawer
          title="扩充知识点"
          placement="bottom"
          height="100vh"
          open={open}
          onClose={handleClose}
          footer={footerButtons}
          maskClosable={!loading}
          keyboard={!loading}
        >
          {body}
        </Drawer>
      ) : (
        <Modal
          title="扩充知识点"
          open={open}
          onCancel={handleClose}
          footer={footerButtons}
          maskClosable={!loading}
          keyboard={!loading}
          width={900}
          style={{ top: '10vh', margin: '0 auto', maxWidth: '100vw', paddingBottom: 0 }}
          styles={{
            body: {
              height: 'calc(80vh - 108px)',
              overflow: 'hidden',
            },
          }}
        >
          {body}
        </Modal>
      )}
      <Drawer
        title="校验规则"
        placement="right"
        open={rulesDrawerOpen}
        onClose={() => setRulesDrawerOpen(false)}
        width={480}
      >
        <ValidationRulesPanel />
      </Drawer>
    </>
  )
}

export default ExpandKnowledgePointsModal
