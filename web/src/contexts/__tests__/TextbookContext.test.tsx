import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TextbookProvider, TextbookContext } from '../TextbookContext'
import type { Textbook } from '../../types/textbook.types'

const mockTextbooks: Textbook[] = [
  { id: 'tb-1', name: 'Math 1', fileName: 'm1.xlsx', frameworkType: 'xlsx', hasContent: true, knowledgePointCount: 10, lastModifiedAt: '', createdAt: '' },
  { id: 'tb-2', name: 'Math 2', fileName: 'm2.xlsx', frameworkType: 'xlsx', hasContent: false, knowledgePointCount: 5, lastModifiedAt: '', createdAt: '' },
]

const mocks = vi.hoisted(() => ({
  mockGetTextbooks: vi.fn<[], Promise<Textbook[]>>(),
  mockGetToken: vi.fn<[], string | null>(),
}))

vi.mock('../../services/textbook.service', () => ({
  getTextbooks: () => mocks.mockGetTextbooks(),
}))

vi.mock('../../services/auth.service', () => ({
  getToken: () => mocks.mockGetToken(),
}))

const TestConsumer: React.FC = () => {
  const ctx = React.useContext(TextbookContext)
  if (!ctx) return <div>no context</div>
  return (
    <div>
      <div data-testid="loading">{ctx.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="count">{ctx.selectedTextbookIds.length}</div>
      <div data-testid="ids">{ctx.selectedTextbookIds.join(',')}</div>
      <button onClick={() => ctx.selectTextbook('tb-2')}>select tb2</button>
      <button onClick={() => ctx.deselectTextbook('tb-1')}>deselect tb1</button>
      <button onClick={() => ctx.clearSelection()}>clear</button>
    </div>
  )
}

describe('TextbookContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mocks.mockGetToken.mockReturnValue('dummy-token')
    mocks.mockGetTextbooks.mockResolvedValue(mockTextbooks)
  })

  it('loads textbooks and defaults to first on first visit', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    )

    expect(screen.getByTestId('loading').textContent).toBe('loading')

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('ids').textContent).toBe('tb-1')
  })

  it('restores saved selection from localStorage', async () => {
    localStorage.setItem('mathtong:selected-textbooks', JSON.stringify(['tb-2']))

    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('ids').textContent).toBe('tb-2')
  })

  it('filters stale IDs and falls back to first', async () => {
    localStorage.setItem('mathtong:selected-textbooks', JSON.stringify(['deleted-id']))

    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('ids').textContent).toBe('tb-1')
  })

  it('persists selection changes to localStorage', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))

    act(() => {
      screen.getByText('select tb2').click()
    })

    await waitFor(() => {
      const saved = localStorage.getItem('mathtong:selected-textbooks')
      expect(saved).toBe(JSON.stringify(['tb-1', 'tb-2']))
    })
  })

  it('clears selection', async () => {
    render(
      <TextbookProvider>
        <TestConsumer />
      </TextbookProvider>
    )

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))

    act(() => {
      screen.getByText('clear').click()
    })

    expect(screen.getByTestId('count').textContent).toBe('0')
  })
})
