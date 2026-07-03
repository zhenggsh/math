import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StudyAgentPanel } from '../StudyAgentPanel'
import { studyAgentApi } from '../../../services/studyAgentApi'
import type { StudySession } from '../../../types/study-agent.types'

vi.mock('../../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: vi.fn(),
  },
}))

const mockCreateSession = vi.mocked(studyAgentApi.createSession)

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
  return render(<QueryClientProvider client={createTestQueryClient()}>{component}</QueryClientProvider>)
}

describe('StudyAgentPanel', () => {
  beforeEach(() => {
    mockCreateSession.mockResolvedValue({
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

    expect(mockCreateSession).toHaveBeenCalledWith({
      knowledgePointId: 'kp-1',
      knowledgePointTitle: '导数',
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
})
