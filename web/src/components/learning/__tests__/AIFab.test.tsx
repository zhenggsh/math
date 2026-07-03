import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIFab } from '../AIFab'
import type { CreateSessionRequest, StudySession } from '../../../types/study-agent.types'

const mocks = vi.hoisted(() => ({
  mockCreateSession: vi.fn<(data: CreateSessionRequest) => Promise<StudySession>>(),
}))

vi.mock('../../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: mocks.mockCreateSession,
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

describe('AIFab', () => {
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

  it('renders floating button', () => {
    renderWithQueryClient(<AIFab knowledgePointId="kp-1" knowledgePointTitle="导数" />)

    expect(screen.getByRole('button', { name: /AI 助手/i })).toBeInTheDocument()
  })

  it('opens StudyAgentPanel when FAB is clicked', async () => {
    renderWithQueryClient(<AIFab knowledgePointId="kp-1" knowledgePointTitle="导数" />)

    const fab = screen.getByRole('button', { name: /AI 助手/i })
    fireEvent.click(fab)

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

  it('does not render panel when knowledge point info is missing', () => {
    renderWithQueryClient(<AIFab />)

    const fab = screen.getByRole('button', { name: /AI 助手/i })
    fireEvent.click(fab)

    expect(screen.queryByText('AI 助手')).not.toBeInTheDocument()
  })
})
