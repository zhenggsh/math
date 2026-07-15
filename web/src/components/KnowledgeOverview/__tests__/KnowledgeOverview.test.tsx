import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KnowledgeOverview } from '../KnowledgeOverview'

describe('KnowledgeOverview', () => {
  it('renders all sections when data is provided', () => {
    render(
      <KnowledgeOverview
        definition="导数是函数变化率。"
        characteristics="瞬时变化率、切线斜率。"
        importanceLevel="A"
      />
    )

    expect(screen.getByText('知识点概览')).toBeInTheDocument()
    expect(screen.getByText('导数是函数变化率。')).toBeInTheDocument()
    expect(screen.getByText('瞬时变化率、切线斜率。')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.queryByText('编号')).not.toBeInTheDocument()
    expect(screen.queryByText('名称')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('returns null when no data is provided', () => {
    const { container } = render(<KnowledgeOverview />)
    expect(container.firstChild).toBeNull()
  })
})
