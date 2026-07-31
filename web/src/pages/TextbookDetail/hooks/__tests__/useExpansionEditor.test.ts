import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExpansionEditor } from '../useExpansionEditor'
import type { XlsxPreviewRow } from '../../../../utils/textbookFilePreview'

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

  it('restores draft state and updates the correct block afterwards', () => {
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

    act(() => {
      void result.current.saveDraft()
    })

    const { result: nextResult } = renderHook(() =>
      useExpansionEditor({ textbookId, originalRows, originalMd, onValidate, onResetValidation })
    )

    act(() => {
      void nextResult.current.loadDraft()
    })

    expect(nextResult.current.mdContent).toContain('#### 知识点 1.1.1：草稿名称')

    const restoredRowId = nextResult.current.frameworkRows[0].rowId

    act(() => {
      nextResult.current.updateRow(restoredRowId, { 知识点名称: '恢复后更新' })
    })

    expect(nextResult.current.mdContent).toContain('#### 知识点 1.1.1：恢复后更新')
    expect((nextResult.current.mdContent.match(/#### /g) ?? []).length).toBe(1)
  })
})
