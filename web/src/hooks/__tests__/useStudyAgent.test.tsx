import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import axios from 'axios'
import { useStudyAgent } from '../useStudyAgent'
import { studyAgentApi } from '../../services/studyAgentApi'
import type { StudySession, StudyMessage } from '../../types/study-agent.types'

const { mockCreateSession, mockGetSession, mockSendMessage, mockUpdateFeedback, mockRegenerate } =
  vi.hoisted(() => ({
    mockCreateSession: vi.fn<unknown[], Promise<StudySession>>(),
    mockGetSession: vi.fn<unknown[], Promise<StudySession>>(),
    mockSendMessage: vi.fn<unknown[], Promise<StudyMessage>>(),
    mockUpdateFeedback: vi.fn<unknown[], Promise<StudyMessage>>(),
    mockRegenerate: vi.fn<unknown[], Promise<StudyMessage>>(),
  }))

vi.mock('../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: mockCreateSession,
    getSession: mockGetSession,
    sendMessage: mockSendMessage,
    updateFeedback: mockUpdateFeedback,
    regenerate: mockRegenerate,
  },
}))

const mockedStudyAgentApi = vi.mocked(studyAgentApi)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createAxiosError(status: number, message: string): axios.AxiosError {
  const error = new axios.AxiosError(message)
  error.response = {
    status,
    data: { message },
    headers: {},
    config: {} as never,
  }
  return error
}

describe('useStudyAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const session: StudySession = {
    id: 'session-1',
    userId: 'user-1',
    knowledgePointId: 'kp-1',
    title: 'Test Point',
    messages: [],
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  it('should create a session on mount', async () => {
    mockCreateSession.mockResolvedValue(session)

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.session).toEqual(session))
    expect(result.current.error).toBeNull()
  })

  it('should send a message and refresh the session', async () => {
    const agentMessage: StudyMessage = {
      id: 'msg-2',
      sessionId: session.id,
      role: 'agent',
      content: 'Answer',
      followUps: ['Follow up?'],
      feedback: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    mockCreateSession.mockResolvedValue(session)
    mockSendMessage.mockResolvedValue(agentMessage)
    mockCreateSession.mockResolvedValue({
      ...session,
      messages: [agentMessage],
    })

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    expect(mockSendMessage).toHaveBeenCalledWith(session.id, 'Hello')
  })

  it('should regenerate a response', async () => {
    const regeneratedMessage: StudyMessage = {
      id: 'msg-3',
      sessionId: session.id,
      role: 'agent',
      content: 'Regenerated answer',
      followUps: ['Another follow up?'],
      feedback: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    mockCreateSession.mockResolvedValue(session)
    mockRegenerate.mockResolvedValue(regeneratedMessage)

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.regenerate('msg-1')
    })

    expect(mockRegenerate).toHaveBeenCalledWith('msg-1')
  })

  it('should submit feedback', async () => {
    mockCreateSession.mockResolvedValue(session)
    mockUpdateFeedback.mockResolvedValue({
      id: 'msg-2',
      sessionId: session.id,
      role: 'agent',
      content: 'Answer',
      followUps: [],
      feedback: 'positive',
      createdAt: '2024-01-01T00:00:00.000Z',
    })

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.submitFeedback('msg-2', 'positive')
    })

    expect(mockUpdateFeedback).toHaveBeenCalledWith('msg-2', 'positive')
  })

  it('should map 429 errors to a rate-limit message', async () => {
    mockCreateSession.mockRejectedValue(createAxiosError(429, 'rate limit'))

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBe('请求太频繁，请稍后再试'))
  })

  it('should map 503 errors to an AI unavailable message', async () => {
    mockCreateSession.mockRejectedValue(createAxiosError(503, 'ai down'))

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBe('AI 助手暂时不可用，请稍后重试'))
  })

  it('should surface the backend error message for other failures', async () => {
    mockCreateSession.mockRejectedValue(createAxiosError(400, 'Invalid input'))

    const { result } = renderHook(() => useStudyAgent('kp-1', 'Test Point'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.error).toBe('Invalid input'))
  })

  it('should expose the mocked API module', () => {
    expect(mockedStudyAgentApi).toBeDefined()
  })
})
