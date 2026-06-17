import { render, screen, waitFor, type RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { TextbookProvider } from '../../../contexts/TextbookContext'
import StudentAnalyticsPage from '../StudentAnalyticsPage'
import * as analyticsService from '../../../services/analytics.service'
import type { Textbook } from '../../../types/textbook.types'
import type { TextbookSummary } from '../../../types/analytics.types'

const mocks = vi.hoisted(() => ({
  mockGetTextbooks: vi.fn<[], Promise<Textbook[]>>(),
  mockGetToken: vi.fn<[], string | null>(),
}))

vi.mock('../../../services/textbook.service', () => ({
  getTextbooks: () => mocks.mockGetTextbooks(),
}))

vi.mock('../../../services/auth.service', () => ({
  getToken: () => mocks.mockGetToken(),
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

vi.mock('../../../services/analytics.service', () => ({
  getTextbookSummary: vi.fn(),
  getStudentOverview: vi.fn(),
  getLearningTrend: vi.fn(),
  getWeakPoints: vi.fn(),
  getLearnedKnowledgePoints: vi.fn(),
  getKnowledgePointProgress: vi.fn(),
}))

vi.mock('../../../components/features/analytics/EChartsWrapper', () => ({
  EChartsWrapper: () => <div data-testid="echarts-wrapper" />,
}))

const mockTextbook: Textbook = {
  id: 'tb-1',
  name: 'Math',
  fileName: 'math.xlsx',
  frameworkType: 'xlsx',
  hasContent: true,
  knowledgePointCount: 10,
  lastModifiedAt: '',
  createdAt: '',
}

const mockSummary: TextbookSummary = {
  textbookId: 'tb-1',
  textbookName: 'Math',
  totalKnowledgePoints: 10,
  learnedKnowledgePoints: 5,
  unlearnedKnowledgePoints: 5,
  masteryDistribution: [],
  importanceDistribution: [],
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mocks.mockGetToken.mockReturnValue('dummy-token')
})

const renderPage = (textbooks: Textbook[] = [], storageSelection: string | null = null): RenderResult => {
  mocks.mockGetTextbooks.mockResolvedValue(textbooks)
  if (storageSelection !== null) {
    localStorage.setItem('mathtong:selected-textbooks', storageSelection)
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TextbookProvider>
        <StudentAnalyticsPage />
      </TextbookProvider>
    </QueryClientProvider>
  )
}

it('shows empty state when no textbook selected', () => {
  renderPage([], JSON.stringify([]))
  expect(screen.getByText('请先在全局教材选择器中选择一本教材')).toBeInTheDocument()
})

it('defaults to textbook dimension tab and renders after data loads', async () => {
  vi.mocked(analyticsService.getTextbookSummary).mockResolvedValue(mockSummary)
  vi.mocked(analyticsService.getStudentOverview).mockResolvedValue({
    totalLearningCount: 0,
    totalDurationMinutes: 0,
    uniqueKnowledgePoints: 0,
  })
  vi.mocked(analyticsService.getLearningTrend).mockResolvedValue({ trend: [] })
  vi.mocked(analyticsService.getWeakPoints).mockResolvedValue({ weakPoints: [] })
  vi.mocked(analyticsService.getLearnedKnowledgePoints).mockResolvedValue({
    learnedKnowledgePoints: [],
  })

  renderPage([mockTextbook], JSON.stringify(['tb-1']))

  await waitFor(() => {
    expect(screen.getByText('知识点总数')).toBeInTheDocument()
  })
})
