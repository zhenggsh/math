import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { KnowledgePointDimensionTab } from '../KnowledgePointDimensionTab'
import type { LearnedKnowledgePoints, WeakPoints } from '../../../types/analytics.types'

vi.mock('../../features/analytics/EChartsWrapper', () => ({
  EChartsWrapper: () => <div data-testid="echarts-wrapper" />,
}))

const mockLearned: LearnedKnowledgePoints = {
  learnedKnowledgePoints: [
    {
      knowledgePointId: 'kp-1',
      code: '1.1',
      name: 'A',
      lastMasteryLevel: 'E',
      lastLearningDate: '2026-06-01',
      lastTwoMasteryLevels: ['D', 'E'],
    },
    {
      knowledgePointId: 'kp-2',
      code: '1.2',
      name: 'B',
      lastMasteryLevel: 'A',
      lastLearningDate: '2026-06-02',
      lastTwoMasteryLevels: ['B', 'A'],
    },
  ],
}

const mockWeak: WeakPoints = {
  weakPoints: [
    {
      knowledgePointId: 'kp-1',
      code: '1.1',
      name: 'A',
      importanceLevel: 'A',
      lastMasteryLevel: 'E',
      lastLearningDate: '2026-06-01',
    },
  ],
}

function LocationDisplay(): React.JSX.Element {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

it('navigates to smart-learning on 去学习 click', () => {
  render(
    <MemoryRouter>
      <KnowledgePointDimensionTab
        learned={mockLearned}
        weakPoints={mockWeak}
        progress={null}
        loading={false}
        progressLoading={false}
        selectedId="kp-1"
        onSelect={vi.fn()}
      />
      <LocationDisplay />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByText('去学习'))
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/smart-learning?focusKnowledgePointId=kp-1'
  )
})
