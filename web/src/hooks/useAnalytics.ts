import { useQuery } from '@tanstack/react-query'
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
  getLearnedKnowledgePoints,
  getTextbookSummary,
  getKnowledgePointProgress,
} from '../services/analytics.service'

export function useTextbookSummary(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'textbook-summary', textbookId],
    queryFn: () => getTextbookSummary(textbookId!),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStudentOverview(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'overview', textbookId],
    queryFn: () => getStudentOverview(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMasteryDistribution(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'mastery-distribution', textbookId],
    queryFn: () => getMasteryDistribution(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearningTrend(days: number, textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'learning-trend', textbookId, days],
    queryFn: () => getLearningTrend(days, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useWeakPoints(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'weak-points', textbookId],
    queryFn: () => getWeakPoints(50, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearnedKnowledgePoints(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'learned-knowledge-points', textbookId],
    queryFn: () => getLearnedKnowledgePoints(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useKnowledgePointProgress(knowledgePointId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'knowledge-point-progress', knowledgePointId],
    queryFn: () => getKnowledgePointProgress(knowledgePointId!),
    enabled: Boolean(knowledgePointId),
    staleTime: 5 * 60 * 1000,
  })
}
