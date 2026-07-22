import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { ExpandKnowledgePointsModal } from '../components/ExpandKnowledgePointsModal'
import type { ValidationReport, ExpansionDraft } from '../../../types/textbook.types'
import { downloadErrorReport } from '../../../utils/exportErrorReport'

vi.mock('../../../utils/textbookFilePreview', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../utils/textbookFilePreview')>()
  return {
    ...actual,
    parseFrameworkPreview: vi
      .fn()
      .mockResolvedValue([
        { code: '1.1.1', level1: '集合', level2: '集合的含义', importanceLevel: 'A' },
      ]),
    readTextFile: vi.fn().mockResolvedValue('#### 1.1.1 集合的含义\n\n内容'),
  }
})

vi.mock('../../../utils/exportErrorReport', () => ({
  downloadErrorReport: vi.fn(),
}))

let originalFileReader: typeof FileReader

class MockFileReader {
  onload: ((event: { target: { result: string } }) => void) | null = null
  onerror: ((event: { target: { result: string } }) => void) | null = null
  readAsDataURL(file: File) {
    const content = file.name === 'expand.xlsx' ? 'eGxzeA==' : 'bWQ='
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: `data:application/octet-stream;base64,${content}` } })
      }
    }, 0)
  }
}

beforeAll(() => {
  originalFileReader = global.FileReader
  global.FileReader = MockFileReader as unknown as typeof FileReader
})

afterAll(() => {
  global.FileReader = originalFileReader
})

function getFileInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="file"]'))
}

const CHECK_LABELS: [string, string][] = [
  ['parse', '框架文件可正常解析'],
  ['columns', '包含必需列（知识点编号、一级知识点）'],
  ['code-format', '行数据完整且编号为数字层级格式'],
  ['duplicates', '无重复知识点编号'],
  ['db-conflicts', '新编号不与当前教材已有编号冲突'],
  ['parents', '上级编号在当前教材中已存在'],
  ['md-empty', '内容文件非空'],
  ['md-codes', '内容文件编号均在框架文件中存在'],
  ['md-headings', '标题级别正确（一级 ##、二级 ###、三级 ####）'],
]

function buildChecks(
  failures: Record<
    string,
    {
      type: 'xlsx' | 'md'
      location: { file: 'xlsx' | 'md'; row?: number; code?: string }
      message: string
    }[]
  >
) {
  return CHECK_LABELS.map(([key, label]) => ({
    key,
    label,
    passed: !failures[key],
    errors: failures[key] ?? [],
  }))
}

const validReport: ValidationReport = { valid: true, errors: [], checks: buildChecks({}) }
const invalidReport: ValidationReport = {
  valid: false,
  errors: [
    { type: 'xlsx', location: { file: 'xlsx', code: '1.1.1' }, message: '已存在' },
    { type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' },
  ],
  checks: buildChecks({
    'db-conflicts': [
      { type: 'xlsx', location: { file: 'xlsx', code: '1.1.1' }, message: '已存在' },
    ],
    'md-headings': [{ type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' }],
  }),
}

const defaultProps = {
  open: true,
  textbookId: 'tb-1',
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

describe('ExpandKnowledgePointsModal wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    window.innerWidth = 1024
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    window.innerWidth = 1024
  })

  it('renders step 0 and disables next without files', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} />)

    expect(screen.getByText('扩充知识点')).toBeInTheDocument()
    expect(screen.getByText('上传文件')).toBeInTheDocument()
    expect(screen.getByText('查看校验规则')).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: /下一步/i })
    expect(nextButton).toBeDisabled()

    const cancelButton = screen.getByRole('button', { name: /取 消/i })
    fireEvent.click(cancelButton)
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('selecting files enables next and moves to preview step', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const nextButton = screen.getByRole('button', { name: /下一步/i })
    await waitFor(() => expect(nextButton).toBeEnabled())

    fireEvent.click(nextButton)
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())
    expect(screen.getByText('内容文件预览')).toBeInTheDocument()
  })

  it('supports csv framework files', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const csvFile = new File(['csv'], 'expand.csv', { type: 'text/csv' })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [csvFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const nextButton = screen.getByRole('button', { name: /下一步/i })
    await waitFor(() => expect(nextButton).toBeEnabled())

    fireEvent.click(nextButton)
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())
  })

  it('validates and proceeds to impact preview when validation passes', async () => {
    const onValidate = vi.fn().mockResolvedValue(undefined)
    const { baseElement, rerender } = render(
      <ExpandKnowledgePointsModal {...defaultProps} onValidate={onValidate} />
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const nextButton = screen.getByRole('button', { name: /下一步/i })
    await waitFor(() => expect(nextButton).toBeEnabled())
    fireEvent.click(nextButton)
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    expect(validateButton).toBeEnabled()
    fireEvent.click(validateButton)
    await waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1))

    rerender(
      <ExpandKnowledgePointsModal
        {...defaultProps}
        onValidate={onValidate}
        validationResult={validReport}
      />
    )

    await waitFor(() =>
      expect(screen.getByText('校验通过，可以进入下一步确认扩充。')).toBeInTheDocument()
    )
    const stepNextButton = screen.getByRole('button', { name: /下一步/i })
    await waitFor(() => expect(stepNextButton).toBeEnabled())
    fireEvent.click(stepNextButton)

    await waitFor(() => expect(screen.getByTestId('impact-summary')).toBeInTheDocument())
  })

  it('shows error tags and exports error report when validation fails', async () => {
    const { baseElement, rerender } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    await waitFor(() => expect(screen.getByRole('button', { name: /下一步/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }))
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /开始校验/i }))

    rerender(<ExpandKnowledgePointsModal {...defaultProps} validationResult={invalidReport} />)

    await waitFor(() => expect(screen.getByText(/编号 1\.1\.1/)).toBeInTheDocument())
    await waitFor(() => expect(screen.getAllByText(/标题层级错误/)).not.toHaveLength(0))

    // 逐项提示：2 个失败项显示 ✗，7 个通过项显示 ✓，且检查项名称可见
    expect(screen.getAllByText('✗')).toHaveLength(2)
    expect(screen.getAllByText('✓')).toHaveLength(7)
    expect(screen.getByText('新编号不与当前教材已有编号冲突')).toBeInTheDocument()
    expect(screen.getByText('框架文件可正常解析')).toBeInTheDocument()

    const exportButton = screen.getByRole('button', { name: /导出错误报告/i })
    fireEvent.click(exportButton)
    expect(downloadErrorReport).toHaveBeenCalledWith(invalidReport.errors, '校验错误报告.txt')
  })

  it('collapses and expands the validation result area', async () => {
    const { baseElement, rerender } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })
    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    await waitFor(() => expect(screen.getByRole('button', { name: /下一步/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }))
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())

    rerender(<ExpandKnowledgePointsModal {...defaultProps} validationResult={invalidReport} />)

    // 默认展开：逐项检查可见
    await waitFor(() =>
      expect(screen.getByText('新编号不与当前教材已有编号冲突')).toBeInTheDocument()
    )

    // 点击标题栏折叠：检查项消失，仅占一行标题
    const collapseBar = screen.getByRole('button', { name: /校验结果/ })
    fireEvent.click(collapseBar)
    await waitFor(() =>
      expect(screen.queryByText('新编号不与当前教材已有编号冲突')).not.toBeInTheDocument()
    )
    expect(screen.getByText(/2 项未通过/)).toBeInTheDocument()

    // 再次点击展开
    fireEvent.click(screen.getByRole('button', { name: /校验结果/ }))
    await waitFor(() =>
      expect(screen.getByText('新编号不与当前教材已有编号冲突')).toBeInTheDocument()
    )
  })

  it('submits selected files from the impact step', async () => {
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

    await waitFor(() => expect(screen.getByRole('button', { name: /下一步/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }))
    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())

    await waitFor(() => expect(screen.getByRole('button', { name: /下一步/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }))
    await waitFor(() => expect(screen.getByTestId('impact-summary')).toBeInTheDocument())

    const submitButton = screen.getByRole('button', { name: /确认扩充/i })
    expect(submitButton).toBeEnabled()
    fireEvent.click(submitButton)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })

  it('prompts to save draft when closing with files selected', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    await waitFor(() => expect(screen.getByRole('button', { name: /下一步/i })).toBeEnabled())

    const cancelButton = screen.getByRole('button', { name: /取 消/i })
    fireEvent.click(cancelButton)

    const confirmButton = await screen.findByText('保 存')
    fireEvent.click(confirmButton)

    await waitFor(() => expect(defaultProps.onCancel).toHaveBeenCalled())
    await waitFor(() => {
      const draft = sessionStorage.getItem('math-tong-expansion-draft-tb-1')
      expect(draft).not.toBeNull()
    })
  })

  it('restores a saved draft on mount', async () => {
    const draft: ExpansionDraft = {
      textbookId: 'tb-1',
      frameworkFileName: 'expand.xlsx',
      frameworkFileContent:
        'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,eGxzeA==',
      contentFileName: 'expand.md',
      contentFileContent: 'data:text/markdown;base64,bWQ=',
    }
    sessionStorage.setItem('math-tong-expansion-draft-tb-1', JSON.stringify(draft))

    render(<ExpandKnowledgePointsModal {...defaultProps} />)

    await waitFor(() => expect(screen.getByText('框架文件预览')).toBeInTheDocument())
    expect(screen.getByText('内容文件预览')).toBeInTheDocument()
  })

  it('uses a bottom Drawer on narrow screens', async () => {
    window.innerWidth = 500
    window.dispatchEvent(new Event('resize'))

    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    await waitFor(() => {
      expect(baseElement.querySelector('.ant-drawer')).toBeInTheDocument()
    })
    expect(baseElement.querySelector('.ant-modal-body')).not.toBeInTheDocument()
  })
})
