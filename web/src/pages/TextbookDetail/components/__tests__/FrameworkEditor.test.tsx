import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FrameworkEditor } from '../FrameworkEditor'
import type { EditorRow } from '../../../../utils/knowledgeBlocks'

describe('FrameworkEditor', () => {
  const rows: EditorRow[] = [
    { rowId: 'r1', 知识点编号: '1.1.1', 知识点名称: '集合的含义', 一级知识点: '集合' },
  ]

  const renderEditor = (props: Partial<React.ComponentProps<typeof FrameworkEditor>> = {}) =>
    render(
      <FrameworkEditor
        rows={rows}
        selectedRowIds={[]}
        onRowChange={vi.fn()}
        onSelectionChange={vi.fn()}
        onAddRow={vi.fn()}
        onDeleteRow={vi.fn()}
        onInsertAfter={vi.fn()}
        mdSyncWarnings={new Map()}
        {...props}
      />
    )

  it('renders editable rows', () => {
    renderEditor()

    expect(screen.getByTestId('cell-input-r1-知识点编号')).toHaveValue('1.1.1')
    expect(screen.getByTestId('cell-input-r1-知识点名称')).toHaveValue('集合的含义')
    expect(screen.getByTestId('cell-input-r1-一级知识点')).toHaveValue('集合')
  })

  it('commits edited value on blur', () => {
    const onRowChange = vi.fn()
    renderEditor({ onRowChange })

    const input = screen.getByTestId('cell-input-r1-知识点编号')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1.1.2' } })
    fireEvent.blur(input)

    expect(onRowChange).toHaveBeenCalledWith('r1', { 知识点编号: '1.1.2' })
  })

  it('commits edited value on Enter', () => {
    const onRowChange = vi.fn()
    renderEditor({ onRowChange })

    const input = screen.getByTestId('cell-input-r1-知识点编号')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1.1.2' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onRowChange).toHaveBeenCalledWith('r1', { 知识点编号: '1.1.2' })
  })

  it('reverts on Escape and does not call onRowChange', () => {
    const onRowChange = vi.fn()
    renderEditor({ onRowChange })

    const input = screen.getByTestId('cell-input-r1-知识点编号')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1.1.2' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onRowChange).not.toHaveBeenCalled()
    expect(input).toHaveValue('1.1.1')
  })

  it('does not call onRowChange on blur when value is unchanged', () => {
    const onRowChange = vi.fn()
    renderEditor({ onRowChange })

    const input = screen.getByTestId('cell-input-r1-知识点编号')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1.1.1' } })
    fireEvent.blur(input)

    expect(onRowChange).not.toHaveBeenCalled()
  })

  it('shows validation error for duplicate code', () => {
    const duplicateRows: EditorRow[] = [
      { rowId: 'r1', 知识点编号: '1.1.1', 知识点名称: 'A' },
      { rowId: 'r2', 知识点编号: '1.1.1', 知识点名称: 'B' },
    ]
    renderEditor({ rows: duplicateRows })

    expect(screen.getAllByText('编号重复')).toHaveLength(2)
  })

  it('shows validation error for invalid code', () => {
    const invalidRows: EditorRow[] = [{ rowId: 'r1', 知识点编号: 'abc', 知识点名称: 'A' }]
    renderEditor({ rows: invalidRows })

    expect(screen.getByText('编号必须是数字层级格式')).toBeInTheDocument()
  })

  it('renders mdSyncWarnings text', () => {
    const mdSyncWarnings = new Map([['r1', '未在 Markdown 中找到']])
    renderEditor({ mdSyncWarnings })

    expect(screen.getByText('未在 Markdown 中找到')).toBeInTheDocument()
  })

  it('toggles checkbox and calls onSelectionChange', () => {
    const onSelectionChange = vi.fn()
    renderEditor({ onSelectionChange })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onSelectionChange).toHaveBeenCalledWith('r1')
  })

  it('calls onInsertAfter when insert action clicked', () => {
    const onInsertAfter = vi.fn()
    renderEditor({ onInsertAfter })

    fireEvent.click(screen.getByRole('button', { name: /下方插入一行/i }))

    expect(onInsertAfter).toHaveBeenCalledWith('r1')
  })

  it('calls onDeleteRow when delete action clicked', () => {
    const onDeleteRow = vi.fn()
    renderEditor({ onDeleteRow })

    fireEvent.click(screen.getByRole('button', { name: /删除/i }))

    expect(onDeleteRow).toHaveBeenCalledWith('r1')
  })

  it('calls onAddRow when add row button clicked', () => {
    const onAddRow = vi.fn()
    renderEditor({ onAddRow })

    fireEvent.click(screen.getByRole('button', { name: /新增行/i }))

    expect(onAddRow).toHaveBeenCalled()
  })
})
