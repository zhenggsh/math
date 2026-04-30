import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MarkdownPreview } from '../MarkdownPreview'

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="react-markdown">{children}</div>
  ),
}))

vi.mock('../MermaidRenderer', () => ({
  MermaidRenderer: ({ value }: { value: string }) => (
    <div data-testid="mermaid-renderer">{value}</div>
  ),
}))

describe('MarkdownPreview', () => {
  it('renders loading state', () => {
    render(<MarkdownPreview content="" loading={true} />)
    expect(screen.getByText('Loading content...')).toBeInTheDocument()
  })

  it('renders markdown content', () => {
    const content = '# Hello World\n\nThis is markdown.'
    render(<MarkdownPreview content={content} />)
    const markdown = screen.getByTestId('react-markdown')
    expect(markdown).toHaveTextContent('Hello World')
    expect(markdown).toHaveTextContent('This is markdown.')
  })

  it('renders raw content when showRaw is true', () => {
    const content = '# Hello World'
    render(<MarkdownPreview content={content} showRaw={true} />)
    expect(screen.getByText('# Hello World')).toBeInTheDocument()
  })

  it('renders view toggle buttons', () => {
    render(<MarkdownPreview content="test" />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Raw')).toBeInTheDocument()
  })

  it('toggles to raw view when Raw button is clicked', () => {
    const content = '# Hello'
    render(<MarkdownPreview content={content} />)

    fireEvent.click(screen.getByText('Raw'))
    expect(screen.getByText('# Hello')).toBeInTheDocument()
  })
})
