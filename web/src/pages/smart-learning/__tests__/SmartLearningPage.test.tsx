import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from 'antd'
import SmartLearningPage from '../SmartLearningPage'

const mocks = vi.hoisted(() => ({
  mockGetWeakPoints: vi.fn(),
  mockGetByImportance: vi.fn(),
  mockGetRandomPoints: vi.fn(),
  mockGetKnowledgePointDetail: vi.fn(),
}))

vi.mock('../../../services/smartLearningApi', () => ({
  smartLearningApi: {
    getWeakPoints: (...args: unknown[]) => mocks.mockGetWeakPoints(...args),
    getByImportance: (...args: unknown[]) => mocks.mockGetByImportance(...args),
    getRandomPoints: (...args: unknown[]) => mocks.mockGetRandomPoints(...args),
    getLearningStats: vi.fn(),
  },
}))

vi.mock('../../../services/knowledgeApi', () => ({
  knowledgeApi: {
    getKnowledgePointDetail: (...args: unknown[]) =>
      mocks.mockGetKnowledgePointDetail(...args),
    getKnowledgeTree: vi.fn(),
    searchKnowledgePoints: vi.fn(),
    saveKnowledgePointContent: vi.fn(),
  },
}))

vi.mock('../../../components/learning/FeedbackPanel', () => ({
  FeedbackPanel: ({ onSubmitSuccess }: { onSubmitSuccess?: () => void }) => (
    <button onClick={onSubmitSuccess}>提交反馈</button>
  ),
}))

vi.mock('../../../components/Layout/ResizableLayout', () => ({
  ResizableLayout: (props: {
    leftPanel?: React.ReactNode
    centerPanel?: React.ReactNode
    bottomPanel?: React.ReactNode
    showBottomPanel?: boolean
  }) => (
    <div data-testid="resizable-layout">
      <div data-testid="left-panel">{props.leftPanel}</div>
      <div data-testid="center-panel">{props.centerPanel}</div>
      {props.showBottomPanel && (
        <div data-testid="bottom-panel">{props.bottomPanel}</div>
      )}
    </div>
  ),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  )
}

function createWeakPointItem(
  id: string,
  code: string,
  level1: string,
  level2: string,
  level3: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    knowledgePoint: {
      id,
      code,
      level1,
      level2,
      level3,
      importanceLevel: 'A' as const,
      textbookId: 'tb-1',
      ...overrides,
    },
    learningRecord: {
      id: `lr-${id}`,
      masteryLevel: 'D' as const,
      durationMinutes: 30,
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes: null,
    },
    priority: 1,
    recommendationReason: '掌握较差，建议复习',
    improvementVelocity: -1,
  }
}

function createKnowledgePointDetail(id: string, code: string) {
  return {
    id,
    code,
    level1: '第一章',
    level2: '第一节',
    level3: '知识点1',
    importanceLevel: 'A' as const,
    textbookId: 'tb-1',
    content: '这是一个测试内容',
    definition: '测试定义',
    characteristics: '测试特性',
  }
}

describe('SmartLearningPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('renders with weak points by default', async () => {
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1')],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(
      createKnowledgePointDetail('kp-1', '1.1.1'),
    )

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('薄弱点')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('1.1.1')).toBeInTheDocument()
    })
  })

  it('shows next recommendation CTA after feedback submit', async () => {
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 2,
      items: [
        createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1'),
        createWeakPointItem('kp-2', '1.1.2', '第一章', '第一节', '知识点2'),
      ],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(
      createKnowledgePointDetail('kp-1', '1.1.1'),
    )

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('提交反馈')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('提交反馈'))

    await waitFor(() => {
      expect(screen.getByText('下一个推荐')).toBeInTheDocument()
    })
  })

  it('mode switching updates list', async () => {
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1')],
    })
    mocks.mockGetByImportance.mockResolvedValue({
      level: 'A' as const,
      total: 1,
      items: [
        {
          id: 'kp-3',
          code: '2.1.1',
          level1: '第二章',
          level2: '第一节',
          level3: '知识点3',
          importanceLevel: 'A' as const,
          textbookId: 'tb-1',
          isMastered: false,
          learningRecord: null,
          recommendationReason: '重要性A级',
          improvementVelocity: 0,
        },
      ],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(
      createKnowledgePointDetail('kp-1', '1.1.1'),
    )

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('薄弱点')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('重要性'))

    await waitFor(() => {
      expect(mocks.mockGetByImportance).toHaveBeenCalled()
    })
  })

  it('auto-selects first item on load', async () => {
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 2,
      items: [
        createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1'),
        createWeakPointItem('kp-2', '1.1.2', '第一章', '第一节', '知识点2'),
      ],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(
      createKnowledgePointDetail('kp-1', '1.1.1'),
    )

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      const items = screen.getAllByTestId('recommendation-item')
      expect(items.length).toBeGreaterThanOrEqual(1)
      expect(items[0]).toHaveAttribute('data-selected', 'true')
    })

    await waitFor(() => {
      expect(mocks.mockGetKnowledgePointDetail).toHaveBeenCalledWith('kp-1')
    })
  })
})
