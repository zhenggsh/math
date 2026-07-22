import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ImpactPreview } from '../components/ImpactPreview'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

const rows: XlsxPreviewRow[] = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义', level3: '', importanceLevel: 'A' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合', level3: '', importanceLevel: 'A' },
]

const chineseRows: XlsxPreviewRow[] = [
  {
    知识点编号: '2.1.1',
    一级知识点: '函数',
    二级知识点: '函数的概念',
    三级知识点: '',
    重要性级别: 'A',
  },
  {
    知识点编号: '2.1.2',
    一级知识点: '函数',
    二级知识点: '函数的定义',
    三级知识点: '',
    重要性级别: 'A',
  },
]

describe('ImpactPreview', () => {
  it('shows summary and code examples', () => {
    render(<ImpactPreview rows={rows} />)

    expect(screen.getByTestId('impact-summary')).toHaveTextContent('将新增 2 个知识点')
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('1.1.2')).toBeInTheDocument()
  })

  it('shows summary and distribution for Chinese headers', () => {
    render(<ImpactPreview rows={chineseRows} />)

    expect(screen.getByTestId('impact-summary')).toHaveTextContent('将新增 2 个知识点')
    expect(screen.getByText('2.1.1')).toBeInTheDocument()
    expect(screen.getByText('2.1.2')).toBeInTheDocument()
    expect(screen.getByText('函数')).toBeInTheDocument()
  })

  it('shows empty state when no rows', () => {
    render(<ImpactPreview rows={[]} />)

    expect(screen.getByText(/未识别到有效知识点/)).toBeInTheDocument()
  })
})
