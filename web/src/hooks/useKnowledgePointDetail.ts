import { useQuery } from '@tanstack/react-query'
import { knowledgeApi } from '../services/knowledgeApi'
import type { KnowledgePointDetail } from '../types/knowledge.types'

export function useKnowledgePointDetail(knowledgePointId: string | undefined) {
  return useQuery<KnowledgePointDetail>({
    queryKey: ['knowledgePointDetail', knowledgePointId],
    queryFn: () => knowledgeApi.getKnowledgePointDetail(knowledgePointId!),
    enabled: !!knowledgePointId,
    staleTime: 5 * 60 * 1000,
  })
}
