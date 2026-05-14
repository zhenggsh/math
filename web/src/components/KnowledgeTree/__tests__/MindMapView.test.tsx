import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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

const balancedData: KnowledgeTreeNode[] = [
  {
    key: '1',
    title: 'Root',
    code: '1',
    importanceLevel: 'A',
    children: [
      {
        key: '1.1',
        title: 'Left Child',
        code: '1.1',
        importanceLevel: 'A',
        isLeaf: true,
        data: { id: 'kp-1', textbookId: 'tb-1', code: '1.1', level1: '1', importanceLevel: 'A' },
      },
      {
        key: '1.2',
        title: 'Right Child',
        code: '1.2',
        importanceLevel: 'A',
        isLeaf: true,
        data: { id: 'kp-2', textbookId: 'tb-1', code: '1.2', level1: '1', importanceLevel: 'A' },
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
      <MindMapView data={mockData} layoutMode="tree" onLayoutModeChange={onLayoutModeChange} />
    )
    // The Select component renders with the current value
    expect(screen.getByTestId('layout-selector')).toBeInTheDocument()
  })

  it('renders single expand button in tree mode', () => {
    const { container } = render(<MindMapView data={mockData} layoutMode="tree" />)
    const circles = container.querySelectorAll('circle[r="8"]')
    // Tree mode: root has 1 child, so 1 expand button
    expect(circles.length).toBe(1)
  })

  it('renders dual expand buttons in balanced mode for nodes with both sides', () => {
    const { container } = render(<MindMapView data={balancedData} layoutMode="balanced" />)
    const circles = container.querySelectorAll('circle[r="8"]')
    // Balanced mode with 2 children: 1 left + 1 right, so 2 buttons
    expect(circles.length).toBe(2)
  })

  it('left and right buttons toggle independently in balanced mode', () => {
    const { container } = render(<MindMapView data={balancedData} layoutMode="balanced" />)
    const circles = container.querySelectorAll('circle[r="8"]')
    expect(circles.length).toBe(2)

    // Both buttons initially show '-' (expanded)
    const texts = container.querySelectorAll('circle[r="8"] + text')
    expect(texts[0].textContent).toBe('-')
    expect(texts[1].textContent).toBe('-')

    // Click left button (first circle)
    fireEvent.click(circles[0])
    // Left should now show '+', right should still show '-'
    expect(texts[0].textContent).toBe('+')
    expect(texts[1].textContent).toBe('-')

    // Click right button (second circle)
    fireEvent.click(circles[1])
    // Both should now show '+'
    expect(texts[0].textContent).toBe('+')
    expect(texts[1].textContent).toBe('+')

    // Click left button again to expand
    fireEvent.click(circles[0])
    // Left should show '-', right should still show '+'
    expect(texts[0].textContent).toBe('-')
    expect(texts[1].textContent).toBe('+')
  })

  it('expand all button expands both sides', () => {
    const { container } = render(<MindMapView data={balancedData} layoutMode="balanced" />)
    const circles = container.querySelectorAll('circle[r="8"]')
    const texts = container.querySelectorAll('circle[r="8"] + text')

    // Click left button to collapse
    fireEvent.click(circles[0])
    expect(texts[0].textContent).toBe('+')

    // Click expand all
    const expandButton = screen.getByText('Expand')
    fireEvent.click(expandButton)

    // Both should be expanded
    expect(texts[0].textContent).toBe('-')
    expect(texts[1].textContent).toBe('-')
  })

  it('collapse all button collapses both sides', () => {
    const { container } = render(<MindMapView data={balancedData} layoutMode="balanced" />)
    const texts = container.querySelectorAll('circle[r="8"] + text')

    // Click collapse all
    const collapseButton = screen.getByText('Collapse')
    fireEvent.click(collapseButton)

    // Both should be collapsed
    expect(texts[0].textContent).toBe('+')
    expect(texts[1].textContent).toBe('+')
  })
})
