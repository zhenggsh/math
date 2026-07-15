# AI Sidebar to Floating Action Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder right-panel `AISidebar` with a functional `AIFab` floating action button that expands into a prompt panel with dynamically generated suggestions and mock LLM responses.

**Architecture:** Create a new `AIFab` component with a fixed-position FAB button and an expandable overlay panel. The panel renders prompt chips generated from `knowledgePointTitle`, simulates a loading state, and displays mock responses. Remove `AISidebar` and its right-panel slot from `MultiPaneLayout`/`LearningPage`.

**Tech Stack:** React 19 + TypeScript strict + Ant Design 6 + CSS Modules + Vite + Vitest + React Testing Library

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `web/src/components/learning/AIFab.tsx` | Create | FAB button + expandable panel + prompt generation + mock response logic |
| `web/src/components/learning/AIFab.module.css` | Create | FAB positioning, panel styling, prompt/response layout |
| `web/src/components/learning/__tests__/AIFab.test.tsx` | Create | Unit tests for FAB click, panel open/close, prompt generation, mock response, ESC close, knowledge point switch |
| `web/src/components/learning/index.ts` | Modify | Export AIFab component and AIFabProps type |
| `web/src/pages/LearningPage/LearningPage.tsx` | Modify | Remove AISidebar import/usage, add AIFab |
| `web/src/pages/LearningPage/__tests__/LearningPage.test.tsx` | Modify | Remove AISidebar mock, add AIFab mock, update MultiPaneLayout mock, update assertion |
| `web/src/components/Layout/MultiPaneLayout.tsx` | Modify | Remove aiSidebarPanel and showAISidebar props, simplify to two-column layout |
| `web/src/components/Layout/MultiPaneLayout.module.css` | Modify | Remove responsive right panel rule |
| `web/src/components/AISidebar/AISidebar.tsx` | Delete | Old placeholder component |
| `web/src/components/AISidebar/AISidebar.module.css` | Delete | Old styles |
| `web/src/components/AISidebar/index.ts` | Delete | Old export |
| `web/src/components/AISidebar/__tests__/AISidebar.test.tsx` | Delete | Old tests |

---

## Task 1: Create AIFab Component and Styles

**Files:**
- Create: `web/src/components/learning/AIFab.tsx`
- Create: `web/src/components/learning/AIFab.module.css`
- Test: `web/src/components/learning/__tests__/AIFab.test.tsx`

### Step 1: Write the failing test

```tsx
// web/src/components/learning/__tests__/AIFab.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AIFab } from '../AIFab'

describe('AIFab', () => {
  it('renders floating button', () => {
    render(<AIFab knowledgePointTitle="三角函数" />)
    const fab = screen.getByRole('button', { name: /AI 助手/i })
    expect(fab).toBeInTheDocument()
  })

  it('expands panel when FAB is clicked', () => {
    render(<AIFab knowledgePointTitle="三角函数" />)
    const fab = screen.getByRole('button', { name: /AI 助手/i })
    fireEvent.click(fab)
    expect(screen.getByText('AI 学习助手')).toBeInTheDocument()
    expect(screen.getByText('生成「三角函数」的常见题目')).toBeInTheDocument()
  })

  it('generates generic prompts when title is undefined', () => {
    render(<AIFab />)
    const fab = screen.getByRole('button', { name: /AI 助手/i })
    fireEvent.click(fab)
    expect(screen.getByText(/生成.*的常见题目/)).toBeInTheDocument()
  })

  it('shows mock response after clicking a prompt', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<AIFab knowledgePointTitle="集合" />)
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))

    const prompt = screen.getByText('「集合」易错点分析')
    fireEvent.click(prompt)

    expect(screen.getByText('正在思考...')).toBeInTheDocument()

    vi.advanceTimersByTime(800)

    await waitFor(() => {
      expect(screen.getByText(/易错点/)).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('closes panel when close button is clicked', () => {
    render(<AIFab knowledgePointTitle="函数" />)
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))
    expect(screen.getByText('AI 学习助手')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: /关闭/i })
    fireEvent.click(closeButton)

    expect(screen.queryByText('AI 学习助手')).not.toBeInTheDocument()
  })

  it('closes panel when ESC key is pressed', () => {
    render(<AIFab knowledgePointTitle="函数" />)
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))
    expect(screen.getByText('AI 学习助手')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText('AI 学习助手')).not.toBeInTheDocument()
  })

  it('resets to prompt view when reopened after closing', () => {
    render(<AIFab knowledgePointTitle="数列" />)
    const fab = screen.getByRole('button', { name: /AI 助手/i })

    fireEvent.click(fab)
    fireEvent.click(screen.getByText('「数列」名师讲解视频'))

    const closeButton = screen.getByRole('button', { name: /关闭/i })
    fireEvent.click(closeButton)
    fireEvent.click(fab)

    expect(screen.getByText('「数列」名师讲解视频')).toBeInTheDocument()
    expect(screen.queryByText(/推荐以下名师/)).not.toBeInTheDocument()
  })

  it('resets to prompts when knowledge point changes while panel is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { rerender } = render(<AIFab knowledgePointTitle="集合" />)

    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))
    fireEvent.click(screen.getByText('「集合」易错点分析'))

    vi.advanceTimersByTime(800)

    await waitFor(() => {
      expect(screen.getByText(/易错点/)).toBeInTheDocument()
    })

    rerender(<AIFab knowledgePointTitle="三角函数" />)

    expect(screen.getByText('生成「三角函数」的常见题目')).toBeInTheDocument()
    expect(screen.queryByText(/易错点/)).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
```

Run: `pnpm --filter web test --run -- src/components/learning/__tests__/AIFab.test.tsx`
Expected: FAIL — `AIFab` module not found

### Step 2: Create AIFab component

```tsx
// web/src/components/learning/AIFab.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Card, Spin, Typography, Space } from 'antd'
import {
  RobotOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  AlertOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import styles from './AIFab.module.css'

const { Title, Text } = Typography

/**
 * AI FAB 组件 Props
 */
export interface AIFabProps {
  /** 当前知识点ID */
  knowledgePointId?: string
  /** 当前知识点标题（用于生成提示词） */
  knowledgePointTitle?: string
}

/**
 * 提示词项
 */
interface PromptItem {
  key: string
  label: string
  icon: React.ReactNode
  mockResponse: string
}

/**
 * 根据知识点标题生成提示词列表
 */
function generatePrompts(title: string | undefined): PromptItem[] {
  const t = title || '当前知识点'
  return [
    {
      key: 'questions',
      icon: <QuestionCircleOutlined />,
      label: `生成「${t}」的常见题目`,
      mockResponse: `以下是「${t}」的常见题目类型：\n\n1. 基础概念题——理解核心定义与性质\n2. 计算题——掌握基本运算方法与技巧\n3. 综合应用题——结合多个知识点解决实际问题\n4. 证明题——运用定理进行逻辑推理\n\n建议先完成基础概念题，再逐步挑战综合应用题。`,
    },
    {
      key: 'mistakes',
      icon: <AlertOutlined />,
      label: `「${t}」易错点分析`,
      mockResponse: `「${t}」学习中的常见易错点：\n\n1. 概念混淆——容易与其他相近概念混为一谈\n2. 公式误用——忽略公式成立的前提条件\n3. 计算失误——符号处理、边界条件考虑不周\n4. 思路局限——未能灵活运用多种解题方法\n\n建议建立错题本，定期回顾易错点。`,
    },
    {
      key: 'video',
      icon: <PlayCircleOutlined />,
      label: `「${t}」名师讲解视频`,
      mockResponse: `推荐以下「${t}」名师讲解资源：\n\n1. 【基础精讲】从零开始理解${t}——适合预习与复习\n2. 【典型例题】${t}必考题型解析——掌握高频考点\n3. 【易错专项】${t}常见错误分析——避开失分陷阱\n4. 【拔高训练】${t}压轴题突破——冲刺高分\n\n建议按顺序观看，配合课后练习效果更佳。`,
    },
  ]
}

/**
 * AI 浮动按钮组件
 * 右下角悬浮球，点击展开提示词面板
 */
export const AIFab: React.FC<AIFabProps> = ({ knowledgePointTitle }) => {
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [responseContent, setResponseContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const prompts = useMemo(() => generatePrompts(knowledgePointTitle), [knowledgePointTitle])

  const handleClose = useCallback(() => {
    setPanelOpen(false)
    setSelectedPrompt(null)
    setResponseContent(null)
    setIsLoading(false)
  }, [])

  // Auto-reset to prompt view when knowledge point changes while panel is open
  useEffect(() => {
    if (panelOpen) {
      setSelectedPrompt(null)
      setResponseContent(null)
      setIsLoading(false)
    }
  }, [knowledgePointTitle, panelOpen])

  // ESC key closes panel
  useEffect(() => {
    if (!panelOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [panelOpen, handleClose])

  const handleFabClick = useCallback(() => {
    setPanelOpen(true)
  }, [])

  const handlePromptClick = useCallback((item: PromptItem) => {
    setSelectedPrompt(item.key)
    setIsLoading(true)
    setResponseContent(null)

    setTimeout(() => {
      setResponseContent(item.mockResponse)
      setIsLoading(false)
    }, 800)
  }, [])

  return (
    <>
      {!panelOpen && (
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined />}
          onClick={handleFabClick}
          className={styles.fabButton}
          aria-label="AI 助手"
        />
      )}

      {panelOpen && (
        <div className={styles.panelOverlay}>
          <div className={styles.panel} role="dialog" aria-label="AI 学习助手">
            <div className={styles.panelHeader}>
              <Space>
                <RobotOutlined className={styles.headerIcon} />
                <Title level={5} className={styles.headerTitle}>
                  AI 学习助手
                </Title>
              </Space>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={handleClose}
                aria-label="关闭"
              />
            </div>

            <div className={styles.panelContent}>
              {!selectedPrompt && (
                <div className={styles.promptsList}>
                  {prompts.map(item => (
                    <Card
                      key={item.key}
                      className={styles.promptCard}
                      hoverable
                      size="small"
                      onClick={() => handlePromptClick(item)}
                    >
                      <Space>
                        {item.icon}
                        <Text>{item.label}</Text>
                      </Space>
                    </Card>
                  ))}
                </div>
              )}

              {selectedPrompt && (
                <div className={styles.responseArea}>
                  {isLoading ? (
                    <div className={styles.loadingContainer}>
                      <Spin tip="正在思考..." />
                    </div>
                  ) : (
                    <div className={styles.responseText}>
                      {responseContent?.split('\n').map((line, idx) => (
                        <p key={idx} className={line.startsWith(' ') ? styles.indentedLine : ''}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AIFab
```

### Step 3: Create AIFab styles

```css
/* web/src/components/learning/AIFab.module.css */

.fabButton {
  position: fixed !important;
  bottom: 24px;
  right: 24px;
  width: 56px !important;
  height: 56px !important;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fabButton:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fabButton :global(.ant-btn-icon) {
  font-size: 24px;
}

.panelOverlay {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.panel {
  width: 380px;
  max-height: 70vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: panelIn 0.2s ease-out;
}

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.panelHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  flex-shrink: 0;
}

.headerIcon {
  font-size: 18px;
  color: #1890ff;
}

.headerTitle {
  margin: 0 !important;
  font-size: 16px;
  color: #262626;
}

.panelContent {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.promptsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.promptCard {
  cursor: pointer;
  transition: all 0.2s;
}

.promptCard:hover {
  border-color: #1890ff;
}

.responseArea {
  min-height: 200px;
}

.loadingContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.responseText {
  line-height: 1.8;
  color: #262626;
}

.responseText p {
  margin: 0 0 8px 0;
}

.indentedLine {
  padding-left: 16px;
}

@media (max-width: 768px) {
  .panel {
    width: calc(100vw - 48px);
    max-height: 80vh;
    bottom: 16px;
    right: 16px;
  }

  .fabButton {
    bottom: 16px;
    right: 16px;
  }
}
```

### Step 4: Run tests

Run: `pnpm --filter web test --run -- src/components/learning/__tests__/AIFab.test.tsx`
Expected: All 7 tests pass

### Step 5: Update learning index export

In `web/src/components/learning/index.ts`, add:

```tsx
export { AIFab } from './AIFab';
export type { AIFabProps } from './AIFab';
```

### Step 6: Commit

```bash
git add web/src/components/learning/AIFab.tsx web/src/components/learning/AIFab.module.css web/src/components/learning/__tests__/AIFab.test.tsx web/src/components/learning/index.ts
git commit -m "feat: add AIFab component with floating button and prompt panel

- Create AIFab component with fixed-position FAB
- Implement expandable panel with animation
- Generate dynamic prompts from knowledge point title
- Mock LLM response with loading simulation
- ESC key closes panel
- Auto-reset when knowledge point changes while panel open
- Add comprehensive unit tests
- Export from learning/index.ts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Update MultiPaneLayout to Remove Right Panel

**Files:**
- Modify: `web/src/components/Layout/MultiPaneLayout.tsx`
- Modify: `web/src/components/Layout/MultiPaneLayout.module.css`

### Step 1: Modify MultiPaneLayout component

Replace the entire file content:

```tsx
// web/src/components/Layout/MultiPaneLayout.tsx
import React from 'react'
import { ResizableLayout } from './ResizableLayout'
import styles from './MultiPaneLayout.module.css'

export interface MultiPaneLayoutProps {
  /** 知识树面板内容 */
  knowledgeTreePanel: React.ReactNode
  /** Markdown 内容面板 */
  markdownPanel: React.ReactNode
  /** 底部学习反馈面板（可选） */
  learningFeedbackPanel?: React.ReactNode
  /** 是否显示底部面板 */
  showBottomPanel?: boolean
}

/**
 * 多栏布局组合组件
 * 学习页面的主布局组件，组合左侧知识树、中间 Markdown 内容
 */
export const MultiPaneLayout: React.FC<MultiPaneLayoutProps> = ({
  knowledgeTreePanel,
  markdownPanel,
  learningFeedbackPanel,
  showBottomPanel = false,
}) => {
  return (
    <div className={styles.multiPaneLayout}>
      <ResizableLayout
        leftPanel={<div className={styles.knowledgeTreeContainer}>{knowledgeTreePanel}</div>}
        centerPanel={<div className={styles.markdownContainer}>{markdownPanel}</div>}
        bottomPanel={learningFeedbackPanel}
        showRightPanel={false}
        showBottomPanel={showBottomPanel}
        defaultSizes={{
          left: 300,
          center: 700,
          bottom: 200,
        }}
        minSizes={{
          left: 220,
          center: 400,
          bottom: 150,
        }}
      />
    </div>
  )
}

export default MultiPaneLayout
```

### Step 2: Update MultiPaneLayout styles

Replace the entire file content:

```css
/* web/src/components/Layout/MultiPaneLayout.module.css */
.multiPaneLayout {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;
}

.knowledgeTreeContainer {
  width: 100%;
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #f0f0f0;
  overflow: auto;
}

.markdownContainer {
  width: 100%;
  height: 100%;
  background-color: #fff;
  overflow: auto;
}
```

### Step 3: Run typecheck

Run: `pnpm --filter web typecheck`
Expected: zero errors

### Step 4: Commit

```bash
git add web/src/components/Layout/MultiPaneLayout.tsx web/src/components/Layout/MultiPaneLayout.module.css
git commit -m "refactor: remove right panel slot from MultiPaneLayout

- Remove aiSidebarPanel and showAISidebar props
- Simplify to two-column layout (knowledge tree + markdown)
- Adjust default center panel size to fill available space
- Remove responsive right panel CSS rule

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Update LearningPage

**Files:**
- Modify: `web/src/pages/LearningPage/LearningPage.tsx`
- Modify: `web/src/pages/LearningPage/__tests__/LearningPage.test.tsx`

### Step 1: Replace AISidebar with AIFab in LearningPage

In `web/src/pages/LearningPage/LearningPage.tsx`:

1. Remove line:
```tsx
import { AISidebar } from '../../components/AISidebar'
```

2. Add line after FeedbackPanel import:
```tsx
import { AIFab } from '../../components/learning/AIFab'
```

3. Remove the `aiSidebarPanel` variable block (lines 447-449):
```tsx
// REMOVE:
const aiSidebarPanel = (
  <AISidebar knowledgePointId={selectedNode?.data.id} knowledgePointTitle={selectedNode?.title} />
)
```

4. Replace the `MultiPaneLayout` JSX (lines 469-477):
```tsx
// REPLACE:
<MultiPaneLayout
  knowledgeTreePanel={knowledgeTreePanel}
  markdownPanel={markdownPanel}
  aiSidebarPanel={aiSidebarPanel}
  learningFeedbackPanel={learningFeedbackPanel}
  showAISidebar={true}
  showBottomPanel={true}
/>

// WITH:
<MultiPaneLayout
  knowledgeTreePanel={knowledgeTreePanel}
  markdownPanel={markdownPanel}
  learningFeedbackPanel={learningFeedbackPanel}
  showBottomPanel={true}
/>
```

5. Add before closing `</div>`:
```tsx
<AIFab
  knowledgePointId={selectedNode?.data.id}
  knowledgePointTitle={selectedNode?.title}
/>
```

### Step 2: Update LearningPage tests

In `web/src/pages/LearningPage/__tests__/LearningPage.test.tsx`:

1. Remove lines 111-115:
```tsx
// REMOVE:
vi.mock('../../../components/AISidebar', () => ({
  AISidebar: (props: { knowledgePointTitle?: string }) => (
    <div data-testid="ai-sidebar">{props.knowledgePointTitle}</div>
  ),
}))
```

2. Add after line 121 (after FeedbackPanel mock):
```tsx
vi.mock('../../../components/learning/AIFab', () => ({
  AIFab: (props: { knowledgePointTitle?: string }) => (
    <div data-testid="ai-fab">{props.knowledgePointTitle}</div>
  ),
}))
```

3. Replace lines 56-70 (MultiPaneLayout mock):
```tsx
// REPLACE:
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

// WITH:
vi.mock('../../../components/Layout', () => ({
  MultiPaneLayout: (props: {
    knowledgeTreePanel: React.ReactNode
    markdownPanel: React.ReactNode
    learningFeedbackPanel?: React.ReactNode
  }) => (
    <div data-testid="multi-pane-layout">
      <div data-testid="tree-panel">{props.knowledgeTreePanel}</div>
      <div data-testid="markdown-panel">{props.markdownPanel}</div>
      <div data-testid="feedback-panel">{props.learningFeedbackPanel}</div>
    </div>
  ),
}))
```

4. Replace line 167:
```tsx
// REPLACE:
expect(screen.getByTestId('ai-panel')).toBeInTheDocument()

// WITH:
expect(screen.getByTestId('ai-fab')).toBeInTheDocument()
```

### Step 3: Run typecheck

Run: `pnpm --filter web typecheck`
Expected: zero errors

### Step 4: Run LearningPage tests

Run: `pnpm --filter web test --run -- src/pages/LearningPage/__tests__/LearningPage.test.tsx`
Expected: All tests pass

### Step 5: Commit

```bash
git add web/src/pages/LearningPage/LearningPage.tsx web/src/pages/LearningPage/__tests__/LearningPage.test.tsx
git commit -m "feat: integrate AIFab into LearningPage, remove AISidebar

- Replace right-panel AISidebar with floating AIFab
- Remove AISidebar import and aiSidebarPanel variable
- Pass knowledgePointId and knowledgePointTitle to AIFab
- Update MultiPaneLayout props (no longer needs aiSidebarPanel)
- Update tests: remove AISidebar mock, add AIFab mock, update assertions

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Remove AISidebar Files

**Files:**
- Delete: `web/src/components/AISidebar/AISidebar.tsx`
- Delete: `web/src/components/AISidebar/AISidebar.module.css`
- Delete: `web/src/components/AISidebar/index.ts`
- Delete: `web/src/components/AISidebar/__tests__/AISidebar.test.tsx`

### Step 1: Delete files

```bash
git rm web/src/components/AISidebar/AISidebar.tsx
git rm web/src/components/AISidebar/AISidebar.module.css
git rm web/src/components/AISidebar/index.ts
git rm web/src/components/AISidebar/__tests__/AISidebar.test.tsx
```

### Step 2: Check for any other AISidebar references

```bash
grep -r "AISidebar" web/src --include="*.ts" --include="*.tsx" || echo "No references found"
```
Expected: No references (or only in git history)

### Step 3: Run full test suite

Run: `pnpm --filter web test --run`
Expected: All tests pass

### Step 4: Commit

```bash
git add -A
git commit -m "chore: remove AISidebar component and related files

- Delete AISidebar.tsx, AISidebar.module.css, index.ts, and tests
- Component replaced by AIFab floating action button

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Final Verification

### Step 1: Type check

Run: `pnpm --filter web typecheck`
Expected: zero errors

### Step 2: Lint

Run: `pnpm --filter web lint`
Expected: zero errors

### Step 3: Run all learning component tests

Run: `pnpm --filter web test --run -- src/components/learning`
Expected: all pass

### Step 4: Run LearningPage tests

Run: `pnpm --filter web test --run -- src/pages/LearningPage`
Expected: all pass

### Step 5: Manual dev server verification

Run: `pnpm dev` and `pnpm dev:server`

Checklist:
- [ ] LearningPage loads without errors
- [ ] FAB (blue circle with robot icon) visible at bottom-right
- [ ] Clicking FAB opens panel with 3 prompt suggestions
- [ ] Prompts contain current knowledge point title
- [ ] Clicking a prompt shows "正在思考..." loading spinner
- [ ] After ~800ms, mock response appears with formatted text
- [ ] Pressing ESC closes panel
- [ ] Clicking close button collapses panel back to FAB
- [ ] Right panel is gone — only left (tree) + center (content) + bottom (feedback)
- [ ] Switching knowledge point while panel open resets to new prompts
- [ ] Resizing left/center panels works correctly
- [ ] No TypeScript or runtime errors in console

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| FAB visible at bottom-right | Task 1 (AIFab.tsx + CSS) |
| Clicking FAB expands panel | Task 1 (AIFab.tsx state + CSS animation) |
| Panel width 380px / full-width mobile | Task 1 (AIFab.module.css media query) |
| Prompt suggestions dynamically generated | Task 1 (generatePrompts function) |
| Mock response with loading simulation | Task 1 (setTimeout + Spin) |
| Panel closes and resets state | Task 1 (handleClose callback) |
| ESC key closes panel | Task 1 (keydown event listener) |
| Knowledge point switch auto-resets | Task 1 (useEffect on knowledgePointTitle) |
| Z-index above allotment sash | Task 1 (z-index: 1000) |
| Remove right panel from layout | Task 2 + Task 3 |
| Remove AISidebar files | Task 4 |

All spec requirements covered.

### 2. Placeholder Scan

- No "TBD", "TODO", "implement later" in the plan
- All code blocks contain complete implementations
- All test code is complete with assertions
- All commands are exact with expected output

### 3. Type Consistency

- `AIFabProps` interface uses `knowledgePointId?: string` and `knowledgePointTitle?: string` — matches LearningPage's usage pattern
- `PromptItem` interface is internal to AIFab, no external dependencies
- `generatePrompts` returns `PromptItem[]` consistently
- All React components have explicit `React.FC<Props>` typing

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-ai-sidebar-to-fab.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, with spec compliance review and code quality review after each task.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
