import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TeacherAnalyticsPage from './TeacherAnalyticsPage'
import * as analyticsService from '../../services/analytics.service'

vi.mock('../../services/analytics.service', () => ({
  getClassOverview: vi.fn(),
  getKnowledgeHeat: vi.fn(),
  getStudents: vi.fn(),
  getStudentComparison: vi.fn(),
  exportData: vi.fn(),
}))

vi.mock('../../components/features/analytics', () => ({
  BarChart: function MockBarChart(): React.ReactElement {
    return React.createElement('div', { 'data-testid': 'bar-chart' })
  },
  PieChart: function MockPieChart(): React.ReactElement {
    return React.createElement('div', { 'data-testid': 'pie-chart' })
  },
}))

describe('TeacherAnalyticsPage', () => {
  const mockClassOverview = {
    studentCount: 50,
    activeStudentCount: 42,
    avgLearningCount: 12.5,
    avgDurationMinutes: 180,
  }

  const mockKnowledgeHeat = {
    heatList: [
      {
        knowledgePointId: 'kp-1',
        code: '1.1.1',
        name: '集合的含义',
        learnCount: 45,
        uniqueStudentCount: 40,
      },
      {
        knowledgePointId: 'kp-2',
        code: '1.1.2',
        name: '集合的表示',
        learnCount: 38,
        uniqueStudentCount: 35,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(analyticsService.getClassOverview as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockClassOverview
    )
    ;(analyticsService.getKnowledgeHeat as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockKnowledgeHeat
    )
    ;(analyticsService.getStudents as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 's-1', name: '学生A' },
      { id: 's-2', name: '学生B' },
    ])
    ;(analyticsService.getStudentComparison as ReturnType<typeof vi.fn>).mockResolvedValue({
      students: [],
    })
  })

  it('renders loading state with Spin', () => {
    ;(analyticsService.getClassOverview as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )
    ;(analyticsService.getKnowledgeHeat as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )
    ;(analyticsService.getStudents as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {})
    )

    render(<TeacherAnalyticsPage />)
    expect(screen.getByText('加载分析数据...')).toBeInTheDocument()
  })

  it('renders class selector', async () => {
    render(<TeacherAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText('教学分析')).toBeInTheDocument()
    })
    expect(screen.getByText('选择班级')).toBeInTheDocument()
  })

  it('has export button', async () => {
    render(<TeacherAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText('教学分析')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /导出数据/i })).toBeInTheDocument()
  })

  it('displays overview cards with correct data', async () => {
    render(<TeacherAnalyticsPage />)
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
    })
    expect(screen.getByText('学生人数')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('活跃学生')).toBeInTheDocument()
    expect(screen.getByText('平均学习次数').closest('.ant-card')?.textContent).toContain('12.5')
    expect(screen.getByText('平均学习次数')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('平均学习时长')).toBeInTheDocument()
  })
})
