import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { getTextbook, expandTextbook, validateTextbook } from '../../../services/textbook.service'
import { knowledgeApi } from '../../../services/knowledgeApi'
import type { TextbookDetail, ExpandResult, ValidationReport } from '../../../types/textbook.types'
import type { KnowledgePoint } from '../../../types/knowledge.types'

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) {
      return response.data.message
    }
  }
  return err instanceof Error ? err.message : fallback
}

interface UseTextbookDetailReturn {
  textbook: TextbookDetail | null
  knowledgePoints: KnowledgePoint[]
  loading: boolean
  error: string | null
  expanding: boolean
  expandError: string | null
  validating: boolean
  validationResult: ValidationReport | null
  validationError: string | null
  fetchTextbook: () => Promise<void>
  expand: (frameworkFile: File, contentFile: File) => Promise<ExpandResult | null>
  validate: (frameworkFile: File, contentFile: File) => Promise<ValidationReport | null>
  resetValidation: () => void
}

export const useTextbookDetail = (id: string): UseTextbookDetailReturn => {
  const [textbook, setTextbook] = useState<TextbookDetail | null>(null)
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanding, setExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationReport | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const fetchTextbook = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, points] = await Promise.all([getTextbook(id), knowledgeApi.getKnowledgeTree(id)])
      setTextbook(data)
      setKnowledgePoints(points)
    } catch (err) {
      const message = extractErrorMessage(err, '加载教材详情失败')
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
        if (result.success && result.data) {
          message.success(`成功扩充 ${result.data.count} 个知识点`)
        }
        return result
      } catch (err) {
        const message = extractErrorMessage(err, '扩充失败')
        setExpandError(message)
        return null
      } finally {
        setExpanding(false)
      }
    },
    [id]
  )

  const validate = useCallback(
    async (frameworkFile: File, contentFile: File): Promise<ValidationReport | null> => {
      setValidating(true)
      setValidationResult(null)
      setValidationError(null)
      try {
        const report = await validateTextbook(id, frameworkFile, contentFile)
        setValidationResult(report)
        return report
      } catch (err) {
        const message = extractErrorMessage(err, '校验失败')
        setValidationError(message)
        return null
      } finally {
        setValidating(false)
      }
    },
    [id]
  )

  const resetValidation = useCallback(() => {
    setValidating(false)
    setValidationResult(null)
    setValidationError(null)
  }, [])

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
    validating,
    validationResult,
    validationError,
    fetchTextbook,
    expand,
    validate,
    resetValidation,
  }
}
