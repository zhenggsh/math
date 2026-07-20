import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExpandKnowledgePointsModal } from '../components/ExpandKnowledgePointsModal'
import type { ValidationReport } from '../../../types/textbook.types'

vi.mock('../../../utils/textbookFilePreview', () => ({
  parseXlsxPreview: vi
    .fn()
    .mockResolvedValue([{ 知识点编号: '1.1.1', 一级知识点: '集合', 二级知识点: '集合的含义' }]),
  readTextFile: vi.fn().mockResolvedValue('#### 1.1.1 集合的含义\n\n内容'),
}))

function getFileInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="file"]'))
}

const validReport: ValidationReport = { valid: true, errors: [] }
const invalidReport: ValidationReport = {
  valid: false,
  errors: [
    { type: 'xlsx', location: { file: 'xlsx', code: '1.1.1' }, message: '已存在' },
    { type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' },
  ],
}

describe('ExpandKnowledgePointsModal', () => {
  const defaultProps = {
    open: true,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onValidate: vi.fn().mockResolvedValue(undefined),
    onResetValidation: vi.fn(),
    loading: false,
    validating: false,
    error: null,
    validationResult: null as ValidationReport | null,
    validationError: null,
  }

  it('should render modal with title and disabled validate/submit when no files selected', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} />)

    expect(screen.getByText('扩充知识点')).toBeInTheDocument()
    expect(screen.getByText(/上传新的 xlsx/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/框架文件/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/内容文件/i)).toBeInTheDocument()
    expect(screen.getByText(/框架文件.*xlsx.*校验规范/)).toBeInTheDocument()

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    expect(validateButton).toBeDisabled()

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()

    const cancelButton = screen.getByRole('button', { name: /取 消/i })
    fireEvent.click(cancelButton)
    expect(defaultProps.onCancel).toHaveBeenCalled()
    expect(defaultProps.onResetValidation).toHaveBeenCalled()
  })

  it('should enable validate after selecting both files', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    expect(fileInputs).toHaveLength(2)

    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    await waitFor(() => expect(validateButton).toBeEnabled())

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()
  })

  it('should show file previews after selecting files', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    await waitFor(() => {
      expect(screen.getByText('框架文件预览')).toBeInTheDocument()
      expect(screen.getByText('内容文件预览')).toBeInTheDocument()
      expect(screen.getByText('1.1.1')).toBeInTheDocument()
    })
  })

  it('should call onValidate with File objects when validate clicked', async () => {
    const onValidate = vi.fn().mockResolvedValue(undefined)

    const { baseElement } = render(
      <ExpandKnowledgePointsModal {...defaultProps} onValidate={onValidate} />
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    await waitFor(() => expect(validateButton).toBeEnabled())

    fireEvent.click(validateButton)

    await waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1))
    const [submittedXlsx, submittedMd] = onValidate.mock.calls[0] as [File, File]
    expect(submittedXlsx).toBeInstanceOf(File)
    expect(submittedMd).toBeInstanceOf(File)
    expect(submittedXlsx.name).toBe('expand.xlsx')
    expect(submittedMd.name).toBe('expand.md')
  })

  it('should enable submit and show success message when validationResult is valid', async () => {
    const { baseElement } = render(
      <ExpandKnowledgePointsModal {...defaultProps} validationResult={validReport} />
    )

    expect(screen.getByText('校验通过，可以确认扩充。')).toBeInTheDocument()

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    await waitFor(() => expect(submitButton).toBeEnabled())
  })

  it('should disable submit and show error list with location details when validationResult is invalid', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} validationResult={invalidReport} />)

    expect(screen.getByText(/校验失败/i)).toBeInTheDocument()
    expect(screen.getByText(/编号 1.1.1/)).toBeInTheDocument()
    expect(screen.getByText(/第 3 行/)).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()
  })

  it('should display validation error when validationError is provided', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} validationError="网络请求失败" />)

    expect(screen.getByText('网络请求失败')).toBeInTheDocument()
  })

  it('should reset validation result and previews when files are changed', async () => {
    const onResetValidation = vi.fn()

    const { baseElement } = render(
      <ExpandKnowledgePointsModal
        {...defaultProps}
        validationResult={validReport}
        onResetValidation={onResetValidation}
      />
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })

    await waitFor(() => expect(onResetValidation).toHaveBeenCalled())
  })

  it('should call onSubmit when confirm clicked after validation passed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    const { baseElement } = render(
      <ExpandKnowledgePointsModal
        {...defaultProps}
        validationResult={validReport}
        onSubmit={onSubmit}
      />
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    await waitFor(() => expect(submitButton).toBeEnabled())

    fireEvent.click(submitButton)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})
