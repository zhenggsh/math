import React from 'react'
import { render, screen } from '@testing-library/react'
import { TextbookDimensionTab } from '../TextbookDimensionTab'
import type { TextbookSummary } from '../../../types/analytics.types'

vi.mock('../../features/analytics/EChartsWrapper', () => ({
  EChartsWrapper: () => <div data-testid="echarts-wrapper" />,
}))

const mockSummary: TextbookSummary = {
  textbookId: 'tb-1',
  textbookName: 'Test Book',
  totalKnowledgePoints: 10,
  learnedKnowledgePoints: 6,
  unlearnedKnowledgePoints: 4,
  masteryDistribution: [
    { level: 'A', count: 2, percentage: 33.3 },
    { level: 'B', count: 2, percentage: 33.3 },
    { level: 'C', count: 2, percentage: 33.3 },
    { level: 'D', count: 0, percentage: 0 },
    { level: 'E', count: 0, percentage: 0 },
  ],
  importanceDistribution: [
    { level: 'A', count: 4 },
    { level: 'B', count: 3 },
    { level: 'C', count: 3 },
  ],
}

it('renders overview stats', () => {
  render(<TextbookDimensionTab data={mockSummary} loading={false} />)
  expect(screen.getByText('10')).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
  expect(screen.getByText('4')).toBeInTheDocument()
})

it('renders empty state when no mastery data', () => {
  render(
    <TextbookDimensionTab data={{ ...mockSummary, masteryDistribution: [] }} loading={false} />
  )
  expect(screen.getByText('暂无已学知识点')).toBeInTheDocument()
})
