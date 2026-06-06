import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  smartLearningApi,
  type WeakPointItem,
  type ByImportanceItem,
} from '../services/smartLearningApi'
import type { KnowledgePoint } from '../types/knowledge.types'

export type RecommendationMode = 'weak' | 'importance' | 'random'

export interface UnifiedRecommendationItem {
  id: string
  code: string
  level1: string
  level2?: string
  level3?: string
  importanceLevel: 'A' | 'B' | 'C'
  definition?: string
  name: string
  masteryLevel?: 'A' | 'B' | 'C' | 'D' | 'E'
  daysSinceLastStudy?: number
  recommendationReason?: string
  improvementVelocity?: number
  isMastered?: boolean
}

const QUERY_KEY = 'recommendations'

function buildName(level1: string, level2?: string, level3?: string): string {
  return [level1, level2, level3].filter(Boolean).join(' > ')
}

function computeDaysSinceLastStudy(startTime: string): number {
  return Math.ceil((Date.now() - new Date(startTime).getTime()) / (1000 * 60 * 60 * 24))
}

function toUnifiedWeakItem(item: WeakPointItem): UnifiedRecommendationItem {
  const { knowledgePoint, learningRecord, recommendationReason } = item
  return {
    id: knowledgePoint.id,
    code: knowledgePoint.code,
    level1: knowledgePoint.level1,
    level2: knowledgePoint.level2,
    level3: knowledgePoint.level3,
    importanceLevel: knowledgePoint.importanceLevel,
    definition: knowledgePoint.definition,
    name: buildName(knowledgePoint.level1, knowledgePoint.level2, knowledgePoint.level3),
    masteryLevel: learningRecord.masteryLevel,
    daysSinceLastStudy: computeDaysSinceLastStudy(learningRecord.startTime),
    recommendationReason,
    improvementVelocity: item.improvementVelocity,
  }
}

function toUnifiedImportanceItem(item: ByImportanceItem): UnifiedRecommendationItem {
  return {
    id: item.id,
    code: item.code,
    level1: item.level1,
    level2: item.level2,
    level3: item.level3,
    importanceLevel: item.importanceLevel,
    definition: item.definition,
    name: buildName(item.level1, item.level2, item.level3),
    masteryLevel: item.learningRecord?.masteryLevel,
    daysSinceLastStudy: item.learningRecord
      ? computeDaysSinceLastStudy(item.learningRecord.startTime)
      : undefined,
    recommendationReason: item.recommendationReason,
    improvementVelocity: item.improvementVelocity,
    isMastered: item.isMastered,
  }
}

function toUnifiedRandomItem(item: KnowledgePoint): UnifiedRecommendationItem {
  return {
    id: item.id,
    code: item.code,
    level1: item.level1,
    level2: item.level2,
    level3: item.level3,
    importanceLevel: item.importanceLevel,
    definition: item.definition,
    name: buildName(item.level1, item.level2, item.level3),
  }
}

export function useRecommendations(mode: RecommendationMode) {
  const queryResult = useQuery({
    queryKey: [QUERY_KEY, mode],
    queryFn: async () => {
      if (mode === 'weak') {
        const response = await smartLearningApi.getWeakPoints()
        return response.items.map(toUnifiedWeakItem)
      }
      if (mode === 'importance') {
        const response = await smartLearningApi.getByImportance()
        return response.items.map(toUnifiedImportanceItem)
      }
      const response = await smartLearningApi.getRandomPoints()
      return response.items.map(toUnifiedRandomItem)
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    items: queryResult.data ?? [],
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
  }
}

export function useRefreshRecommendations() {
  const queryClient = useQueryClient()

  return {
    refresh: (mode?: RecommendationMode) => {
      if (mode) {
        void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, mode] })
      } else {
        void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      }
    },
  }
}
