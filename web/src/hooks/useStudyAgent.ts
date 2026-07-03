import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { studyAgentApi } from '../services/studyAgentApi'
import type { StudySession, StudyMessage } from '../types/study-agent.types'

export interface UseStudyAgentReturn {
  session: StudySession | null
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  isSending: boolean
  regenerate: (userMessageId: string) => Promise<void>
  isRegenerating: boolean
  submitFeedback: (messageId: string, feedback?: 'positive' | 'negative') => Promise<void>
}

const SESSION_QUERY_KEY = 'studySession'

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 429) {
      return '请求太频繁，请稍后再试'
    }
    if (status === 503) {
      return 'AI 助手暂时不可用，请稍后重试'
    }
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? '请求失败'
  }
  return '请求失败'
}

export function useStudyAgent(
  knowledgePointId: string,
  knowledgePointTitle: string
): UseStudyAgentReturn {
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = useState<string | null>(null)

  const sessionQuery = useQuery<StudySession, Error>({
    queryKey: [SESSION_QUERY_KEY, knowledgePointId],
    queryFn: async () => {
      return await studyAgentApi.createSession({
        knowledgePointId,
        knowledgePointTitle,
      })
    },
    enabled: Boolean(knowledgePointId),
    retry: false,
    staleTime: Infinity,
  })

  const handleError = useCallback((error: unknown): void => {
    setMutationError(getErrorMessage(error))
  }, [])

  const invalidateSession = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY, knowledgePointId] })
  }, [queryClient, knowledgePointId])

  const sendMessageMutation = useMutation<StudyMessage, Error, string>({
    mutationFn: async content => {
      if (!sessionQuery.data) {
        throw new Error('会话尚未创建')
      }
      return await studyAgentApi.sendMessage(sessionQuery.data.id, content)
    },
    onSuccess: () => {
      setMutationError(null)
      invalidateSession()
    },
    onError: handleError,
  })

  const regenerateMutation = useMutation<StudyMessage, Error, string>({
    mutationFn: async userMessageId => {
      return await studyAgentApi.regenerate(userMessageId)
    },
    onSuccess: () => {
      setMutationError(null)
      invalidateSession()
    },
    onError: handleError,
  })

  const submitFeedbackMutation = useMutation<
    void,
    Error,
    { messageId: string; feedback?: 'positive' | 'negative' }
  >({
    mutationFn: async ({ messageId, feedback }) => {
      return await studyAgentApi.updateFeedback(messageId, feedback)
    },
    onSuccess: () => {
      setMutationError(null)
      invalidateSession()
    },
    onError: handleError,
  })

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      setMutationError(null)
      try {
        await sendMessageMutation.mutateAsync(content)
      } catch {
        // Error is already handled by the mutation's onError and surfaced via error state
      }
    },
    [sendMessageMutation]
  )

  const regenerate = useCallback(
    async (userMessageId: string): Promise<void> => {
      setMutationError(null)
      try {
        await regenerateMutation.mutateAsync(userMessageId)
      } catch {
        // Error is already handled by the mutation's onError and surfaced via error state
      }
    },
    [regenerateMutation]
  )

  const submitFeedback = useCallback(
    async (messageId: string, feedback?: 'positive' | 'negative'): Promise<void> => {
      setMutationError(null)
      try {
        await submitFeedbackMutation.mutateAsync({ messageId, feedback })
      } catch {
        // Error is already handled by the mutation's onError and surfaced via error state
      }
    },
    [submitFeedbackMutation]
  )

  const error = sessionQuery.error ? getErrorMessage(sessionQuery.error) : mutationError

  return {
    session: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    error,
    sendMessage,
    isSending: sendMessageMutation.isPending,
    regenerate,
    isRegenerating: regenerateMutation.isPending,
    submitFeedback,
  }
}
