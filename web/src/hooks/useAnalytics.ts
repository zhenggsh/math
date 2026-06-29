import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
  getLearnedKnowledgePoints,
  getTextbookSummary,
  getKnowledgePointProgress,
} from '../services/analytics.service'
import type {
  StudentOverview,
  MasteryDistribution,
  LearningTrend,
  WeakPoints,
  LearnedKnowledgePoints,
  TextbookSummary,
  KnowledgePointProgress,
} from '../types/analytics.types'

export function useTextbookSummary(
  textbookId: string | undefined
): UseQueryResult<TextbookSummary, Error> {
  return useQuery({
    queryKey: ['analytics', 'textbook-summary', textbookId],
    queryFn: () => {
      if (!textbookId) {
        throw new Error('textbookId is required')
      }
      return getTextbookSummary(textbookId)
    },
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStudentOverview(
  textbookId: string | undefined
): UseQueryResult<StudentOverview, Error> {
  return useQuery({
    queryKey: ['analytics', 'overview', textbookId],
    queryFn: () => getStudentOverview(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMasteryDistribution(
  textbookId: string | undefined
): UseQueryResult<MasteryDistribution, Error> {
  return useQuery({
    queryKey: ['analytics', 'mastery-distribution', textbookId],
    queryFn: () => getMasteryDistribution(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearningTrend(
  days: number,
  textbookId: string | undefined
): UseQueryResult<LearningTrend, Error> {
  return useQuery({
    queryKey: ['analytics', 'learning-trend', days, textbookId],
    queryFn: () => getLearningTrend(days, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useWeakPoints(textbookId: string | undefined): UseQueryResult<WeakPoints, Error> {
  return useQuery({
    queryKey: ['analytics', 'weak-points', textbookId],
    // Request a generous limit so the UI can display all weak points for the selected textbook.
    queryFn: () => getWeakPoints(50, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearnedKnowledgePoints(
  textbookId: string | undefined
): UseQueryResult<LearnedKnowledgePoints, Error> {
  return useQuery({
    queryKey: ['analytics', 'learned-knowledge-points', textbookId],
    queryFn: () => getLearnedKnowledgePoints(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useKnowledgePointProgress(
  knowledgePointId: string | undefined
): UseQueryResult<KnowledgePointProgress, Error> {
  return useQuery({
    queryKey: ['analytics', 'knowledge-point-progress', knowledgePointId],
    queryFn: () => {
      if (!knowledgePointId) {
        throw new Error('knowledgePointId is required')
      }
      return getKnowledgePointProgress(knowledgePointId)
    },
    enabled: Boolean(knowledgePointId),
    staleTime: 5 * 60 * 1000,
  })
}
