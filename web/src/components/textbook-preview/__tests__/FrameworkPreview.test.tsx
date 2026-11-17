import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FrameworkPreview } from '../FrameworkPreview'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'
import type { DivergenceIssue } from '../../../types/textbook.types'

describe('FrameworkPreview', () => {
  const baseRows: XlsxPreviewRow[] = [
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
      三级知识点: '集合的含义',
      定义: '研究对象的总体',
      特性: '确定性、互异性',
      重要性级别: 'A',
      知识点编号: '1.1.1',
    },
    {
      一级知识点: '集合',
      二级知识点: '集合的概念',
      三级知识点: '集合的表示',
      定义: '列举法、描述法',
      特性: '确定性',
      重要性级别: 'B',
      知识点编号: '1.1.2',
    },
  ]

  const selectRowByCode = (container: HTMLElement, code: string): void => {
    const row = container.querySelector(`[data-row-key="framework-row-${code}"]`)
    if (!row) {
      throw new Error(`row ${code} not found`)
    }
    fireEvent.click(row)
  }

  it('renders rows without action toolbar by default', () => {
    render(<FrameworkPreview rows={baseRows} errors={[]} />)
    expect(screen.getByText('1.1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '编辑概要' })).not.toBeInTheDocument()
  })

  it('renders action toolbar when canEdit is true', () => {
    render(<FrameworkPreview rows={baseRows} errors={[]} canEdit />)
    expect(screen.getByRole('button', { name: '编辑概要' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增子知识点' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
  })

  it('disables toolbar actions until a row is selected', () => {
    render(<FrameworkPreview rows={baseRows} errors={[]} canEdit />)
    expect(screen.getByRole('button', { name: '编辑概要' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '新增子知识点' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled()
  })

  it('highlights the selected row when clicking a row', () => {
    const { container } = render(<FrameworkPreview rows={baseRows} errors={[]} canEdit />)

    selectRowByCode(container, '1.1.1')
    const row = container.querySelector('[data-row-key="framework-row-1.1.1"]')
    expect(row?.className).toContain('framework-row-selected')
  })

  it('calls onEdit after selecting a row and clicking edit', () => {
    const handleEdit = vi.fn()
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} canEdit onEdit={handleEdit} />
    )

    selectRowByCode(container, '1.1')
    fireEvent.click(screen.getByRole('button', { name: '编辑概要' }))
    expect(handleEdit).toHaveBeenCalledWith(baseRows[0])
  })

  it('calls onAddChild after selecting a row and clicking add child', () => {
    const handleAddChild = vi.fn()
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} canEdit onAddChild={handleAddChild} />
    )

    selectRowByCode(container, '1.1')
    fireEvent.click(screen.getByRole('button', { name: '新增子知识点' }))
    expect(handleAddChild).toHaveBeenCalledWith(baseRows[0])
  })

  it('disables add-child button for level-3 rows', () => {
    const { container } = render(<FrameworkPreview rows={baseRows} errors={[]} canEdit />)

    selectRowByCode(container, '1.1')
    expect(screen.getByRole('button', { name: '新增子知识点' })).not.toBeDisabled()

    selectRowByCode(container, '1.1.1')
    expect(screen.getByRole('button', { name: '新增子知识点' })).toBeDisabled()
  })

  it('disables delete button for non-leaf rows', () => {
    const { container } = render(<FrameworkPreview rows={baseRows} errors={[]} canEdit />)

    selectRowByCode(container, '1.1')
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled()

    selectRowByCode(container, '1.1.1')
    expect(screen.getByRole('button', { name: '删除' })).not.toBeDisabled()
  })

  it('confirms and calls onDelete for leaf rows', async () => {
    const handleDelete = vi.fn()
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} canEdit onDelete={handleDelete} />
    )

    selectRowByCode(container, '1.1.2')
    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    await waitFor(() => {
      expect(screen.getByText(/确定要删除知识点 1\.1\.2 吗/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }))
    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith(baseRows[2])
    })
  })

  it('disables all actions when fileDiverged is true', () => {
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} canEdit fileDiverged />
    )

    selectRowByCode(container, '1.1')
    expect(screen.getByRole('button', { name: '编辑概要' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '新增子知识点' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled()
  })

  it('still triggers onRowClick when a row is clicked', () => {
    const handleRowClick = vi.fn()
    render(<FrameworkPreview rows={baseRows} errors={[]} canEdit onRowClick={handleRowClick} />)

    fireEvent.click(screen.getByText('1.1.1'))
    expect(handleRowClick).toHaveBeenCalledWith('1.1.1')
  })

  it('applies missing-in-db style and tooltip to row only in file', () => {
    const divergenceIssues: DivergenceIssue[] = [
      {
        code: '1.1.1',
        type: 'missing-in-db',
        fileRow: { code: '1.1.1', level1: '集合' },
        dbRow: null,
        changes: null,
      },
    ]
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} divergenceIssues={divergenceIssues} />
    )

    const row = container.querySelector('[data-row-key="framework-row-1.1.1"]')
    expect(row).not.toBeNull()
    expect(row?.className).toContain('framework-row-missing-in-db')
    expect(row).toHaveAttribute('title', '该知识点在数据库中不存在')
  })

  it('applies missing-in-file style and tooltip to row only in database', () => {
    const divergenceIssues: DivergenceIssue[] = [
      {
        code: '1.1.2',
        type: 'missing-in-file',
        fileRow: null,
        dbRow: { code: '1.1.2', level1: '集合', level2: '集合的概念' },
        changes: null,
      },
    ]
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} divergenceIssues={divergenceIssues} />
    )

    const row = container.querySelector('[data-row-key="framework-row-1.1.2"]')
    expect(row).not.toBeNull()
    expect(row?.className).toContain('framework-row-missing-in-file')
    expect(row).toHaveAttribute('title', '该知识点在当前框架文件中不存在')
  })

  it('applies changed style and tooltip listing differing fields', () => {
    const divergenceIssues: DivergenceIssue[] = [
      {
        code: '1.1.1',
        type: 'changed',
        fileRow: { code: '1.1.1', name: '新名称', level1: '集合' },
        dbRow: { code: '1.1.1', name: '旧名称', level1: '集合' },
        changes: [{ field: 'name', fileValue: '新名称', dbValue: '旧名称' }],
      },
    ]
    const { container } = render(
      <FrameworkPreview rows={baseRows} errors={[]} divergenceIssues={divergenceIssues} />
    )

    const row = container.querySelector('[data-row-key="framework-row-1.1.1"]')
    expect(row).not.toBeNull()
    expect(row?.className).toContain('framework-row-changed')
    expect(row).toHaveAttribute('title', '字段不一致：知识点名称')
  })
})
