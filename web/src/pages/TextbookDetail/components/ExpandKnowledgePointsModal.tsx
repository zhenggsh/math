import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Upload, Button, Space, Alert, Typography, Table, Input, Spin } from 'antd'
import { FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'
import type { ValidationReport } from '../../../types/textbook.types'
import { ValidationRulesPanel } from './ValidationRulesPanel'
import {
  parseXlsxPreview,
  readTextFile,
  type XlsxPreviewRow,
} from '../../../utils/textbookFilePreview'

interface ExpandKnowledgePointsModalProps {
  open: boolean
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

export const ExpandKnowledgePointsModal: React.FC<ExpandKnowledgePointsModalProps> = ({
  open,
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
  const [frameworkFile, setFrameworkFile] = useState<File | null>(null)
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [frameworkFileList, setFrameworkFileList] = useState<UploadFile[]>([])
  const [contentFileList, setContentFileList] = useState<UploadFile[]>([])
  const [xlsxPreview, setXlsxPreview] = useState<XlsxPreviewRow[] | null>(null)
  const [mdPreview, setMdPreview] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setFrameworkFile(null)
    setContentFile(null)
    setFrameworkFileList([])
    setContentFileList([])
    setXlsxPreview(null)
    setMdPreview(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onResetValidation()
    onCancel()
  }, [resetState, onResetValidation, onCancel])

  const handleSubmit = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    await onSubmit(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onSubmit])

  const handleValidate = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    await onValidate(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onValidate])

  const extractFile = (file: UploadFile | File): File | null => {
    if (file instanceof File) {
      return file
    }
    const origin = file.originFileObj
    return origin instanceof File ? origin : null
  }

  useEffect(() => {
    if (!frameworkFile) {
      return
    }
    let cancelled = false
    parseXlsxPreview(frameworkFile)
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

  const handleFrameworkChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setFrameworkFile(extracted)
      }
      setXlsxPreview(null)
      setFrameworkFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      onResetValidation()
    },
    [onResetValidation]
  )

  const handleContentChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setContentFile(extracted)
      }
      setMdPreview(null)
      setContentFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      onResetValidation()
    },
    [onResetValidation]
  )

  const handleFrameworkRemove = useCallback(() => {
    setFrameworkFile(null)
    setXlsxPreview(null)
    setFrameworkFileList([])
    onResetValidation()
    return true
  }, [onResetValidation])

  const handleContentRemove = useCallback(() => {
    setContentFile(null)
    setMdPreview(null)
    setContentFileList([])
    onResetValidation()
    return true
  }, [onResetValidation])

  const noopCustomRequest = useCallback(() => {}, [])

  const canValidate = frameworkFile !== null && contentFile !== null
  const canSubmit = canValidate && validationResult?.valid === true

  const xlsxColumns = useMemo(() => {
    if (!xlsxPreview || xlsxPreview.length === 0) return []
    return Object.keys(xlsxPreview[0]).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
    }))
  }, [xlsxPreview])

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
      return <Alert message={validationError} type="error" showIcon />
    }

    if (!validationResult) {
      return null
    }

    if (validationResult.valid) {
      return <Alert message="校验通过，可以确认扩充。" type="success" showIcon />
    }

    const xlsxErrors = validationResult.errors.filter(e => e.type === 'xlsx')
    const mdErrors = validationResult.errors.filter(e => e.type === 'md')

    return (
      <Alert
        message="校验失败，请修正以下问题后重新校验："
        type="error"
        showIcon
        description={
          <div style={{ marginTop: 8 }}>
            {xlsxErrors.length > 0 && (
              <div>
                <Typography.Text strong>框架文件 (xlsx)</Typography.Text>
                <ul style={{ margin: '4px 0 12px 0', paddingLeft: 18 }}>
                  {xlsxErrors.map((err, index) => (
                    <li key={`xlsx-${index}`}>
                      <Typography.Text>
                        {err.location.code
                          ? `编号 ${err.location.code}：`
                          : err.location.row
                            ? `第 ${err.location.row} 行：`
                            : ''}
                        {err.message}
                      </Typography.Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mdErrors.length > 0 && (
              <div>
                <Typography.Text strong>内容文件 (md)</Typography.Text>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
                  {mdErrors.map((err, index) => (
                    <li key={`md-${index}`}>
                      <Typography.Text>
                        {err.location.code
                          ? `编号 ${err.location.code}：`
                          : err.location.row
                            ? `第 ${err.location.row} 行：`
                            : ''}
                        {err.message}
                      </Typography.Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        }
      />
    )
  }

  return (
    <Modal
      title="扩充知识点"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={loading || validating}>
          取消
        </Button>,
        <Button
          key="validate"
          disabled={!canValidate || validating}
          loading={validating}
          onClick={() => {
            void handleValidate()
          }}
        >
          开始校验
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!canSubmit}
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

        <ValidationRulesPanel />

        {error && <Alert message={error} type="error" showIcon />}
        {renderValidationResult()}

        <div>
          <label htmlFor="framework-upload" style={{ display: 'block', marginBottom: 8 }}>
            <Typography.Text strong>框架文件 (.xlsx)</Typography.Text>
          </label>
          <Upload
            id="framework-upload"
            accept=".xlsx"
            maxCount={1}
            fileList={frameworkFileList}
            beforeUpload={() => false}
            customRequest={noopCustomRequest}
            onChange={handleFrameworkChange}
            onRemove={handleFrameworkRemove}
          >
            <Button icon={<FileExcelOutlined />}>选择框架文件 (.xlsx)</Button>
          </Upload>
          {xlsxPreview && xlsxPreview.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>框架文件预览</Typography.Text>
              <Table
                dataSource={xlsxPreview}
                columns={xlsxColumns}
                rowKey={(_record, index) => `row-${index}`}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
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
          {mdPreview !== null && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>内容文件预览</Typography.Text>
              <Input.TextArea
                value={mdPreview}
                readOnly
                rows={6}
                style={{ marginTop: 8, fontFamily: 'monospace' }}
              />
            </div>
          )}
        </div>
      </Space>
    </Modal>
  )
}

export default ExpandKnowledgePointsModal
