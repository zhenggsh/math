import { render, screen } from '@testing-library/react'
import { SummaryTab } from '../SummaryTab'
import type { TextbookSummary } from '../../../types/analytics.types'

const mockSummary: TextbookSummary = {
  textbookId: 'tb-1',
  textbookName: 'Test Book',
  totalKnowledgePoints: 10,
  learnedKnowledgePoints: 6,
  unlearnedKnowledgePoints: 4,
  masteryDistribution: [],
  importanceDistribution: [],
}

it('renders encouraging text when no weak points', () => {
  render(
    <SummaryTab
      summary={mockSummary}
      weakPoints={{ weakPoints: [] }}
      learningTrend={null}
      totalDurationMinutes={120}
      loading={false}
    />
  )
  expect(screen.getByText(/学习状态良好/)).toBeInTheDocument()
})
