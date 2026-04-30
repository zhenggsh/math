import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MermaidRenderer } from '../MermaidRenderer'

const mockRender = vi.fn<[], Promise<unknown>>()

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: (...args: unknown[]) => mockRender(...args),
  },
}))

describe('MermaidRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockRender.mockImplementation(() => new Promise(() => {}))
    render(<MermaidRenderer value="graph TD; A-->B;" />)
    expect(screen.getByText('Rendering diagram...')).toBeInTheDocument()
  })

  it('renders diagram after successful mermaid render', async () => {
    mockRender.mockResolvedValue({ svg: '<svg><text>Diagram</text></svg>' })
    render(<MermaidRenderer value="graph TD; A-->B;" />)

    await waitFor(() => {
      expect(screen.getByText('Diagram')).toBeInTheDocument()
    })
  })

  it('renders error state when mermaid fails', async () => {
    mockRender.mockRejectedValue(new Error('Invalid syntax'))
    render(<MermaidRenderer value="invalid" />)

    await waitFor(() => {
      expect(screen.getByText('Diagram render error')).toBeInTheDocument()
      expect(screen.getByText('Invalid syntax')).toBeInTheDocument()
    })
  })

  it('renders empty state when value is empty', async () => {
    mockRender.mockResolvedValue({ svg: '<svg></svg>' })
    render(<MermaidRenderer value="" />)

    await waitFor(() => {
      expect(screen.queryByText('Rendering diagram...')).not.toBeInTheDocument()
      expect(screen.queryByText('Diagram render error')).not.toBeInTheDocument()
    })
  })
})
