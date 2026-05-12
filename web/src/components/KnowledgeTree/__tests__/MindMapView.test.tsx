import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MindMapView } from '../MindMapView'
import type { KnowledgeTreeNode } from '../types'

const mockData: KnowledgeTreeNode[] = [
  {
    key: '1',
    title: '集合与常用逻辑用语',
    code: '1',
    importanceLevel: 'A',
    children: [
      {
        key: '1.1',
        title: '集合的概念与表示',
        code: '1.1',
        importanceLevel: 'A',
        isLeaf: true,
        data: { id: 'kp-1', textbookId: 'tb-1', code: '1.1', level1: '1', importanceLevel: 'A' },
      },
    ],
    data: { id: 'kp-root', textbookId: 'tb-1', code: '1', level1: '1', importanceLevel: 'A' },
  },
]

describe('MindMapView', () => {
  it('renders loading state', () => {
    render(<MindMapView data={[]} loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(<MindMapView data={[]} />)
    expect(screen.getByText('No knowledge points')).toBeInTheDocument()
  })

  it('renders SVG with nodes', () => {
    const onSelect = vi.fn()
    const { container } = render(<MindMapView data={mockData} onSelect={onSelect} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('has layout mode selector in toolbar', () => {
    render(<MindMapView data={mockData} />)
    expect(screen.getByTestId('layout-selector')).toBeInTheDocument()
  })

  it('has layout mode selector with callback prop', () => {
    const onLayoutModeChange = vi.fn()
    render(
      <MindMapView
        data={mockData}
        layoutMode="tree"
        onLayoutModeChange={onLayoutModeChange}
      />
    )
    // The Select component renders with the current value
    expect(screen.getByTestId('layout-selector')).toBeInTheDocument()
  })
})
