import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useRecommendations, useRefreshRecommendations } from '../useRecommendations'
import { smartLearningApi } from '../../services/smartLearningApi'

const mockGetWeakPoints = vi.fn()
const mockGetByImportance = vi.fn()
const mockGetRandomPoints = vi.fn()

vi.mock('../../services/smartLearningApi', () => ({
  smartLearningApi: {
    getWeakPoints: (...args: unknown[]) => mockGetWeakPoints(...args),
    getByImportance: (...args: unknown[]) => mockGetByImportance(...args),
    getRandomPoints: (...args: unknown[]) => mockGetRandomPoints(...args),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return unified items for weak mode with improvementVelocity and daysSinceLastStudy', async () => {
    const startTime = '2024-01-01T00:00:00.000Z'
    const mockNow = new Date('2024-01-03T00:00:00.000Z').getTime()
    vi.spyOn(Date, 'now').mockReturnValue(mockNow)

    mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [
        {
          knowledgePoint: {
            id: 'kp-1',
            code: '1.1',
            level1: 'Algebra',
            level2: 'Equations',
            level3: 'Linear',
            importanceLevel: 'A',
            definition: 'Linear equations',
            textbookId: 'tb-1',
          },
          learningRecord: {
            id: 'lr-1',
            masteryLevel: 'C',
            durationMinutes: 30,
            startTime,
            notes: null,
          },
          priority: 1,
          recommendationReason: 'Needs practice',
          improvementVelocity: 0.5,
        },
      ],
    })

    const { result } = renderHook(() => useRecommendations('weak'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      id: 'kp-1',
      code: '1.1',
      name: 'Algebra > Equations > Linear',
      masteryLevel: 'C',
      recommendationReason: 'Needs practice',
      improvementVelocity: 0.5,
      daysSinceLastStudy: 2,
    })
  })

  it('should return empty array for random mode when no items', async () => {
    mockGetRandomPoints.mockResolvedValue({
      items: [],
    })

    const { result } = renderHook(() => useRecommendations('random'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toEqual([])
  })

  it('should return unified items for importance mode', async () => {
    mockGetByImportance.mockResolvedValue({
      level: 'A',
      total: 1,
      items: [
        {
          id: 'kp-2',
          code: '2.1',
          level1: 'Geometry',
          level2: 'Shapes',
          level3: 'Triangles',
          importanceLevel: 'A',
          definition: 'Triangle basics',
          textbookId: 'tb-1',
          isMastered: false,
          learningRecord: null,
          recommendationReason: 'Important topic',
          improvementVelocity: 0.8,
        },
      ],
    })

    const { result } = renderHook(() => useRecommendations('importance'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      id: 'kp-2',
      code: '2.1',
      name: 'Geometry > Shapes > Triangles',
      isMastered: false,
      recommendationReason: 'Important topic',
      improvementVelocity: 0.8,
    })
  })
})

describe('useRefreshRecommendations', () => {
  it('should provide a refresh function', () => {
    const { result } = renderHook(() => useRefreshRecommendations(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.refresh).toBe('function')
  })
})
