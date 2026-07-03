import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudyAgentPanel } from '../StudyAgentPanel'
import type {
  CreateSessionRequest,
  StudySession,
  StudyMessage,
} from '../../../types/study-agent.types'

const mocks = vi.hoisted(() => ({
  mockCreateSession: vi.fn<(data: CreateSessionRequest) => Promise<StudySession>>(),
  mockSendMessage: vi.fn<(sessionId: string, content: string) => Promise<StudyMessage>>(),
}))

vi.mock('../../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: mocks.mockCreateSession,
    sendMessage: mocks.mockSendMessage,
  },
}))

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function renderWithQueryClient(component: React.ReactElement): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>{component}</QueryClientProvider>
  )
}

describe('StudyAgentPanel', () => {
  beforeEach(() => {
    mocks.mockCreateSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      knowledgePointId: 'kp-1',
      title: '导数',
      messages: [],
      createdAt: '2026-07-03T00:00:00.000Z',
    } as StudySession)
  })

  it('renders knowledge point title after opening', async () => {
    renderWithQueryClient(
      <StudyAgentPanel
        open={true}
        onClose={vi.fn()}
        knowledgePointId="kp-1"
        knowledgePointTitle="导数"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('导数')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/你好！我是你的 AI 学习助手/)).toBeInTheDocument()
    })

    expect(mocks.mockCreateSession).toHaveBeenCalledWith({
      knowledgePointId: 'kp-1',
      knowledgePointTitle: '导数',
    })
  })

  it('calls sendMessage when a starter question chip is clicked', async () => {
    renderWithQueryClient(
      <StudyAgentPanel
        open={true}
        onClose={vi.fn()}
        knowledgePointId="kp-1"
        knowledgePointTitle="导数"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('什么是导数？')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('什么是导数？'))

    await waitFor(() => {
      expect(mocks.mockSendMessage).toHaveBeenCalledWith('session-1', '什么是导数？')
    })
  })

  it('renders starter questions based on title', async () => {
    renderWithQueryClient(
      <StudyAgentPanel
        open={true}
        onClose={vi.fn()}
        knowledgePointId="kp-1"
        knowledgePointTitle="导数"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('什么是导数？')).toBeInTheDocument()
    })

    expect(screen.getByText('学习导数时有哪些常见易错点？')).toBeInTheDocument()
    expect(screen.getByText('请给我一些导数的练习题')).toBeInTheDocument()
  })

  it('calls sendMessage when sending a message via ChatInput', async () => {
    mocks.mockSendMessage.mockResolvedValue({
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'agent',
      content: '导数描述函数在某一点处的变化率。',
      followUps: [],
      feedback: null,
      createdAt: '2026-07-03T00:00:01.000Z',
    } as StudyMessage)

    renderWithQueryClient(
      <StudyAgentPanel
        open={true}
        onClose={vi.fn()}
        knowledgePointId="kp-1"
        knowledgePointTitle="导数"
      />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('请输入问题...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('请输入问题...')
    fireEvent.change(input, { target: { value: '什么是导数？' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    await waitFor(() => {
      expect(mocks.mockSendMessage).toHaveBeenCalledWith('session-1', '什么是导数？')
    })
  })

  it('renders an error alert when session creation fails', async () => {
    mocks.mockCreateSession.mockRejectedValueOnce(new Error('创建会话失败'))

    renderWithQueryClient(
      <StudyAgentPanel
        open={true}
        onClose={vi.fn()}
        knowledgePointId="kp-1"
        knowledgePointTitle="导数"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('请求失败')).toBeInTheDocument()
    })
  })
})
