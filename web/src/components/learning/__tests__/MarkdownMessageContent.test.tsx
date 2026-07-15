import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownMessageContent } from '../MarkdownMessageContent'

describe('MarkdownMessageContent', () => {
  it('renders plain Markdown text', () => {
    render(<MarkdownMessageContent content="导数描述函数的变化率。" />)
    expect(screen.getByText('导数描述函数的变化率。')).toBeInTheDocument()
  })

  it('renders inline LaTeX formula', () => {
    const { container } = render(
      <MarkdownMessageContent content="导数 $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$ 描述变化率。" />
    )
    const katexElements = container.querySelectorAll('.katex')
    expect(katexElements.length).toBeGreaterThan(0)
  })

  it('renders block LaTeX formula on separate lines', () => {
    const { container } = render(
      <MarkdownMessageContent
        content={`$$
E = mc^2
$$`}
      />
    )
    const katexDisplay = container.querySelector('.katex-display')
    expect(katexDisplay).toBeInTheDocument()
  })

  it('renders Markdown table', () => {
    const { container } = render(
      <MarkdownMessageContent
        content={`| a | b |
|---|---|
| 1 | 2 |`}
      />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
  })
})
