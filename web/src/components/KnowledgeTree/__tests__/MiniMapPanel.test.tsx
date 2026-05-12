import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MiniMapPanel } from '../MiniMapPanel'
import type { MindMapNodeLayout } from '../types'

const mockLayout: MindMapNodeLayout[] = [
  {
    id: 'root',
    x: 100,
    y: 100,
    width: 140,
    height: 40,
    data: { key: 'root', title: 'Root', code: '1', importanceLevel: 'A', data: { id: '1', textbookId: 't' } },
    depth: 0,
  },
]

describe('MiniMapPanel', () => {
  it('renders expanded state initially', () => {
    const { container } = render(
      <MiniMapPanel
        layout={mockLayout}
        svgWidth={400}
        svgHeight={300}
        translate={{ x: 0, y: 0 }}
        scale={1}
        containerWidth={800}
        containerHeight={600}
        onNavigate={vi.fn()}
      />
    )
    expect(container.querySelector('[data-testid="mini-map-panel"]')).toBeTruthy()
  })

  it('calls onNavigate when clicked', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MiniMapPanel
        layout={mockLayout}
        svgWidth={400}
        svgHeight={300}
        translate={{ x: 0, y: 0 }}
        scale={1}
        containerWidth={800}
        containerHeight={600}
        onNavigate={onNavigate}
      />
    )
    const svg = container.querySelector('svg')
    if (svg) fireEvent.click(svg)
    // onNavigate should have been called
    expect(onNavigate).toHaveBeenCalled()
  })
})
