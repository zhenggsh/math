import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MdPreview } from './MdPreview'
import type { ValidationIssue } from '../../types/textbook.types'

const content = '#### 1.1.1 集合的含义\n\n这是内容。\n### 1.1.2 元素与集合'

const errors: ValidationIssue[] = [
  { type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' },
]

describe('MdPreview', () => {
  it('renders line numbers and content', () => {
    render(<MdPreview content={content} errors={[]} />)

    expect(screen.getByText(/1\.1\.1 集合的含义/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('highlights error lines', () => {
    render(<MdPreview content={content} errors={errors} />)

    expect(screen.getByText(/标题层级错误/)).toBeInTheDocument()
  })

  it('renders empty state when no content', () => {
    render(<MdPreview content="" errors={[]} />)

    expect(screen.getByText(/选择文件后/i)).toBeInTheDocument()
  })
})
