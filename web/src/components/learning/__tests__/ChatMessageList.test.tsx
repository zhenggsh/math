import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessageList } from '../ChatMessageList'
import type { StudyMessage } from '../../../types/study-agent.types'

describe('ChatMessageList', () => {
  const messages: StudyMessage[] = [
    {
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'user',
      content: '什么是导数？',
      followUps: [],
      feedback: null,
      createdAt: '2026-07-03T00:00:00.000Z',
    },
    {
      id: 'msg-2',
      sessionId: 'session-1',
      role: 'agent',
      content: '导数描述函数在某一点处的变化率。',
      followUps: ['导数如何计算？', '导数的几何意义是什么？'],
      feedback: null,
      createdAt: '2026-07-03T00:00:01.000Z',
    },
  ]

  it('renders user and agent messages', () => {
    render(
      <ChatMessageList
        messages={messages}
        knowledgePointTitle="导数"
        onFeedback={vi.fn()}
        onRegenerate={vi.fn()}
        onFollowUp={vi.fn()}
      />
    )

    expect(screen.getByText('什么是导数？')).toBeInTheDocument()
    expect(screen.getByText('导数描述函数在某一点处的变化率。')).toBeInTheDocument()
    expect(screen.getByText('来源：导数')).toBeInTheDocument()
  })

  it('renders follow-up chips for agent message', () => {
    render(
      <ChatMessageList
        messages={messages}
        knowledgePointTitle="导数"
        onFeedback={vi.fn()}
        onRegenerate={vi.fn()}
        onFollowUp={vi.fn()}
      />
    )

    expect(screen.getByText('导数如何计算？')).toBeInTheDocument()
    expect(screen.getByText('导数的几何意义是什么？')).toBeInTheDocument()
  })
})
