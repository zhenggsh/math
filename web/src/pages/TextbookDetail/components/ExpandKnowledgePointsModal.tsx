import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Drawer,
  Upload,
  Button,
  Space,
  Alert,
  Typography,
  Steps,
  Row,
  Col,
  Spin,
} from 'antd'
import { FileExcelOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload'
import type {
  ValidationIssue,
  ValidationReport,
  ExpansionDraft,
} from '../../../types/textbook.types'
import { ValidationRulesPanel } from './ValidationRulesPanel'
import { FrameworkPreview } from './FrameworkPreview'
import { MdPreview } from './MdPreview'
import { ErrorTag } from './ErrorTag'
import { ImpactPreview } from './ImpactPreview'
import {
  parseFrameworkPreview,
  readTextFile,
  type XlsxPreviewRow,
} from '../../../utils/textbookFilePreview'
import { downloadErrorReport } from '../../../utils/exportErrorReport'

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
  const [highlightedFrameworkCode, setHighlightedFrameworkCode] = useState<string | undefined>(
    undefined
  )
  const [highlightedMdLine, setHighlightedMdLine] = useState<number | undefined>(undefined)
  const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT)

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
        if (!cancelled) setXlsxPreview(rows)
      })
      .catch(() => {
        if (!cancelled) setXlsxPreview(null)
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
        if (!cancelled) setMdPreview(text)
      })
      .catch(() => {
        if (!cancelled) setMdPreview(null)
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
      onResetValidation()
      setHighlightedMdLine(undefined)
    },
    [onResetValidation]
  )

  const handleFrameworkRemove = useCallback(() => {
    setFrameworkFile(null)
    setFrameworkFileList([])
    setXlsxPreview(null)
    onResetValidation()
    setHighlightedFrameworkCode(undefined)
    return true
  }, [onResetValidation])

  const handleContentRemove = useCallback(() => {
    setContentFile(null)
    setContentFileList([])
    setMdPreview(null)
    onResetValidation()
    setHighlightedMdLine(undefined)
    return true
  }, [onResetValidation])

  const handleValidate = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    setHighlightedFrameworkCode(undefined)
    setHighlightedMdLine(undefined)
    await onValidate(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onValidate])

  const handleSubmit = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    await onSubmit(frameworkFile, contentFile)
    clearDraft()
  }, [frameworkFile, contentFile, onSubmit, clearDraft])

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

  const handleErrorClick = useCallback((location: ValidationIssue['location']) => {
    if (location.code) {
      setHighlightedFrameworkCode(location.code)
    }
    if (location.row) {
      setHighlightedMdLine(location.row)
    }
  }, [])

  const handleExportErrors = useCallback(() => {
    if (!validationResult) return
    downloadErrorReport(validationResult.errors, '校验错误报告.txt')
  }, [validationResult])

  const noopCustomRequest = useCallback(() => {}, [])

  const bothFilesSelected = frameworkFile !== null && contentFile !== null
  const canGoNext = currentStep === 0 ? bothFilesSelected : validationResult?.valid === true

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

    if (validationResult.valid) {
      return (
        <Alert
          message="校验通过，可以进入下一步确认扩充。"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )
    }

    const xlsxErrors = validationResult.errors.filter(e => e.type === 'xlsx')
    const mdErrors = validationResult.errors.filter(e => e.type === 'md')

    return (
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="校验失败，请修正以下问题后重新校验："
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
        />
        <div>
          {xlsxErrors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Typography.Text strong>框架文件 (xlsx)</Typography.Text>
              <div style={{ marginTop: 4 }}>
                {xlsxErrors.map((err, index) => (
                  <ErrorTag key={`xlsx-${index}`} issue={err} onClick={handleErrorClick} />
                ))}
              </div>
            </div>
          )}
          {mdErrors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Typography.Text strong>内容文件 (md)</Typography.Text>
              <div style={{ marginTop: 4 }}>
                {mdErrors.map((err, index) => (
                  <ErrorTag key={`md-${index}`} issue={err} onClick={handleErrorClick} />
                ))}
              </div>
            </div>
          )}
          <Button size="small" onClick={handleExportErrors} style={{ marginTop: 8 }}>
            导出错误报告
          </Button>
        </div>
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
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text>左右预览已关联，点击错误标签可定位到对应位置。</Typography.Text>
      {renderValidationResult()}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Typography.Text strong>框架文件预览</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <FrameworkPreview
              rows={xlsxPreview || []}
              errors={validationResult?.errors || []}
              highlightedCode={highlightedFrameworkCode}
              onRowClick={code => setHighlightedFrameworkCode(code)}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Typography.Text strong>内容文件预览</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <MdPreview
              content={mdPreview || ''}
              errors={validationResult?.errors || []}
              highlightedLine={highlightedMdLine}
            />
          </div>
        </Col>
      </Row>
    </Space>
  )

  const renderConfirmStep = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text>请确认以下知识点将被追加到当前教材。</Typography.Text>
      <ImpactPreview rows={xlsxPreview || []} />
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
          void handleValidate()
        }}
      >
        开始校验
      </Button>
    )
    const submitButton = (
      <Button
        key="submit"
        type="primary"
        loading={loading}
        disabled={loading || !bothFilesSelected}
        onClick={() => {
          void handleSubmit()
        }}
      >
        确认上传
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
    <Space direction="vertical" style={{ width: '100%' }}>
      {steps}
      {currentStep === 0 && renderUploadStep()}
      {currentStep === 1 && renderPreviewStep()}
      {currentStep === 2 && renderConfirmStep()}
    </Space>
  )

  return (
    <>
      {isNarrow ? (
        <Drawer
          title="扩充知识点"
          placement="bottom"
          height="90vh"
          open={open}
          onClose={handleClose}
          extra={footerButtons}
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
          width={960}
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
