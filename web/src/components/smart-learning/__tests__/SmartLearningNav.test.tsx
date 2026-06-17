import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SmartLearningNav } from '../SmartLearningNav'
import type {
  RecommendationMode,
  UnifiedRecommendationItem,
} from '../../../hooks/useRecommendations'

const createItem = (
  overrides: Partial<UnifiedRecommendationItem> & {
    id: string
    code: string
    level1: string
    name: string
  }
): UnifiedRecommendationItem => ({
  importanceLevel: 'A',
  ...overrides,
})

const mockWeakItems: UnifiedRecommendationItem[] = [
  createItem({
    id: '1',
    code: '1.1.1',
    level1: '第一章',
    level2: '第一节',
    level3: '知识点1',
    name: '第一章 > 第一节 > 知识点1',
    masteryLevel: 'E',
    daysSinceLastStudy: 3,
    recommendationReason: '掌握较差，建议复习',
    improvementVelocity: -1,
  }),
  createItem({
    id: '2',
    code: '1.1.2',
    level1: '第一章',
    level2: '第一节',
    level3: '知识点2',
    name: '第一章 > 第一节 > 知识点2',
    masteryLevel: 'D',
    daysSinceLastStudy: 5,
    recommendationReason: '近期未复习',
    improvementVelocity: 0,
  }),
  createItem({
    id: '3',
    code: '1.2.1',
    level1: '第一章',
    level2: '第二节',
    level3: '知识点3',
    name: '第一章 > 第二节 > 知识点3',
    masteryLevel: 'C',
    daysSinceLastStudy: 1,
    recommendationReason: '需要巩固',
    improvementVelocity: 1,
  }),
  createItem({
    id: '4',
    code: '2.1.1',
    level1: '第二章',
    level2: '第一节',
    level3: '知识点4',
    name: '第二章 > 第一节 > 知识点4',
    masteryLevel: 'E',
    daysSinceLastStudy: 7,
    recommendationReason: '多次测试错误',
  }),
]

const mockImportanceItems: UnifiedRecommendationItem[] = [
  createItem({
    id: '5',
    code: '3.1.1',
    level1: '第三章',
    level2: '第一节',
    level3: '知识点5',
    name: '第三章 > 第一节 > 知识点5',
    masteryLevel: 'B',
    daysSinceLastStudy: 2,
    isMastered: true,
  }),
]

describe('SmartLearningNav', () => {
  const defaultProps = {
    mode: 'weak' as RecommendationMode,
    onModeChange: vi.fn(),
    items: mockWeakItems,
    selectedId: undefined,
    onSelectItem: vi.fn(),
    isLoading: false,
    onRefresh: vi.fn(),
    selectedTextbookIds: ['tb-1'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all 3 tabs', () => {
    render(<SmartLearningNav {...defaultProps} />)

    expect(screen.getByText('薄弱点')).toBeInTheDocument()
    expect(screen.getByText('重要性')).toBeInTheDocument()
    expect(screen.getByText('随机')).toBeInTheDocument()
  })

  it('should call onModeChange when clicking a tab', () => {
    const onModeChange = vi.fn()
    render(<SmartLearningNav {...defaultProps} onModeChange={onModeChange} />)

    fireEvent.click(screen.getByText('重要性'))

    expect(onModeChange).toHaveBeenCalledWith('importance')
  })

  it('should show loading skeleton when isLoading is true', () => {
    render(<SmartLearningNav {...defaultProps} isLoading={true} />)

    expect(document.querySelector('.ant-skeleton')).toBeInTheDocument()
  })

  it('should show weak mode empty state with switch button', () => {
    render(<SmartLearningNav {...defaultProps} items={[]} />)

    expect(screen.getByText('恭喜！暂无薄弱知识点')).toBeInTheDocument()
    expect(screen.getByText('切换到随机模式')).toBeInTheDocument()
  })

  it('should switch to random mode when clicking empty state button', () => {
    const onModeChange = vi.fn()
    render(<SmartLearningNav {...defaultProps} items={[]} onModeChange={onModeChange} />)

    fireEvent.click(screen.getByText('切换到随机模式'))

    expect(onModeChange).toHaveBeenCalledWith('random')
  })

  it('should show other mode empty state', () => {
    render(<SmartLearningNav {...defaultProps} mode="importance" items={[]} />)

    expect(screen.getByText('暂无推荐')).toBeInTheDocument()
  })

  it('should show grouped collapse in weak mode', () => {
    render(<SmartLearningNav {...defaultProps} />)

    expect(screen.getByText('第一章 (3)')).toBeInTheDocument()
    expect(screen.getByText('第二章 (1)')).toBeInTheDocument()
  })

  it('should render item details in weak mode', () => {
    render(<SmartLearningNav {...defaultProps} />)

    const items = screen.getAllByTestId('recommendation-item')
    expect(items.length).toBe(4)

    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('第一章 > 第一节 > 知识点1')).toBeInTheDocument()
    expect(screen.getAllByText(/需复习/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('3 天前')).toBeInTheDocument()
    expect(screen.getByText('掌握较差，建议复习')).toBeInTheDocument()
  })

  it('should render trend tags in weak mode', () => {
    render(<SmartLearningNav {...defaultProps} />)

    expect(screen.getByText('↘ 下降')).toBeInTheDocument()
    expect(screen.getByText('→ 持平')).toBeInTheDocument()
    expect(screen.getByText('↗ 上升')).toBeInTheDocument()
  })

  it('should render no-trend tag when improvementVelocity is missing', () => {
    render(<SmartLearningNav {...defaultProps} />)

    expect(screen.getByText('— 暂无趋势')).toBeInTheDocument()
  })

  it('should call onSelectItem when clicking an item', () => {
    const onSelectItem = vi.fn()
    render(<SmartLearningNav {...defaultProps} onSelectItem={onSelectItem} />)

    fireEvent.click(screen.getByText('1.1.1'))

    expect(onSelectItem).toHaveBeenCalledTimes(1)
    expect(onSelectItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        code: '1.1.1',
      })
    )
  })

  it('should highlight selected item', () => {
    render(<SmartLearningNav {...defaultProps} selectedId="1" />)

    const selectedItem = screen.getByText('1.1.1').closest('div[role="button"]')
    expect(selectedItem?.className).toContain('itemSelected')
  })

  it('should render flat list in importance mode', () => {
    render(<SmartLearningNav {...defaultProps} mode="importance" items={mockImportanceItems} />)

    expect(screen.getByText('3.1.1')).toBeInTheDocument()
    expect(screen.getByText('第三章 > 第一节 > 知识点5')).toBeInTheDocument()
  })

  it('should render isMastered tag instead of trend in importance mode', () => {
    render(<SmartLearningNav {...defaultProps} mode="importance" items={mockImportanceItems} />)

    expect(screen.getByText('已掌握')).toBeInTheDocument()
    expect(screen.queryByText('↗ 上升')).not.toBeInTheDocument()
    expect(screen.queryByText('↘ 下降')).not.toBeInTheDocument()
  })

  it('should call onRefresh when clicking refresh button', () => {
    const onRefresh = vi.fn()
    render(<SmartLearningNav {...defaultProps} onRefresh={onRefresh} />)

    const refreshButton = screen.getByRole('button', { name: /刷新/ })
    fireEvent.click(refreshButton)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('should render StudyGoalTracker in weak mode when onGoalChange is provided', () => {
    render(
      <SmartLearningNav {...defaultProps} studiedCount={2} goalCount={5} onGoalChange={vi.fn()} />
    )

    expect(screen.getByText(/今日已复习 2 \/ 5 个薄弱点/)).toBeInTheDocument()
  })

  it('should not render StudyGoalTracker in importance mode', () => {
    render(
      <SmartLearningNav
        {...defaultProps}
        mode="importance"
        items={mockImportanceItems}
        studiedCount={2}
        goalCount={5}
        onGoalChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/今日已复习/)).not.toBeInTheDocument()
  })

  it('should not render StudyGoalTracker when onGoalChange is not provided', () => {
    render(<SmartLearningNav {...defaultProps} />)

    expect(screen.queryByText(/今日已复习/)).not.toBeInTheDocument()
  })

  it('should show empty textbook state when no textbook is selected', () => {
    render(<SmartLearningNav {...defaultProps} selectedTextbookIds={[]} />)

    expect(screen.getByText('请先选择教材')).toBeInTheDocument()
    expect(screen.queryByText('恭喜！暂无薄弱知识点')).not.toBeInTheDocument()
  })

  it('should hide StudyGoalTracker when no textbook is selected', () => {
    render(
      <SmartLearningNav
        {...defaultProps}
        selectedTextbookIds={[]}
        studiedCount={2}
        goalCount={5}
        onGoalChange={vi.fn()}
      />
    )

    expect(screen.queryByText(/今日已复习/)).not.toBeInTheDocument()
  })
})
