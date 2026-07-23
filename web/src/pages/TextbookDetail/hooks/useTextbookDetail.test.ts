import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTextbookDetail } from './useTextbookDetail'
import type {
  TextbookDetail,
  ValidationReport,
  FrameworkFileContent,
  ContentFileContent,
} from '../../../types/textbook.types'
import type { KnowledgePoint } from '../../../types/knowledge.types'

const mocks = vi.hoisted(() => ({
  mockGetTextbook: vi.fn<[], Promise<TextbookDetail>>(),
  mockExpandTextbook: vi.fn<[string, File, File], Promise<unknown>>(),
  mockValidateTextbook: vi.fn<[string, File, File], Promise<ValidationReport>>(),
  mockGetFrameworkFile: vi.fn<[string], Promise<FrameworkFileContent>>(),
  mockGetContentFile: vi.fn<[string], Promise<ContentFileContent>>(),
  mockGetKnowledgeTree: vi.fn<[], Promise<KnowledgePoint[]>>(),
}))

vi.mock('../../../services/textbook.service', () => ({
  getTextbook: () => mocks.mockGetTextbook(),
  expandTextbook: (id: string, frameworkFile: File, contentFile: File) =>
    mocks.mockExpandTextbook(id, frameworkFile, contentFile),
  validateTextbook: (id: string, frameworkFile: File, contentFile: File) =>
    mocks.mockValidateTextbook(id, frameworkFile, contentFile),
  getFrameworkFile: (id: string) => mocks.mockGetFrameworkFile(id),
  getContentFile: (id: string) => mocks.mockGetContentFile(id),
}))

vi.mock('../../../services/knowledgeApi', () => ({
  knowledgeApi: {
    getKnowledgeTree: () => mocks.mockGetKnowledgeTree(),
  },
}))

const mockFrameworkFile: FrameworkFileContent = {
  fileName: 'math01.xlsx',
  fileType: 'xlsx',
  sheetName: '知识点框架',
  rows: [],
  totalRows: 0,
  lastModifiedAt: '2026-07-22T00:00:00.000Z',
}

const mockContentFile: ContentFileContent = {
  fileName: 'math01.md',
  content: '',
  totalLines: 0,
  lastModifiedAt: '2026-07-22T00:00:00.000Z',
  empty: false,
}

const mockTextbookDetail: TextbookDetail = {
  id: 'tb-1',
  name: 'math01',
  fileName: 'math01',
  frameworkType: 'xlsx',
  hasContent: true,
  knowledgePointCount: 10,
  lastModifiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

function createAxiosLikeError(message: string): Error {
  return Object.assign(new Error('Request failed with status code 400'), {
    response: {
      data: { message },
    },
  })
}

describe('useTextbookDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockGetFrameworkFile.mockResolvedValue(mockFrameworkFile)
    mocks.mockGetContentFile.mockResolvedValue(mockContentFile)
  })

  it('should display backend error message when expand fails with 400', async () => {
    mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
    mocks.mockExpandTextbook.mockRejectedValue(
      createAxiosLikeError('md 文件校验失败: md 中的知识点编号 2.3.1 在 xlsx 中不存在')
    )
    mocks.mockGetKnowledgeTree.mockResolvedValue([])

    const { result } = renderHook(() => useTextbookDetail('tb-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const expandResult = await act(async () =>
      result.current.expand(new File([], 'expand.xlsx'), new File([], 'expand.md'))
    )

    expect(expandResult).toBeNull()
    await waitFor(() =>
      expect(result.current.expandError).toBe(
        'md 文件校验失败: md 中的知识点编号 2.3.1 在 xlsx 中不存在'
      )
    )
  })

  it('should display fallback message when expand fails with non-axios error', async () => {
    mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
    mocks.mockExpandTextbook.mockRejectedValue(new Error('网络错误'))
    mocks.mockGetKnowledgeTree.mockResolvedValue([])

    const { result } = renderHook(() => useTextbookDetail('tb-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const expandResult = await act(async () =>
      result.current.expand(new File([], 'expand.xlsx'), new File([], 'expand.md'))
    )

    expect(expandResult).toBeNull()
    await waitFor(() => expect(result.current.expandError).toBe('网络错误'))
  })

  describe('fetchFiles', () => {
    it('should populate frameworkFile and contentFile after mount', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.filesLoading).toBe(false))

      expect(result.current.frameworkFile).toEqual(mockFrameworkFile)
      expect(result.current.contentFile).toEqual(mockContentFile)
      expect(result.current.filesError).toBeNull()
    })

    it('should set filesError and reset filesLoading when getFrameworkFile rejects', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])
      mocks.mockGetFrameworkFile.mockRejectedValue(createAxiosLikeError('框架文件不存在'))

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.filesLoading).toBe(false))

      expect(result.current.filesError).toBe('框架文件不存在')
      expect(result.current.frameworkFile).toBeNull()
      expect(result.current.contentFile).toBeNull()
    })

    it('should clear stale file data when refetch fails', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.frameworkFile).not.toBeNull())

      mocks.mockGetFrameworkFile.mockRejectedValue(new Error('网络错误'))
      await act(async () => result.current.fetchFiles())

      expect(result.current.filesError).toBe('网络错误')
      expect(result.current.frameworkFile).toBeNull()
      expect(result.current.contentFile).toBeNull()
      expect(result.current.filesLoading).toBe(false)
    })
  })

  describe('validate', () => {
    it('should clear previous result and error when starting validation', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])

      let resolveValidation: (report: ValidationReport) => void
      mocks.mockValidateTextbook.mockImplementation(
        () =>
          new Promise<ValidationReport>(resolve => {
            resolveValidation = resolve
          })
      )

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      let validationPromise: Promise<ValidationReport | null>
      act(() => {
        validationPromise = result.current.validate(
          new File([], 'expand.xlsx'),
          new File([], 'expand.md')
        )
      })

      await waitFor(() => expect(result.current.validating).toBe(true))
      expect(result.current.validationResult).toBeNull()
      expect(result.current.validationError).toBeNull()

      const report: ValidationReport = { valid: true, errors: [] }
      act(() => {
        resolveValidation(report)
      })

      await waitFor(() => expect(result.current.validating).toBe(false))
      expect(result.current.validationResult).toEqual(report)
      await validationPromise
    })

    it('should expose validation result when validation succeeds', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])
      const report: ValidationReport = { valid: true, errors: [] }
      mocks.mockValidateTextbook.mockResolvedValue(report)

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      const validationResult = await act(async () =>
        result.current.validate(new File([], 'expand.xlsx'), new File([], 'expand.md'))
      )

      expect(validationResult).toEqual(report)
      expect(result.current.validating).toBe(false)
      expect(result.current.validationResult).toEqual(report)
      expect(result.current.validationError).toBeNull()
    })

    it('should expose validation error when validation request fails', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])
      mocks.mockValidateTextbook.mockRejectedValue(createAxiosLikeError('框架文件解析失败'))

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      const validationResult = await act(async () =>
        result.current.validate(new File([], 'expand.xlsx'), new File([], 'expand.md'))
      )

      expect(validationResult).toBeNull()
      expect(result.current.validating).toBe(false)
      expect(result.current.validationError).toBe('框架文件解析失败')
      expect(result.current.validationResult).toBeNull()
    })

    it('should reset validation state when resetValidation is called', async () => {
      mocks.mockGetTextbook.mockResolvedValue(mockTextbookDetail)
      mocks.mockGetKnowledgeTree.mockResolvedValue([])
      mocks.mockValidateTextbook.mockResolvedValue({
        valid: true,
        errors: [],
      })

      const { result } = renderHook(() => useTextbookDetail('tb-1'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () =>
        result.current.validate(new File([], 'expand.xlsx'), new File([], 'expand.md'))
      )

      expect(result.current.validationResult).not.toBeNull()

      act(() => {
        result.current.resetValidation()
      })

      expect(result.current.validating).toBe(false)
      expect(result.current.validationResult).toBeNull()
      expect(result.current.validationError).toBeNull()
    })
  })
})
