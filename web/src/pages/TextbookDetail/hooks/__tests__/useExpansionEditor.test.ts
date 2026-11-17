import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExpansionEditor } from '../useExpansionEditor'
import type { XlsxPreviewRow } from '../../../../utils/textbookFilePreview'

const originalCrypto = global.crypto

beforeAll(() => {
  const subtle = {
    digest: vi.fn((_algorithm: string, buffer: ArrayBuffer): Promise<ArrayBuffer> => {
      const bytes = new Uint8Array(buffer)
      // Deterministic non-cryptographic hash for tests only
      let hash = 0
      for (const b of bytes) {
        hash = (hash * 31 + b) & 0xffffffff
      }
      const result = new ArrayBuffer(32)
      const view = new DataView(result)
      for (let i = 0; i < 32; i += 4) {
        view.setInt32(i, hash, true)
      }
      return Promise.resolve(result)
    }),
  }
  vi.stubGlobal('crypto', { ...originalCrypto, subtle })
})

afterAll(() => {
  vi.stubGlobal('crypto', originalCrypto)
})

const originalFileReader = global.FileReader

beforeAll(() => {
  global.FileReader = class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: ((event: { target: { result: string | ArrayBuffer } }) => void) | null = null
    onerror: (() => void) | null = null
    readAsDataURL(file: File) {
      setTimeout(() => {
        const result = `data:text/plain;base64,${btoa(file.name)}`
        this.result = result
        if (this.onload) {
          this.onload({ target: { result } })
        }
      }, 0)
    }
    readAsArrayBuffer(file: File) {
      setTimeout(() => {
        file
          .arrayBuffer()
          .then(result => {
            this.result = result
            if (this.onload) {
              this.onload({ target: { result } })
            }
          })
          .catch(() => {})
      }, 0)
    }
  } as unknown as typeof FileReader
})

afterAll(() => {
  global.FileReader = originalFileReader
})

describe('useExpansionEditor', () => {
  const originalRows: XlsxPreviewRow[] = [
    { 知识点编号: '1.1.1', 知识点名称: '集合的含义', 一级知识点: '集合', 二级知识点: '集合的概念' },
  ]
  const originalMd = '#### 知识点 1.1.1：集合的含义\n\n旧内容\n'
  const textbookId = 'tb-1'
  const onValidate = vi.fn().mockResolvedValue(undefined)
  const onResetValidation = vi.fn()

  it('initializes in read-only mode', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({
        textbookId,
        originalRows,
        originalMd,
        onValidate,
        onResetValidation,
      })
    )

    expect(result.current.editMode).toBe(false)
    expect(result.current.frameworkRows).toHaveLength(1)
  })

  it('enters edit mode with loaded rows and md', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })

    expect(result.current.editMode).toBe(true)
  })

  it('updates row code and syncs markdown block heading', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateRow(rowId, { 知识点编号: '1.1.2', 知识点名称: '新名称' })
    })

    expect(result.current.mdContent).toContain('#### 知识点 1.1.2：新名称')
  })

  it('inserts a new row and creates a markdown block', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })

    act(() => {
      result.current.insertRowAfter(result.current.frameworkRows[0].rowId)
    })

    expect(result.current.frameworkRows).toHaveLength(2)
    expect(result.current.mdContent).toContain('#### 知识点 1.1.2')
  })

  it('inserts a row before the anchor without duplicating markdown headings', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })

    act(() => {
      result.current.insertRowBefore(result.current.frameworkRows[0].rowId)
    })

    expect(result.current.frameworkRows).toHaveLength(2)
    expect(result.current.frameworkRows[0]['知识点编号']).toBe('')
    expect(result.current.mdContent).toContain('#### 知识点 1.1.1')
    expect((result.current.mdContent.match(/#### /g) ?? []).length).toBe(1)
  })

  it('re-serializes files and calls onValidate when revalidate is invoked', async () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })

    await act(async () => {
      await result.current.revalidateFiles()
    })

    await waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1))
    const [frameworkFile, contentFile] = onValidate.mock.calls[0] as [File, File]
    expect(frameworkFile.name).toBe('framework.xlsx')
    expect(contentFile.name).toBe('content.md')
  })

  it('updates existing markdown block without duplicating headings', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateRow(rowId, { 知识点编号: '1.1.2', 知识点名称: '新名称' })
    })

    expect(result.current.mdContent).not.toContain('1.1.1')
    expect(result.current.mdContent).toContain('#### 知识点 1.1.2：新名称')
    expect((result.current.mdContent.match(/#### /g) ?? []).length).toBe(1)
  })

  it('updates the correct block after markdown content is edited directly', () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateMdContent('#### 知识点 1.1.1：集合的含义\n\n更新后的正文\n')
    })

    act(() => {
      result.current.updateRow(rowId, { 知识点名称: '更新名称' })
    })

    expect(result.current.mdContent).toContain('#### 知识点 1.1.1：更新名称')
    expect(result.current.mdContent).not.toContain('集合的含义')
    expect((result.current.mdContent.match(/#### /g) ?? []).length).toBe(1)
  })

  it('restores draft state and updates the correct block afterwards', async () => {
    const { result } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateRow(rowId, { 知识点名称: '草稿名称' })
    })

    let saved = false
    await act(async () => {
      saved = await result.current.saveDraft()
    })
    expect(saved).toBe(true)

    const { result: nextResult } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    let restored = false
    await act(async () => {
      restored = await nextResult.current.loadDraft(null, null)
    })
    expect(restored).toBe(true)

    expect(nextResult.current.mdContent).toContain('#### 知识点 1.1.1：草稿名称')

    const restoredRowId = nextResult.current.frameworkRows[0].rowId

    act(() => {
      nextResult.current.updateRow(restoredRowId, { 知识点名称: '恢复后更新' })
    })

    expect(nextResult.current.mdContent).toContain('#### 知识点 1.1.1：恢复后更新')
    expect((nextResult.current.mdContent.match(/#### /g) ?? []).length).toBe(1)
  })

  it('saves and loads a draft when original files match', async () => {
    const frameworkFile = new File(['framework content'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const contentFile = new File(['md content'], 'expand.md', { type: 'text/markdown' })
    const { result } = renderHook(() =>
      useExpansionEditor({
        textbookId,
        originalRows,
        originalMd,
        onValidate,
        onResetValidation,
        originalFrameworkFile: frameworkFile,
        originalContentFile: contentFile,
      })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateRow(rowId, { 知识点名称: '草稿名称' })
    })

    let saved = false
    await act(async () => {
      saved = await result.current.saveDraft()
    })
    expect(saved).toBe(true)

    let restored = false
    await act(async () => {
      restored = await result.current.loadDraft(frameworkFile, contentFile)
    })
    expect(restored).toBe(true)
    expect(result.current.hasUnsavedChanges).toBe(true)
    expect(result.current.mdContent).toContain('#### 知识点 1.1.1：草稿名称')
  })

  it('clears a stale draft when the original framework file has changed', async () => {
    const frameworkFile = new File(['framework content'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const contentFile = new File(['md content'], 'expand.md', { type: 'text/markdown' })
    const { result } = renderHook(() =>
      useExpansionEditor({
        textbookId,
        originalRows,
        originalMd,
        onValidate,
        onResetValidation,
        originalFrameworkFile: frameworkFile,
        originalContentFile: contentFile,
      })
    )

    act(() => {
      result.current.enterEditMode()
    })
    const rowId = result.current.frameworkRows[0].rowId

    act(() => {
      result.current.updateRow(rowId, { 知识点名称: '草稿名称' })
    })

    await act(async () => {
      await result.current.saveDraft()
    })

    const { result: nextResult } = renderHook(() =>
      useExpansionEditor({
        textbookId,
        originalRows,
        originalMd,
        onValidate,
        onResetValidation,
        originalFrameworkFile: frameworkFile,
        originalContentFile: contentFile,
      })
    )

    const differentFrameworkFile = new File(['different framework content'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    let restored = false
    await act(async () => {
      restored = await nextResult.current.loadDraft(differentFrameworkFile, contentFile)
    })
    expect(restored).toBe(false)
    expect(sessionStorage.getItem('math-tong-expansion-draft-tb-1')).toBeNull()
    expect(nextResult.current.mdContent).not.toContain('草稿名称')
  })
})
