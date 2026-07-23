import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FrameworkPreview } from './FrameworkPreview'
import type { ValidationIssue } from '../../types/textbook.types'

const rows = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合' },
]

const errors: ValidationIssue[] = [
  { type: 'xlsx', location: { file: 'xlsx', code: '1.1.2' }, message: '已存在' },
]

describe('FrameworkPreview', () => {
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

  it('calls onRowClick with code when clicking a row', () => {
    const onRowClick = vi.fn()
    render(<FrameworkPreview rows={rows} errors={[]} onRowClick={onRowClick} />)

    fireEvent.click(screen.getByText('1.1.2'))
    expect(onRowClick).toHaveBeenCalledWith('1.1.2')
  })

  it('supports Chinese header rows and clickable code cell', () => {
    const onRowClick = vi.fn()
    const chineseRows = [{ 知识点编号: '2.1.1', 一级知识点: '函数', 二级知识点: '函数的概念' }]
    render(<FrameworkPreview rows={chineseRows} errors={[]} onRowClick={onRowClick} />)

    // 编号单元格渲染为 <a> 链接样式，点击触发定位
    const codeCell = screen.getByText('2.1.1')
    expect(codeCell.tagName).toBe('A')
    fireEvent.click(codeCell)
    expect(onRowClick).toHaveBeenCalledWith('2.1.1')
  })
})
