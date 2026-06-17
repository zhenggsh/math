import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BehaviorDimensionTab } from '../BehaviorDimensionTab'
import type { LearningTrend } from '../../../types/analytics.types'

vi.mock('../../features/analytics/EChartsWrapper', () => ({
  EChartsWrapper: () => <div data-testid="echarts-wrapper" />,
}))

const mockTrend: LearningTrend = {
  trend: [
    { date: '2026-06-15', durationMinutes: 30, count: 1 },
    { date: '2026-06-16', durationMinutes: 45, count: 2 },
  ],
}

it('switches days range', () => {
  const onDaysChange = vi.fn()
  render(
    <BehaviorDimensionTab data={mockTrend} loading={false} days={30} onDaysChange={onDaysChange} />
  )
  fireEvent.click(screen.getByText('近7天'))
  expect(onDaysChange).toHaveBeenCalledWith(7)
})

it('shows empty state when no data', () => {
  render(
    <BehaviorDimensionTab data={{ trend: [] }} loading={false} days={7} onDaysChange={vi.fn()} />
  )
  expect(screen.getByText('该时间段暂无学习记录')).toBeInTheDocument()
})
