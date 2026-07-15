import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App } from 'antd'
import SmartLearningPage from '../SmartLearningPage'

const mocks = vi.hoisted(() => ({
  mockGetWeakPoints: vi.fn<unknown[], Promise<unknown>>(),
  mockGetByImportance: vi.fn<unknown[], Promise<unknown>>(),
  mockGetRandomPoints: vi.fn<unknown[], Promise<unknown>>(),
  mockGetKnowledgePointDetail: vi.fn<unknown[], Promise<unknown>>(),
  mockSelectedTextbookIds: ['tb-1'],
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
    getKnowledgePointDetail: (...args: unknown[]) => mocks.mockGetKnowledgePointDetail(...args),
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

vi.mock('../../../hooks/useTextbook', () => ({
  useTextbook: () => ({
    selectedTextbookIds: mocks.mockSelectedTextbookIds,
    textbooks: [{ id: 'tb-1', name: 'Test Textbook' }],
    isLoading: false,
    selectTextbook: vi.fn(),
    deselectTextbook: vi.fn(),
    selectMultiple: vi.fn(),
    clearSelection: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'teacher@test.com', name: 'Teacher', role: 'TEACHER' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
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
      {props.showBottomPanel && <div data-testid="bottom-panel">{props.bottomPanel}</div>}
    </div>
  ),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App>{children}</App>
        </QueryClientProvider>
      </BrowserRouter>
    )
  }
}

function createWeakPointItem(
  id: string,
  code: string,
  level1: string,
  level2: string,
  level3: string,
  overrides: Record<string, unknown> = {}
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
  })

  it('renders with weak points by default', async () => {
    const Wrapper = createWrapper()
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1')],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('薄弱点')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getAllByText('1.1.1').length).toBeGreaterThan(0)
    })
  })

  it('shows next recommendation CTA after feedback submit', async () => {
    const Wrapper = createWrapper()
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 2,
      items: [
        createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1'),
        createWeakPointItem('kp-2', '1.1.2', '第一章', '第一节', '知识点2'),
      ],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

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
    const Wrapper = createWrapper()
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
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('薄弱点')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('重要性'))

    await waitFor(() => {
      expect(mocks.mockGetByImportance).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('recommendation-item').length).toBe(1)
    })

    await waitFor(() => {
      const items = screen.getAllByTestId('recommendation-item')
      expect(items[0]).toHaveTextContent(/知识点3/)
    })
  })

  it('auto-selects first item on load', async () => {
    const Wrapper = createWrapper()
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 2,
      items: [
        createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1'),
        createWeakPointItem('kp-2', '1.1.2', '第一章', '第一节', '知识点2'),
      ],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

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

  it('renders breadcrumb and content toolbar aligned with LearningPage', async () => {
    const Wrapper = createWrapper()
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1')],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('SmartLearning')).toBeInTheDocument()
    })

    await waitFor(() => {
      const breadcrumb = document.querySelector('.ant-breadcrumb')
      expect(breadcrumb).toHaveTextContent(/第一章/)
      expect(breadcrumb).toHaveTextContent(/第一节/)
      expect(breadcrumb).toHaveTextContent(/知识点1/)
    })

    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Raw')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /导出/ })).toBeInTheDocument()
  })

  it('renders StudyGoalTracker inside left nav for weak mode only', async () => {
    const Wrapper = createWrapper()
    mocks.mockGetWeakPoints.mockResolvedValue({
      total: 1,
      items: [createWeakPointItem('kp-1', '1.1.1', '第一章', '第一节', '知识点1')],
    })
    mocks.mockGetKnowledgePointDetail.mockResolvedValue(createKnowledgePointDetail('kp-1', '1.1.1'))

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText(/今日已复习/)).toBeInTheDocument()
    })

    const leftPanel = screen.getByTestId('left-panel')
    expect(leftPanel).toHaveTextContent(/今日已复习/)
  })
})
