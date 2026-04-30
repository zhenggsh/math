import { useQuery, useQueryClient } from '@tanstack/react-query';
import { smartLearningApi } from '../services/smartLearningApi';

const QUERY_KEYS = {
  weakPoints: 'weakPoints',
  byImportance: 'byImportance',
  randomPoints: 'randomPoints',
  stats: 'learningStats',
};

/**
 * 获取薄弱知识点
 */
export function useWeakPoints(params?: { textbookId?: string; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.weakPoints, params],
    queryFn: () => smartLearningApi.getWeakPoints(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * 按重要性获取知识点
 */
export function useByImportance(params?: {
  level?: 'A' | 'B' | 'C';
  excludeMastered?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.byImportance, params],
    queryFn: () => smartLearningApi.getByImportance(params),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取随机知识点
 */
export function useRandomPoints(params?: { textbookId?: string; count?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.randomPoints, params],
    queryFn: () => smartLearningApi.getRandomPoints(params),
    staleTime: 0, // Random data should be fresh
    enabled: false, // Don't fetch automatically
  });
}

/**
 * 获取学习统计
 */
export function useLearningStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.stats],
    queryFn: () => smartLearningApi.getLearningStats(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 刷新所有智能学习数据
 */
export function useRefreshSmartLearning() {
  const queryClient = useQueryClient();

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.weakPoints] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.byImportance] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.randomPoints] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.stats] });
    },
    refreshWeakPoints: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.weakPoints] });
    },
    refreshByImportance: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.byImportance] });
    },
  };
}
