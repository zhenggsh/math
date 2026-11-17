import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { FrameworkPreview } from './FrameworkPreview'
import type { ValidationIssue, DivergenceIssue } from '../../types/textbook.types'

const rows = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合' },
]

const errors: ValidationIssue[] = [
  { type: 'xlsx', location: { file: 'xlsx', code: '1.1.2' }, message: '已存在' },
]

describe('FrameworkPreview', () => {
  // jsdom 未实现 scrollIntoView，高亮滚动 effect 需要 mock
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders original xlsx content without status column', () => {
    render(<FrameworkPreview rows={rows} errors={errors} />)

    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('1.1.2')).toBeInTheDocument()
    // 原样展示内容，不渲染附加的状态列
    expect(screen.queryByText('状态')).not.toBeInTheDocument()
  })

  it('renders empty state when no rows', () => {
    render(<FrameworkPreview rows={[]} errors={[]} />)

    expect(screen.getByText(/选择文件后/i)).toBeInTheDocument()
  })

  it('applies highlighted class to rows in highlightedCodes', () => {
    const { container } = render(
      <FrameworkPreview rows={rows} errors={[]} highlightedCodes={['1.1.2']} />
    )

    const highlighted = container.querySelector('.framework-row-highlighted')
    expect(highlighted).not.toBeNull()
    expect(highlighted).toHaveAttribute('data-row-key', 'framework-row-1.1.2')
  })

  it('calls onRowClick with code when clicking a row', () => {
    const onRowClick = vi.fn()
    render(<FrameworkPreview rows={rows} errors={[]} onRowClick={onRowClick} />)

    fireEvent.click(screen.getByText('1.1.2'))
    expect(onRowClick).toHaveBeenCalledWith('1.1.2')
  })

  it('renders action toolbar above the table when canEdit is true', () => {
    render(<FrameworkPreview rows={rows} errors={[]} canEdit />)

    expect(screen.getByRole('button', { name: '编辑概要' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增子知识点' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument()
  })

  it('supports Chinese header rows and highlights selected row on click', () => {
    const onRowClick = vi.fn()
    const chineseRows = [{ 知识点编号: '2.1.1', 一级知识点: '函数', 二级知识点: '函数的概念' }]
    const { container } = render(
      <FrameworkPreview rows={chineseRows} errors={[]} onRowClick={onRowClick} canEdit />
    )

    const codeCell = screen.getByText('2.1.1')
    fireEvent.click(codeCell)
    expect(onRowClick).toHaveBeenCalledWith('2.1.1')
    const row = container.querySelector('[data-row-key="framework-row-2.1.1"]')
    expect(row?.className).toContain('framework-row-selected')
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
      <FrameworkPreview rows={rows} errors={[]} divergenceIssues={divergenceIssues} />
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
        dbRow: { code: '1.1.2', level1: '集合', level2: '元素与集合' },
        changes: null,
      },
    ]
    const { container } = render(
      <FrameworkPreview rows={rows} errors={[]} divergenceIssues={divergenceIssues} />
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
      <FrameworkPreview rows={rows} errors={[]} divergenceIssues={divergenceIssues} />
    )

    const row = container.querySelector('[data-row-key="framework-row-1.1.1"]')
    expect(row).not.toBeNull()
    expect(row?.className).toContain('framework-row-changed')
    expect(row).toHaveAttribute('title', '字段不一致：知识点名称')
  })
})
