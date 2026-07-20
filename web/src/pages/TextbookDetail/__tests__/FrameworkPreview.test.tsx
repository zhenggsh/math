import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FrameworkPreview } from '../components/FrameworkPreview'
import type { ValidationIssue } from '../../../types/textbook.types'

const rows = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合' },
]

const errors: ValidationIssue[] = [
  { type: 'xlsx', location: { file: 'xlsx', code: '1.1.2' }, message: '已存在' },
]

describe('FrameworkPreview', () => {
  it('renders preview table with status column', () => {
    render(<FrameworkPreview rows={rows} errors={errors} />)

    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('1.1.2')).toBeInTheDocument()
    expect(screen.getByText(/已存在/)).toBeInTheDocument()
  })

  it('renders empty state when no rows', () => {
    render(<FrameworkPreview rows={[]} errors={[]} />)

    expect(screen.getByText(/选择文件后/i)).toBeInTheDocument()
  })
})
