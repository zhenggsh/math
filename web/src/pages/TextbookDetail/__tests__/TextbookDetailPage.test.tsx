import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'
import type { ContentFileContent } from '../../../types/textbook.types'

const {
  mockHookReturn,
  mockFetchFiles,
  defaultTextbook,
  defaultFrameworkFile,
  defaultContentFile,
} = vi.hoisted(() => {
  const defaultContentFile = {
    fileName: 'math01.md',
    content: '## 1 集合\n\n### 1.1 集合的概念\n\n#### 知识点 1.1.1：集合的含义\n内容\n',
    totalLines: 7,
    lastModifiedAt: '2026-07-22T10:00:00.000Z',
    empty: false,
  }
  const defaultTextbook = {
    id: 't1',
    name: '高中数学必修一',
    fileName: 'math01',
    frameworkType: 'xlsx',
    hasContent: true,
    knowledgePointCount: 83,
    lastModifiedAt: '2026-07-20T10:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
  }
  const defaultFrameworkFile = {
    fileName: 'math01.xlsx',
    fileType: 'xlsx' as const,
    sheetName: '知识点框架',
    rows: [
      {
        一级知识点: '集合',
        二级知识点: '集合的概念',
        三级知识点: '集合的含义',
        定义: '总体',
        特性: '确定性',
        重要性级别: 'A',
        知识点编号: '1.1.1',
      },
    ],
    totalRows: 1,
    lastModifiedAt: '2026-07-22T10:00:00.000Z',
  }
  const mockFetchFiles = vi.fn()
  const mockHookReturn = {
    textbook: { ...defaultTextbook },
    knowledgePoints: [],
    loading: false,
    error: null as string | null,
    expanding: false,
    expandError: null as string | null,
    validating: false,
    validationResult: null,
    validationError: null as string | null,
    frameworkFile: { ...defaultFrameworkFile },
    contentFile: { ...defaultContentFile } as ContentFileContent,
    filesLoading: false,
    filesError: null as string | null,
    fetchTextbook: vi.fn(),
    fetchFiles: mockFetchFiles,
    expand: vi.fn(),
    validate: vi.fn(),
    resetValidation: vi.fn(),
  }
  return {
    mockHookReturn,
    mockFetchFiles,
    defaultTextbook,
    defaultFrameworkFile,
    defaultContentFile,
  }
})

vi.mock('../hooks/useTextbookDetail', () => ({
  useTextbookDetail: () => mockHookReturn,
}))

vi.mock('../components/ExpandKnowledgePointsModal', () => ({
  ExpandKnowledgePointsModal: (props: {
    open: boolean
    onSubmit: (frameworkFile: File, contentFile: File) => void
  }) => {
    if (!props.open) {
      return null
    }
    return (
      <button
        data-testid="mock-submit"
        onClick={() => {
          props.onSubmit(new File([], 'expand.xlsx'), new File([], 'expand.md'))
        }}
      >
        确认上传
      </button>
    )
  },
}))

let scrollIntoViewMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  scrollIntoViewMock = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoViewMock
  mockFetchFiles.mockClear()
  mockHookReturn.fetchTextbook.mockClear()
  mockHookReturn.expand.mockReset()
  // 恢复 mockHookReturn 的默认值（有用例会修改这些字段，防止用例间互相污染）
  mockHookReturn.textbook = { ...defaultTextbook }
  mockHookReturn.frameworkFile = { ...defaultFrameworkFile }
  mockHookReturn.contentFile = { ...defaultContentFile }
  mockHookReturn.filesError = null
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/teacher/textbooks/t1']}>
      <Routes>
        <Route path="/teacher/textbooks/:id" element={<TextbookDetailPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('TextbookDetailPage 文件预览', () => {
  it('双栏展示框架行与 md 行号视图', () => {
    renderPage()
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getAllByText(/集合的含义/).length).toBeGreaterThan(0)
  })

  it('点击框架行后 md 对应行高亮并触发滚动', async () => {
    renderPage()
    fireEvent.click(screen.getByText('1.1.1'))
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('文件 mtime 与 DB lastModifiedAt 不一致时显示分歧提示', () => {
    renderPage()
    expect(screen.getByText(/文件与数据库不一致/)).toBeInTheDocument()
  })

  it('点击重新加载重新拉取文件', () => {
    renderPage()
    fireEvent.click(screen.getByText('重新加载'))
    expect(mockFetchFiles).toHaveBeenCalled()
  })

  it('无内容文件时右栏显示空态', () => {
    mockHookReturn.contentFile = {
      fileName: null,
      content: '',
      totalLines: 0,
      lastModifiedAt: null,
      empty: true,
    }
    renderPage()
    expect(screen.getByText(/暂无内容文件/)).toBeInTheDocument()
  })

  it('文件加载失败显示错误态而非白屏', () => {
    mockHookReturn.filesError = '框架文件不存在: math01.xlsx'
    renderPage()
    expect(screen.getAllByText(/math01\.xlsx/).length).toBeGreaterThan(0)
  })

  it('扩充成功后刷新文件、高亮新增编号并关闭弹窗', async () => {
    mockHookReturn.expand.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { addedCodes: ['1.1.1'], count: 1 },
    })
    renderPage()

    fireEvent.click(screen.getByText('扩充知识点'))
    fireEvent.click(screen.getByTestId('mock-submit'))

    await waitFor(() => {
      expect(mockHookReturn.expand).toHaveBeenCalledTimes(1)
      expect(mockHookReturn.fetchTextbook).toHaveBeenCalledTimes(1)
      expect(mockFetchFiles).toHaveBeenCalled()
    })
    // 防 jsdom 假绿：高亮 class 必须作用于刷新后的行集
    await waitFor(() => {
      const row = document.querySelector('[data-row-key="framework-row-1.1.1"]')
      expect(row?.className).toContain('framework-row-highlighted')
    })
    expect(screen.queryByTestId('mock-submit')).not.toBeInTheDocument()
  })
})
