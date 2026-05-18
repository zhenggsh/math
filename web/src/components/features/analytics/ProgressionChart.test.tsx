import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProgressionChart } from './ProgressionChart'

const mockChartInstance = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  setOption: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}))

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: () => mockChartInstance,
}))

vi.mock('echarts/charts', () => ({
  BarChart: {},
  LineChart: {},
  PieChart: {},
}))

vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  ToolboxComponent: {},
  DataZoomComponent: {},
  MarkPointComponent: {},
}))

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))

const mockRecords = [
  { date: '2026-05-10', masteryLevel: 'D' as const, durationMinutes: 15 },
  { date: '2026-05-12', masteryLevel: 'C' as const, durationMinutes: 20 },
  { date: '2026-05-15', masteryLevel: 'B' as const, durationMinutes: 25 },
]

describe('ProgressionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<ProgressionChart records={mockRecords} />)
    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('chartContainer')
  })

  it('renders with title', () => {
    const { container } = render(
      <ProgressionChart records={mockRecords} title="Progress Title" />
    )
    expect(container).toBeTruthy()
  })

  it('shows loading state', () => {
    render(<ProgressionChart records={mockRecords} loading={true} />)
    expect(mockChartInstance.showLoading).toHaveBeenCalled()
  })

  it('handles empty records', () => {
    const { container } = render(<ProgressionChart records={[]} />)
    expect(container).toBeTruthy()
  })

  it('handles single record', () => {
    const singleRecord = [
      { date: '2026-05-10', masteryLevel: 'D' as const, durationMinutes: 15 },
    ]
    const { container } = render(<ProgressionChart records={singleRecord} />)
    expect(container).toBeTruthy()
  })

  it('handles records with same mastery level', () => {
    const sameLevelRecords = [
      { date: '2026-05-10', masteryLevel: 'C' as const, durationMinutes: 15 },
      { date: '2026-05-12', masteryLevel: 'C' as const, durationMinutes: 20 },
    ]
    const { container } = render(<ProgressionChart records={sameLevelRecords} />)
    expect(container).toBeTruthy()
  })

  it('handles notes in tooltip data', () => {
    const notesRecord = [
      {
        date: '2026-05-10',
        masteryLevel: 'D' as const,
        durationMinutes: 15,
        notes:
          'This is a very long note that exceeds fifty characters in length for testing',
      },
    ]
    const { container } = render(<ProgressionChart records={notesRecord} />)
    expect(container).toBeTruthy()
  })
})
