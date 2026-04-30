import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StudentAnalyticsPage from './StudentAnalyticsPage'
import * as analyticsService from '../../services/analytics.service'

vi.mock('../../services/analytics.service', () => ({
  getStudentOverview: vi.fn(),
  getMasteryDistribution: vi.fn(),
  getLearningTrend: vi.fn(),
  getWeakPoints: vi.fn(),
}))

vi.mock('../../components/features/analytics', () => ({
  PieChart: function MockPieChart(props: {
    data?: Array<{ name: string; value: number }>
  }): React.ReactElement {
    return React.createElement('div', { 'data-testid': 'pie-chart' }, JSON.stringify(props.data))
  },
  LineChart: function MockLineChart(): React.ReactElement {
    return React.createElement('div', { 'data-testid': 'line-chart' })
  },
}))

describe('StudentAnalyticsPage', () => {
  const mockOverview = {
    totalLearningCount: 42,
    totalDurationMinutes: 360,
    uniqueKnowledgePoints: 15,
  }

  const mockMasteryDistribution = {
    distribution: [
      { level: 'A' as const, count: 5, percentage: 33.3 },
      { level: 'B' as const, count: 3, percentage: 20 },
      { level: 'C' as const, count: 4, percentage: 26.7 },
      { level: 'D' as const, count: 2, percentage: 13.3 },
      { level: 'E' as const, count: 1, percentage: 6.7 },
    ],
  }

  const mockLearningTrend = {
    trend: [
      { date: '2024-03-01', durationMinutes: 30, count: 2 },
      { date: '2024-03-02', durationMinutes: 45, count: 3 },
    ],
  }

  const mockWeakPoints = {
    weakPoints: [
      {
        knowledgePointId: 'kp-1',
        code: '1.1.1',
        name: '集合的含义',
        importanceLevel: 'A' as const,
        lastMasteryLevel: 'D' as const,
        lastLearningDate: '2024-03-15T10:00:00Z',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(analyticsService.getStudentOverview as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockOverview
    )
    ;(analyticsService.getMasteryDistribution as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockMasteryDistribution
    )
    ;(analyticsService.getLearningTrend as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockLearningTrend
    )
    ;(analyticsService.getWeakPoints as ReturnType<typeof vi.fn>).mockResolvedValue(mockWeakPoints)
  })

  it('renders loading state with Spin', () => {
    ;(analyticsService.getStudentOverview as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )
    ;(analyticsService.getMasteryDistribution as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )
    ;(analyticsService.getLearningTrend as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )
    ;(analyticsService.getWeakPoints as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )

    render(<StudentAnalyticsPage />)
    expect(screen.getByText('加载分析数据...')).toBeInTheDocument()
  })

  it('displays overview cards with correct data', async () => {
    render(<StudentAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
    expect(screen.getByText('总学习次数')).toBeInTheDocument()
    expect(screen.getByText('360')).toBeInTheDocument()
    expect(screen.getByText('总学习时长')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('已学知识点')).toBeInTheDocument()
  })

  it('renders pie chart with data', async () => {
    render(<StudentAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  it('renders empty state when no data', async () => {
    ;(analyticsService.getStudentOverview as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalLearningCount: 0,
      totalDurationMinutes: 0,
      uniqueKnowledgePoints: 0,
    })
    ;(analyticsService.getMasteryDistribution as ReturnType<typeof vi.fn>).mockResolvedValue({
      distribution: [],
    })
    ;(analyticsService.getLearningTrend as ReturnType<typeof vi.fn>).mockResolvedValue({
      trend: [],
    })
    ;(analyticsService.getWeakPoints as ReturnType<typeof vi.fn>).mockResolvedValue({
      weakPoints: [],
    })

    render(<StudentAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getAllByText('暂无数据').length).toBe(2)
    })
    expect(screen.getByText('太棒了！没有薄弱知识点')).toBeInTheDocument()
  })
})
