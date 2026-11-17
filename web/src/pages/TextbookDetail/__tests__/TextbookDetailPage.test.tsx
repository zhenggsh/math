import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'
import type { ContentFileContent, DivergenceReport } from '../../../types/textbook.types'
import type { KnowledgePoint } from '../../../types/knowledge.types'

let currentUserRole = 'TEACHER'

const {
  mockHookReturn,
  mockFetchFiles,
  mockFetchTextbook,
  defaultTextbook,
  defaultFrameworkFile,
  defaultContentFile,
  defaultKnowledgePoints,
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
    frameworkPath: 'math01.xlsx',
    contentPath: 'math01.md',
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
  const defaultKnowledgePoints: KnowledgePoint[] = [
    {
      id: 'kp-1',
      code: '1.1.1',
      name: '集合的含义',
      level1: '1',
      level2: '1.1',
      level3: '1.1.1',
      definition: '总体',
      characteristics: '确定性',
      importanceLevel: 'A',
      textbookId: 't1',
    },
  ]
  const mockFetchFiles = vi.fn()
  const mockFetchTextbook = vi.fn()
  const mockHookReturn = {
    textbook: { ...defaultTextbook },
    knowledgePoints: [...defaultKnowledgePoints],
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
    divergenceReport: null as DivergenceReport | null,
    divergenceLoading: false,
    divergenceError: null as string | null,
    fetchTextbook: mockFetchTextbook,
    fetchFiles: mockFetchFiles,
    fetchDivergence: vi.fn(),
    expand: vi.fn(),
    validate: vi.fn(),
    resetValidation: vi.fn(),
  }
  return {
    mockHookReturn,
    mockFetchFiles,
    mockFetchTextbook,
    defaultTextbook,
    defaultFrameworkFile,
    defaultContentFile,
    defaultKnowledgePoints,
  }
})

vi.mock('../hooks/useTextbookDetail', () => ({
  useTextbookDetail: () => mockHookReturn,
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { role: currentUserRole } }),
}))

const mockUpdateKnowledgePoint = vi.fn()
const mockCreateKnowledgePoint = vi.fn()
const mockDeleteKnowledgePoint = vi.fn()
const mockSaveKnowledgePointContent = vi.fn()

const mockDownloadFrameworkFile = vi.fn()
const mockDownloadContentFile = vi.fn()

vi.mock('../../../services/textbook.service', async () => {
  const actual = await vi.importActual<typeof import('../../../services/textbook.service')>(
    '../../../services/textbook.service'
  )
  return {
    ...actual,
    downloadFrameworkFile: (...args: unknown[]) =>
      mockDownloadFrameworkFile(...args) as Promise<void>,
    downloadContentFile: (...args: unknown[]) => mockDownloadContentFile(...args) as Promise<void>,
  }
})

vi.mock('../../../services/knowledgeApi', () => ({
  knowledgeApi: {
    updateKnowledgePoint: (...args: unknown[]) =>
      mockUpdateKnowledgePoint(...args) as Promise<unknown>,
    createKnowledgePoint: (...args: unknown[]) =>
      mockCreateKnowledgePoint(...args) as Promise<unknown>,
    deleteKnowledgePoint: (...args: unknown[]) =>
      mockDeleteKnowledgePoint(...args) as Promise<unknown>,
    getKnowledgeTree: vi.fn(),
    getKnowledgePointDetail: vi.fn(),
    searchKnowledgePoints: vi.fn(),
    saveKnowledgePointContent: (...args: unknown[]) =>
      mockSaveKnowledgePointContent(...args) as Promise<unknown>,
  },
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

vi.mock('../../../components/knowledge-point/EditKnowledgePointModal', () => ({
  EditKnowledgePointModal: (props: {
    open: boolean
    initialValues: Record<string, unknown>
    onCancel: () => void
    onSubmit: (dto: Record<string, unknown>) => void | Promise<void>
    loading?: boolean
  }) => {
    if (!props.open) {
      return null
    }
    return (
      <div data-testid="edit-modal">
        <button
          data-testid="edit-submit"
          onClick={(): void => {
            void props.onSubmit(props.initialValues)
          }}
        >
          保存
        </button>
        <button data-testid="edit-cancel" onClick={props.onCancel}>
          取消
        </button>
      </div>
    )
  },
}))

vi.mock('../../../components/knowledge-point/AddChildKnowledgePointModal', () => ({
  AddChildKnowledgePointModal: (props: {
    open: boolean
    onCancel: () => void
    onSubmit: (dto: Record<string, unknown>) => void | Promise<void>
    loading?: boolean
  }) => {
    if (!props.open) {
      return null
    }
    return (
      <div data-testid="add-child-modal">
        <button
          data-testid="add-child-submit"
          onClick={(): void => {
            void props.onSubmit({
              parentId: 'kp-1',
              code: '1.1.2',
              name: '集合的相等',
              importanceLevel: 'B',
            })
          }}
        >
          保存
        </button>
        <button data-testid="add-child-cancel" onClick={props.onCancel}>
          取消
        </button>
      </div>
    )
  },
}))

let scrollIntoViewMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  currentUserRole = 'TEACHER'
  scrollIntoViewMock = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoViewMock
  mockFetchFiles.mockClear()
  mockFetchTextbook.mockClear()
  mockUpdateKnowledgePoint.mockReset()
  mockCreateKnowledgePoint.mockReset()
  mockDeleteKnowledgePoint.mockReset()
  mockSaveKnowledgePointContent.mockReset()
  mockDownloadFrameworkFile.mockReset()
  mockDownloadContentFile.mockReset()
  mockHookReturn.expand.mockReset()
  mockHookReturn.fetchDivergence.mockReset()
  // 恢复 mockHookReturn 的默认值（有用例会修改这些字段，防止用例间互相污染）
  mockHookReturn.textbook = { ...defaultTextbook }
  mockHookReturn.frameworkFile = { ...defaultFrameworkFile }
  mockHookReturn.contentFile = { ...defaultContentFile }
  mockHookReturn.knowledgePoints = [...defaultKnowledgePoints]
  mockHookReturn.filesError = null
  mockHookReturn.divergenceReport = null
  mockHookReturn.divergenceLoading = false
  mockHookReturn.divergenceError = null
})

const selectFrameworkRow = (code: string): void => {
  const row = document.querySelector(`[data-row-key="framework-row-${code}"]`)
  if (!row) {
    throw new Error(`framework row for ${code} not found`)
  }
  fireEvent.click(row)
}

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

  it('优先使用分歧报告判断 diverged 状态', () => {
    mockHookReturn.textbook.lastModifiedAt = defaultFrameworkFile.lastModifiedAt
    mockHookReturn.divergenceReport = {
      diverged: true,
      issues: [
        {
          code: '1.1.2',
          type: 'missing-in-db',
          fileRow: { code: '1.1.2', level1: '集合' },
          dbRow: null,
          changes: null,
        },
      ],
    }
    renderPage()
    expect(screen.getByText(/文件与数据库不一致/)).toBeInTheDocument()
  })

  it('分歧报告显示查看差异按钮并打开抽屉', async () => {
    mockHookReturn.divergenceReport = {
      diverged: true,
      issues: [
        {
          code: '1.1.2',
          type: 'missing-in-db',
          fileRow: { code: '1.1.2', level1: '集合' },
          dbRow: null,
          changes: null,
        },
      ],
    }
    renderPage()

    const button = screen.getByRole('button', { name: /查看差异/ })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    await waitFor(() => {
      expect(screen.getByText('框架文件与数据库差异')).toBeInTheDocument()
      expect(screen.getAllByText('1.1.2').length).toBeGreaterThan(0)
    })
  })

  it('点击重新加载重新拉取文件', () => {
    renderPage()
    fireEvent.click(screen.getByText('重新加载'))
    expect(mockFetchFiles).toHaveBeenCalled()
  })

  it('默认展开教材信息并显示文件位置和下载按钮', () => {
    renderPage()
    expect(screen.getByText('教材信息')).toBeInTheDocument()
    expect(screen.getByText('框架文件位置')).toBeInTheDocument()
    expect(screen.getByText('内容文件位置')).toBeInTheDocument()
    expect(screen.getByText(/iksm\/math01\.xlsx/)).toBeInTheDocument()
    expect(screen.getByText(/iksm\/math01\.md/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /下载/ }).length).toBe(2)
  })

  it('点击隐藏/显示教材信息切换信息卡片', () => {
    renderPage()
    expect(screen.getByText('教材信息')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /隐藏教材信息/ }))
    expect(screen.queryByText('教材信息')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /显示教材信息/ }))
    expect(screen.getByText('教材信息')).toBeInTheDocument()
  })

  it('折叠教材信息后预览区高度自动放大', () => {
    const getPreviewBodyHeight = (): number => {
      const card = screen.getByText(/教材文件预览/).closest('.ant-card')
      const body = card?.querySelector('.ant-card-body')
      if (!(body instanceof HTMLElement)) {
        throw new Error('preview card body not found')
      }
      return parseInt(body.style.height, 10)
    }

    renderPage()
    expect(getPreviewBodyHeight()).toBe(480)

    fireEvent.click(screen.getByRole('button', { name: /隐藏教材信息/ }))
    expect(getPreviewBodyHeight()).toBe(Math.max(480, window.innerHeight - 280))
    expect(getPreviewBodyHeight()).toBeGreaterThanOrEqual(480)
  })

  it('点击下载按钮下载框架文件', async () => {
    mockDownloadFrameworkFile.mockResolvedValue(undefined)
    renderPage()

    const buttons = screen.getAllByRole('button', { name: /下载/ })
    fireEvent.click(buttons[0])

    await waitFor(() => {
      expect(mockDownloadFrameworkFile).toHaveBeenCalledWith('t1', 'math01.xlsx')
    })
  })

  it('点击下载按钮下载内容文件', async () => {
    mockDownloadContentFile.mockResolvedValue(undefined)
    renderPage()

    const buttons = screen.getAllByRole('button', { name: /下载/ })
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(mockDownloadContentFile).toHaveBeenCalledWith('t1', 'math01.md')
    })
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
      expect(mockFetchTextbook).toHaveBeenCalledTimes(1)
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

describe('TextbookDetailPage 知识点操作工具栏', () => {
  const setupSyncedState = () => {
    const syncedTime = '2026-07-22T10:00:00.000Z'
    mockHookReturn.textbook.lastModifiedAt = syncedTime
    mockHookReturn.frameworkFile.lastModifiedAt = syncedTime
  }

  it('教师角色显示操作工具栏', () => {
    setupSyncedState()
    renderPage()
    expect(screen.getByRole('button', { name: /编辑概要/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增子知识点/ })).toBeInTheDocument()
  })

  it('学生角色不显示操作工具栏', () => {
    currentUserRole = 'STUDENT'
    setupSyncedState()
    renderPage()
    expect(screen.queryByRole('button', { name: /编辑概要/ })).not.toBeInTheDocument()
  })

  it('编辑成功后刷新文件并高亮更新后的编号', async () => {
    setupSyncedState()
    mockUpdateKnowledgePoint.mockResolvedValue({
      id: 'kp-1',
      code: '1.1.2',
      name: '集合的相等关系',
      definition: '相等',
      characteristics: '互异性',
      importanceLevel: 'A',
    })
    mockFetchFiles.mockImplementation(() => {
      mockHookReturn.frameworkFile.rows = [
        {
          一级知识点: '集合',
          二级知识点: '集合的概念',
          三级知识点: '集合的相等关系',
          定义: '相等',
          特性: '互异性',
          重要性级别: 'A',
          知识点编号: '1.1.2',
        },
      ]
      return Promise.resolve()
    })
    renderPage()

    selectFrameworkRow('1.1.1')
    fireEvent.click(screen.getByRole('button', { name: /编辑概要/ }))
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('edit-submit'))

    await waitFor(() => {
      expect(mockUpdateKnowledgePoint).toHaveBeenCalledWith('t1', 'kp-1', expect.any(Object))
      expect(mockFetchFiles).toHaveBeenCalled()
      expect(mockFetchTextbook).toHaveBeenCalled()
    })
    await waitFor(() => {
      const row = document.querySelector('[data-row-key="framework-row-1.1.2"]')
      expect(row?.className).toContain('framework-row-highlighted')
    })
  })

  it('新增子知识点成功后刷新文件并高亮新编号', async () => {
    setupSyncedState()
    // 使用非叶子父节点（code 深度 < 3）才能点击“新增子知识点”
    mockHookReturn.knowledgePoints = [
      {
        id: 'kp-0',
        code: '1.1',
        name: '集合的概念',
        level1: '1',
        level2: '1.1',
        level3: null,
        definition: '',
        characteristics: '',
        importanceLevel: 'A',
        textbookId: 't1',
      },
    ]
    mockHookReturn.frameworkFile.rows = [
      {
        一级知识点: '集合',
        二级知识点: '集合的概念',
        三级知识点: '',
        定义: '',
        特性: '',
        重要性级别: 'A',
        知识点编号: '1.1',
      },
    ]
    mockCreateKnowledgePoint.mockResolvedValue({
      id: 'kp-2',
      code: '1.1.2',
      name: '集合的相等',
      importanceLevel: 'B',
    })
    mockFetchFiles.mockImplementation(() => {
      mockHookReturn.frameworkFile.rows = [
        {
          一级知识点: '集合',
          二级知识点: '集合的概念',
          三级知识点: '',
          定义: '',
          特性: '',
          重要性级别: 'A',
          知识点编号: '1.1',
        },
        {
          一级知识点: '集合',
          二级知识点: '集合的概念',
          三级知识点: '集合的相等',
          定义: '',
          特性: '',
          重要性级别: 'B',
          知识点编号: '1.1.2',
        },
      ]
      return Promise.resolve()
    })
    renderPage()

    selectFrameworkRow('1.1')
    fireEvent.click(screen.getByRole('button', { name: /新增子知识点/ }))
    expect(screen.getByTestId('add-child-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('add-child-submit'))

    await waitFor(() => {
      expect(mockCreateKnowledgePoint).toHaveBeenCalledWith('t1', expect.any(Object))
      expect(mockFetchFiles).toHaveBeenCalled()
      expect(mockFetchTextbook).toHaveBeenCalled()
    })
    await waitFor(() => {
      const row = document.querySelector('[data-row-key="framework-row-1.1.2"]')
      expect(row?.className).toContain('framework-row-highlighted')
    })
  })

  it('删除成功后刷新文件', async () => {
    setupSyncedState()
    mockDeleteKnowledgePoint.mockResolvedValue(undefined)
    renderPage()

    selectFrameworkRow('1.1.1')
    fireEvent.click(screen.getByRole('button', { name: /删除/ }))

    await waitFor(() => {
      expect(screen.getByText(/确定要删除知识点/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }))

    await waitFor(() => {
      expect(mockDeleteKnowledgePoint).toHaveBeenCalledWith('t1', 'kp-1')
      expect(mockFetchFiles).toHaveBeenCalled()
      expect(mockFetchTextbook).toHaveBeenCalled()
    })
  })

  it('选中行后可在右栏编辑 md 内容块并保存', async () => {
    setupSyncedState()
    mockSaveKnowledgePointContent.mockResolvedValue(undefined)
    renderPage()

    selectFrameworkRow('1.1.1')
    fireEvent.click(screen.getByRole('button', { name: /编辑内容/ }))

    const textarea = (await screen.findByRole('textbox')) as HTMLTextAreaElement
    expect(textarea.value).toContain('#### 知识点 1.1.1：集合的含义')
    expect(textarea.value).toContain('内容')

    fireEvent.change(textarea, {
      target: { value: '#### 知识点 1.1.1：集合的含义\n更新后的内容' },
    })
    // antd Button 会在两个汉字间插入空格，accessible name 为 "保 存"
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }))

    await waitFor(() => {
      expect(mockSaveKnowledgePointContent).toHaveBeenCalledWith(
        't1',
        'kp-1',
        expect.stringContaining('更新后的内容')
      )
      expect(mockFetchFiles).toHaveBeenCalled()
    })
    // 保存后退出编辑态，回到 md 预览
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  it('未选中行时编辑内容按钮不可用', () => {
    setupSyncedState()
    renderPage()
    expect(screen.getByRole('button', { name: /编辑内容/ })).toBeDisabled()
  })
})
