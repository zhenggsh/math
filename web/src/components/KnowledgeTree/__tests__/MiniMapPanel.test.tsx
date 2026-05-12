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

const defaultProps = {
  svgWidth: 400,
  svgHeight: 300,
  translate: { x: 0, y: 0 } as { x: number; y: number },
  scale: 1,
  containerWidth: 800,
  containerHeight: 600,
  onNavigate: vi.fn(),
}

describe('MiniMapPanel', () => {
  it('renders expanded state initially', () => {
    render(<MiniMapPanel layout={mockLayout} {...defaultProps} />)
    expect(screen.getByTestId('mini-map-panel')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByTestId('mini-map-svg')).toBeInTheDocument()
  })

  it('calls onNavigate with correct coordinates when clicked', () => {
    const onNavigate = vi.fn()
    render(<MiniMapPanel layout={mockLayout} {...defaultProps} onNavigate={onNavigate} />)
    const svg = screen.getByTestId('mini-map-svg')
    const getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 200,
      height: 150,
      top: 0,
      left: 0,
      bottom: 150,
      right: 200,
      toJSON: () => {},
    }))
    svg.getBoundingClientRect = getBoundingClientRect
    fireEvent.click(svg, { clientX: 100, clientY: 75 })
    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(onNavigate).toHaveBeenCalledWith(200, 150)
  })

  it('toggles collapse and expand', () => {
    render(<MiniMapPanel layout={mockLayout} {...defaultProps} />)
    const button = screen.getByRole('button')

    expect(screen.queryByTestId('mini-map-svg')).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.queryByTestId('mini-map-svg')).not.toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.queryByTestId('mini-map-svg')).toBeInTheDocument()
  })

  it('renders without errors when layout is empty', () => {
    render(<MiniMapPanel layout={[]} {...defaultProps} />)
    expect(screen.getByTestId('mini-map-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('mini-map-svg')).toBeInTheDocument()
  })
})
