import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  mockUseParams: vi.fn<[], { textbookId: string | undefined }>(() => ({ textbookId: 'tb-1' })),
  mockUseNavigate: vi.fn<[], () => void>(() => vi.fn()),
  mockGetKnowledgeTree: vi.fn<[], Promise<unknown>>(),
  mockGetKnowledgePointDetail: vi.fn<[], Promise<unknown>>(),
}))

const { mockUseParams, mockUseNavigate, mockGetKnowledgeTree, mockGetKnowledgePointDetail } = mocks

vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockUseNavigate(),
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../services/knowledgeApi', () => ({
  knowledgeApi: {
    getKnowledgeTree: (...args: unknown[]) => mockGetKnowledgeTree(...args),
    getKnowledgePointDetail: (...args: unknown[]) => mockGetKnowledgePointDetail(...args),
  },
}))

vi.mock('../../../utils/knowledgeTree', () => ({
  convertToTreeData: (data: unknown[]) => data,
}))

vi.mock('../../../components/Layout', () => ({
  MultiPaneLayout: (props: {
    knowledgeTreePanel: React.ReactNode
    markdownPanel: React.ReactNode
    aiSidebarPanel?: React.ReactNode
    learningFeedbackPanel?: React.ReactNode
  }) => (
    <div data-testid="multi-pane-layout">
      <div data-testid="tree-panel">{props.knowledgeTreePanel}</div>
      <div data-testid="markdown-panel">{props.markdownPanel}</div>
      <div data-testid="ai-panel">{props.aiSidebarPanel}</div>
      <div data-testid="feedback-panel">{props.learningFeedbackPanel}</div>
    </div>
  ),
}))

vi.mock('../../../components/KnowledgeTree', () => ({
  KnowledgeTree: (props: {
    onSelect?: (node: {
      key: string
      title: string
      code: string
      importanceLevel: string
      data: { id: string; textbookId: string }
    }) => void
    data?: unknown[]
    selectedKey?: string
  }) => (
    <div data-testid="knowledge-tree">
      <button
        data-testid="select-node-btn"
        onClick={() =>
          props.onSelect?.({
            key: 'kp-2',
            title: '函数',
            code: '2',
            importanceLevel: 'B',
            data: { id: 'kp-2', textbookId: 'tb-1' },
          })
        }
      >
        Select Node
      </button>
      <span data-testid="tree-data">{JSON.stringify(props.data)}</span>
      <span data-testid="tree-selected-key">{props.selectedKey}</span>
    </div>
  ),
}))

vi.mock('../../../components/MarkdownPreview', () => ({
  MarkdownPreview: (props: { content?: string; loading?: boolean }) => (
    <div data-testid="markdown-preview">{props.loading ? 'loading' : props.content}</div>
  ),
}))

vi.mock('../../../components/AISidebar', () => ({
  AISidebar: (props: { knowledgePointTitle?: string }) => (
    <div data-testid="ai-sidebar">{props.knowledgePointTitle}</div>
  ),
}))

vi.mock('../../../components/learning/FeedbackPanel', () => ({
  FeedbackPanel: (props: { knowledgePointId: string }) => (
    <div data-testid="feedback-panel">{props.knowledgePointId}</div>
  ),
}))

import LearningPage from '../LearningPage'

const mockTreeData = [
  {
    key: 'l1-Test',
    title: 'Test Chapter',
    code: '1',
    importanceLevel: 'A',
    children: [
      {
        key: 'kp-1',
        title: 'Test Point',
        code: '1.1',
        importanceLevel: 'A',
        isLeaf: true,
        data: { id: 'kp-1', textbookId: 'tb-1' },
      },
    ],
  },
]

describe('LearningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ textbookId: 'tb-1' })
    document.title = 'Math Learning'
  })

  it('renders empty state when no textbookId', () => {
    mockUseParams.mockReturnValue({ textbookId: undefined })
    render(<LearningPage />)
    expect(screen.getByText('Please select a textbook to start learning')).toBeInTheDocument()
  })

  it('renders learning page with panels when textbookId is present', async () => {
    mockGetKnowledgeTree.mockResolvedValue(mockTreeData)
    mockGetKnowledgePointDetail.mockResolvedValue({ content: 'Detail content' })

    render(<LearningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('multi-pane-layout')).toBeInTheDocument()
      expect(screen.getByTestId('tree-panel')).toBeInTheDocument()
      expect(screen.getByTestId('markdown-panel')).toBeInTheDocument()
      expect(screen.getByTestId('ai-panel')).toBeInTheDocument()
    })
  })

  it('loads knowledge tree on mount', async () => {
    mockGetKnowledgeTree.mockResolvedValue(mockTreeData)
    mockGetKnowledgePointDetail.mockResolvedValue({ content: 'Detail content' })

    render(<LearningPage />)

    await waitFor(() => {
      expect(mockGetKnowledgeTree).toHaveBeenCalledWith('tb-1')
    })
  })

  it('calls API to load knowledge point detail on selection', async () => {
    mockGetKnowledgeTree.mockResolvedValue(mockTreeData)
    mockGetKnowledgePointDetail.mockResolvedValue({ content: 'Detail content' })

    render(<LearningPage />)

    await waitFor(() => {
      expect(mockGetKnowledgePointDetail).toHaveBeenCalledWith('kp-1')
    })
  })

  it('updates document title when node selected', async () => {
    mockGetKnowledgeTree.mockResolvedValue(mockTreeData)
    mockGetKnowledgePointDetail.mockResolvedValue({ content: 'Detail content' })

    render(<LearningPage />)

    await waitFor(() => {
      expect(document.title).toBe('Test Point - Math Learning')
    })
  })

  it('calls API to load detail on manual node selection', async () => {
    mockGetKnowledgeTree.mockResolvedValue(mockTreeData)
    mockGetKnowledgePointDetail.mockResolvedValue({ content: 'Detail content' })

    render(<LearningPage />)

    await waitFor(() => {
      expect(screen.getByTestId('select-node-btn')).toBeInTheDocument()
    })

    mockGetKnowledgePointDetail.mockClear()
    mockGetKnowledgePointDetail.mockResolvedValue({ content: '函数 content' })

    fireEvent.click(screen.getByTestId('select-node-btn'))

    await waitFor(() => {
      expect(mockGetKnowledgePointDetail).toHaveBeenCalledWith('kp-2')
    })
  })
})
