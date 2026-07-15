import { useState, useEffect, useCallback } from 'react'
import { getTextbook, expandTextbook } from '../../../services/textbook.service'
import { knowledgeApi } from '../../../services/knowledgeApi'
import type { TextbookDetail, ExpandResult } from '../../../types/textbook.types'
import type { KnowledgePoint } from '../../../types/knowledge.types'

interface UseTextbookDetailReturn {
  textbook: TextbookDetail | null
  knowledgePoints: KnowledgePoint[]
  loading: boolean
  error: string | null
  expanding: boolean
  expandError: string | null
  fetchTextbook: () => Promise<void>
  expand: (frameworkFile: File, contentFile: File) => Promise<ExpandResult | null>
}

export const useTextbookDetail = (id: string): UseTextbookDetailReturn => {
  const [textbook, setTextbook] = useState<TextbookDetail | null>(null)
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanding, setExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)

  const fetchTextbook = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, points] = await Promise.all([getTextbook(id), knowledgeApi.getKnowledgeTree(id)])
      setTextbook(data)
      setKnowledgePoints(points)
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载教材详情失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const expand = useCallback(
    async (frameworkFile: File, contentFile: File): Promise<ExpandResult | null> => {
      setExpanding(true)
      setExpandError(null)
      try {
        const result = await expandTextbook(id, frameworkFile, contentFile)
        await fetchTextbook()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : '扩充失败'
        setExpandError(message)
        return null
      } finally {
        setExpanding(false)
      }
    },
    [id, fetchTextbook]
  )

  useEffect(() => {
    void fetchTextbook()
  }, [fetchTextbook])

  return {
    textbook,
    knowledgePoints,
    loading,
    error,
    expanding,
    expandError,
    fetchTextbook,
    expand,
  }
}
