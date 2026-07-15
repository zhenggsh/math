# Unify Smart Learning UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `/smart-learning` with a three-pane layout (left nav + center content + bottom feedback), unified recommendation list with grouping, study goal tracking, and next-recommendation CTA — without modifying `/learning`.

**Architecture:** `SmartLearningPage` owns all state (mode, selected knowledge point, goal progress). `SmartLearningNav` renders tabs + grouped list. `useRecommendations(mode)` hook unifies data fetching. `StudyGoalTracker` is a pure UI component. `FeedbackPanel` is reused as-is.

**Tech Stack:** React 19, TypeScript, Ant Design 6, TanStack Query, allotment (ResizableLayout), NestJS, Prisma

---

## File Structure

### Backend
| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts` | Modify | Add `improvementVelocity` to DTOs |
| `server/src/modules/smart-learning/smart-learning.service.ts` | Modify | Pass `improvementVelocity` from scorer to response |

### Frontend — New Files
| File | Responsibility |
|------|----------------|
| `web/src/hooks/useRecommendations.ts` | Unified data fetching for all 3 modes |
| `web/src/components/smart-learning/SmartLearningNav.tsx` | Tabs + grouped recommendation list |
| `web/src/components/smart-learning/SmartLearningNav.module.css` | Nav styles |
| `web/src/components/smart-learning/StudyGoalTracker.tsx` | Daily goal progress UI + settings modal |
| `web/src/components/smart-learning/StudyGoalTracker.module.css` | Tracker styles |
| `web/src/components/smart-learning/__tests__/SmartLearningNav.test.tsx` | Nav component tests |
| `web/src/components/smart-learning/__tests__/StudyGoalTracker.test.tsx` | Tracker component tests |
| `web/src/pages/smart-learning/__tests__/SmartLearningPage.test.tsx` | Page integration tests |

### Frontend — Modify
| File | Responsibility |
|------|----------------|
| `web/src/services/smartLearningApi.ts` | Add `improvementVelocity` to types |
| `web/src/pages/smart-learning/SmartLearningPage.tsx` | Rewrite with ResizableLayout + all components |
| `web/src/pages/smart-learning/SmartLearningPage.module.css` | Rewrite page styles |

### Frontend — Delete
| File | Reason |
|------|--------|
| `web/src/components/smart-learning/WeakPointView.tsx` | Replaced by SmartLearningNav |
| `web/src/components/smart-learning/WeakPointView.module.css` | Unused |
| `web/src/components/smart-learning/ImportanceView.tsx` | Replaced by SmartLearningNav |
| `web/src/components/smart-learning/ImportanceView.module.css` | Unused |
| `web/src/components/smart-learning/RandomView.tsx` | Replaced by SmartLearningNav |
| `web/src/components/smart-learning/RandomView.module.css` | Unused |
| `web/src/components/smart-learning/LearningModeSelector.tsx` | Replaced by SmartLearningNav tabs |
| `web/src/components/smart-learning/LearningModeSelector.module.css` | Unused |

---

## Task 1: Backend — Expose improvementVelocity in API Response

**Files:**
- Modify: `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts`
- Modify: `server/src/modules/smart-learning/smart-learning.service.ts`
- Test: `server/src/modules/smart-learning/smart-learning.service.spec.ts` (add assertions)

- [ ] **Step 1: Add `improvementVelocity` to DTOs**

In `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts`, add the field to both DTOs:

```typescript
export class WeakPointResponseDto {
  // ... existing fields ...

  @ApiProperty()
  improvementVelocity: number;
}

export class ByImportanceResponseDto {
  // ... existing fields ...

  @ApiProperty()
  improvementVelocity: number;
}
```

- [ ] **Step 2: Pass `improvementVelocity` from service to response**

In `server/src/modules/smart-learning/smart-learning.service.ts`, update both `getWeakPoints` and `getByImportance` to include the field:

For `getWeakPoints`, in the `scoredItems.push` block:
```typescript
item: {
  knowledgePoint: record.knowledgePoint,
  learningRecord: { /* ... */ },
  priority: Math.round(finalScore),
  recommendationReason: reason,
  improvementVelocity: components.improvementVelocity,  // ADD THIS
},
```

For `getByImportance`, in the `scoredItems.push` block:
```typescript
item: {
  ...kp,
  isMastered,
  learningRecord: latestRecord ? { /* ... */ } : null,
  recommendationReason: reason,
  improvementVelocity: components.improvementVelocity,  // ADD THIS
},
```

- [ ] **Step 3: Run backend tests**

Run: `pnpm --filter server test -- src/modules/smart-learning/smart-learning.service.spec.ts`

Expected: PASS (or confirm existing failures are pre-existing)

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/smart-learning/
git commit -m "feat(smart-learning): expose improvementVelocity in API response"
```

---

## Task 2: Frontend — Update API Types and Create useRecommendations Hook

**Files:**
- Modify: `web/src/services/smartLearningApi.ts`
- Create: `web/src/hooks/useRecommendations.ts`
- Create: `web/src/hooks/__tests__/useRecommendations.test.ts`
- Modify: `web/src/components/smart-learning/index.ts` (update exports)

- [ ] **Step 1: Add `improvementVelocity` to frontend types**

In `web/src/services/smartLearningApi.ts`:

```typescript
export interface WeakPointItem {
  knowledgePoint: KnowledgePoint
  learningRecord: {
    id: string
    masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E'
    durationMinutes: number
    startTime: string
    notes: string | null
  }
  priority: number
  recommendationReason: string
  improvementVelocity: number  // ADD THIS
}

export interface ByImportanceItem extends KnowledgePoint {
  isMastered: boolean
  learningRecord: {
    id: string
    masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E'
    durationMinutes: number
    startTime: string
    notes: string | null
  } | null
  recommendationReason: string
  improvementVelocity: number  // ADD THIS
}
```

- [ ] **Step 2: Create `useRecommendations` hook**

Create `web/src/hooks/useRecommendations.ts`:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { smartLearningApi } from '../services/smartLearningApi'
import type { WeakPointItem, ByImportanceItem, KnowledgePoint } from '../services/smartLearningApi'

export type RecommendationMode = 'weak' | 'importance' | 'random'

export interface UnifiedRecommendationItem {
  id: string
  code: string
  level1: string
  level2: string | null
  level3: string | null
  importanceLevel: string
  definition: string | null
  name: string
  masteryLevel?: 'A' | 'B' | 'C' | 'D' | 'E'
  daysSinceLastStudy?: number
  recommendationReason?: string
  improvementVelocity?: number
  isMastered?: boolean
}

const QUERY_KEY = 'recommendations'

function toUnifiedItem(
  item: WeakPointItem | ByImportanceItem | KnowledgePoint,
  mode: RecommendationMode,
): UnifiedRecommendationItem {
  if (mode === 'weak' && 'knowledgePoint' in item) {
    const wp = item as WeakPointItem
    const daysSince = Math.ceil(
      (Date.now() - new Date(wp.learningRecord.startTime).getTime()) / (1000 * 60 * 60 * 24),
    )
    return {
      id: wp.knowledgePoint.id,
      code: wp.knowledgePoint.code,
      level1: wp.knowledgePoint.level1,
      level2: wp.knowledgePoint.level2,
      level3: wp.knowledgePoint.level3,
      importanceLevel: wp.knowledgePoint.importanceLevel,
      definition: wp.knowledgePoint.definition,
      name: [wp.knowledgePoint.level1, wp.knowledgePoint.level2, wp.knowledgePoint.level3]
        .filter(Boolean)
        .join(' > '),
      masteryLevel: wp.learningRecord.masteryLevel,
      daysSinceLastStudy: daysSince,
      recommendationReason: wp.recommendationReason,
      improvementVelocity: wp.improvementVelocity,
    }
  }

  if (mode === 'importance' && 'isMastered' in item) {
    const bi = item as ByImportanceItem
    const daysSince = bi.learningRecord
      ? Math.ceil(
          (Date.now() - new Date(bi.learningRecord.startTime).getTime()) / (1000 * 60 * 60 * 24),
        )
      : undefined
    return {
      id: bi.id,
      code: bi.code,
      level1: bi.level1,
      level2: bi.level2,
      level3: bi.level3,
      importanceLevel: bi.importanceLevel,
      definition: bi.definition,
      name: [bi.level1, bi.level2, bi.level3].filter(Boolean).join(' > '),
      masteryLevel: bi.learningRecord?.masteryLevel,
      daysSinceLastStudy: daysSince,
      recommendationReason: bi.recommendationReason,
      improvementVelocity: bi.improvementVelocity,
      isMastered: bi.isMastered,
    }
  }

  // random mode — plain KnowledgePoint
  const kp = item as KnowledgePoint
  return {
    id: kp.id,
    code: kp.code,
    level1: kp.level1,
    level2: kp.level2,
    level3: kp.level3,
    importanceLevel: kp.importanceLevel,
    definition: kp.definition,
    name: [kp.level1, kp.level2, kp.level3].filter(Boolean).join(' > '),
  }
}

export function useRecommendations(mode: RecommendationMode) {
  const queryKey = [QUERY_KEY, mode]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (mode === 'weak') {
        const data = await smartLearningApi.getWeakPoints({ limit: 50 })
        return data.items.map(item => toUnifiedItem(item, mode))
      }
      if (mode === 'importance') {
        const data = await smartLearningApi.getByImportance({ excludeMastered: true, limit: 50 })
        return data.items.map(item => toUnifiedItem(item, mode))
      }
      const data = await smartLearningApi.getRandomPoints({ count: 20 })
      return data.items.map(item => toUnifiedItem(item, mode))
    },
    staleTime: 5 * 60 * 1000,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useRefreshRecommendations() {
  const queryClient = useQueryClient()
  return {
    refresh: (mode?: RecommendationMode) => {
      if (mode) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, mode] })
      } else {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      }
    },
  }
}
```

- [ ] **Step 3: Write hook tests**

Create `web/src/hooks/__tests__/useRecommendations.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRecommendations } from '../useRecommendations'
import { smartLearningApi } from '../../services/smartLearningApi'

vi.mock('../../services/smartLearningApi')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useRecommendations', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.resetAllMocks()
  })

  it('returns weak point items in unified format', async () => {
    vi.mocked(smartLearningApi.getWeakPoints).mockResolvedValue({
      total: 1,
      items: [
        {
          knowledgePoint: {
            id: '1',
            code: '1.1.1',
            level1: '集合',
            level2: '集合的概念',
            level3: '元素与集合',
            importanceLevel: 'A',
            definition: '集合的定义',
          },
          learningRecord: {
            id: 'r1',
            masteryLevel: 'D',
            durationMinutes: 30,
            startTime: new Date(Date.now() - 3 * 86400000).toISOString(),
            notes: null,
          },
          priority: 80,
          recommendationReason: '3天未复习',
          improvementVelocity: 1,
        },
      ],
    })

    const { result } = renderHook(() => useRecommendations('weak'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(1))

    expect(result.current.items[0].code).toBe('1.1.1')
    expect(result.current.items[0].improvementVelocity).toBe(1)
    expect(result.current.items[0].daysSinceLastStudy).toBe(3)
  })

  it('returns empty array for random mode', async () => {
    vi.mocked(smartLearningApi.getRandomPoints).mockResolvedValue({ items: [] })

    const { result } = renderHook(() => useRecommendations('random'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Run hook tests**

Run: `pnpm --filter web test --run -- src/hooks/__tests__/useRecommendations.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/services/smartLearningApi.ts web/src/hooks/
git commit -m "feat(web): add useRecommendations hook with unified data format"
```

---

## Task 3: Delete Legacy View Components

**Files:**
- Delete: `web/src/components/smart-learning/WeakPointView.tsx`
- Delete: `web/src/components/smart-learning/WeakPointView.module.css`
- Delete: `web/src/components/smart-learning/ImportanceView.tsx`
- Delete: `web/src/components/smart-learning/ImportanceView.module.css`
- Delete: `web/src/components/smart-learning/RandomView.tsx`
- Delete: `web/src/components/smart-learning/RandomView.module.css`
- Delete: `web/src/components/smart-learning/LearningModeSelector.tsx`
- Delete: `web/src/components/smart-learning/LearningModeSelector.module.css`
- Modify: `web/src/components/smart-learning/index.ts`

- [ ] **Step 1: Check for external references**

Run: `grep -r "WeakPointView\|ImportanceView\|RandomView\|LearningModeSelector" web/src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."`

Expected: Only references in `SmartLearningPage.tsx` and `index.ts`. If other files reference them, update those first.

- [ ] **Step 2: Delete files**

```bash
cd web/src/components/smart-learning
rm -f WeakPointView.tsx WeakPointView.module.css \
  ImportanceView.tsx ImportanceView.module.css \
  RandomView.tsx RandomView.module.css \
  LearningModeSelector.tsx LearningModeSelector.module.css
```

- [ ] **Step 3: Update index.ts**

Replace the contents of `web/src/components/smart-learning/index.ts` with:

```typescript
export { SmartLearningNav } from './SmartLearningNav'
export { StudyGoalTracker } from './StudyGoalTracker'
```

(These exports don't exist yet; they will be created in Tasks 4 and 5.)

- [ ] **Step 4: Commit**

```bash
git add web/src/components/smart-learning/
git commit -m "refactor(web): remove legacy view components replaced by SmartLearningNav"
```

---

## Task 4: SmartLearningNav Component

**Files:**
- Create: `web/src/components/smart-learning/SmartLearningNav.tsx`
- Create: `web/src/components/smart-learning/SmartLearningNav.module.css`
- Create: `web/src/components/smart-learning/__tests__/SmartLearningNav.test.tsx`

- [ ] **Step 1: Create the component file**

Create `web/src/components/smart-learning/SmartLearningNav.tsx`:

```typescript
import React, { useMemo } from 'react'
import { Tabs, Collapse, Skeleton, Empty, Button, Tag, Spin } from 'antd'
import { ReloadOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons'
import type { RecommendationMode, UnifiedRecommendationItem } from '../../hooks/useRecommendations'
import styles from './SmartLearningNav.module.css'

export interface SmartLearningNavProps {
  mode: RecommendationMode
  onModeChange: (mode: RecommendationMode) => void
  items: UnifiedRecommendationItem[]
  selectedId?: string
  onSelectItem: (item: UnifiedRecommendationItem) => void
  isLoading: boolean
  onRefresh: () => void
}

const modeTabs = [
  { key: 'weak' as RecommendationMode, label: '薄弱点' },
  { key: 'importance' as RecommendationMode, label: '重要性' },
  { key: 'random' as RecommendationMode, label: '随机' },
]

function getTrendTag(velocity: number | undefined, recordCount: number | undefined) {
  if (recordCount !== undefined && recordCount < 2) {
    return <Tag className={styles.trendTag}>— 暂无趋势</Tag>
  }
  if (velocity === undefined) return null
  if (velocity > 0) return <Tag color="green" icon={<RiseOutlined />}>↗ 上升</Tag>
  if (velocity < 0) return <Tag color="red" icon={<FallOutlined />}>↘ 下降</Tag>
  return <Tag>→ 持平</Tag>
}

function getMasteryTag(level?: string) {
  const colors: Record<string, string> = {
    E: '#ff4d4f',
    D: '#faad14',
    C: '#1890ff',
    B: '#52c41a',
    A: '#52c41a',
  }
  const labels: Record<string, string> = {
    E: '需复习',
    D: '未掌握',
    C: '基本掌握',
    B: '良好',
    A: '精通',
  }
  if (!level) return null
  return <Tag color={colors[level] || 'default'}>{level} - {labels[level] || level}</Tag>
}

export const SmartLearningNav: React.FC<SmartLearningNavProps> = ({
  mode,
  onModeChange,
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onRefresh,
}) => {
  const groupedItems = useMemo(() => {
    if (mode !== 'weak') return null

    const groups = new Map<string, Map<string, UnifiedRecommendationItem[]>>()

    for (const item of items) {
      const l1 = item.level1 || '未分类'
      const l2 = item.level2 || '未分节'
      if (!groups.has(l1)) groups.set(l1, new Map())
      const l2Map = groups.get(l1)!
      if (!l2Map.has(l2)) l2Map.set(l2, [])
      l2Map.get(l2)!.push(item)
    }

    return groups
  }, [items, mode])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  const emptyState = (
    <Empty description="恭喜！暂无薄弱知识点" image={Empty.PRESENTED_IMAGE_SIMPLE}>
      <Button size="small" onClick={() => onModeChange('random')}>
        切换到随机模式
      </Button>
    </Empty>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Tabs
          size="small"
          activeKey={mode}
          onChange={key => onModeChange(key as RecommendationMode)}
          items={modeTabs.map(t => ({ key: t.key, label: t.label }))}
        />
        <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh} />
      </div>

      <div className={styles.list}>
        {items.length === 0 && mode === 'weak' ? (
          emptyState
        ) : items.length === 0 ? (
          <Empty description="暂无推荐" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : mode === 'weak' && groupedItems ? (
          <Collapse
            defaultActiveKey={Array.from(groupedItems.keys()).slice(0, 2)}
            className={styles.collapse}
          >
            {Array.from(groupedItems.entries()).map(([l1, l2Map]) => (
              <Collapse.Panel header={l1} key={l1}>
                {Array.from(l2Map.entries()).map(([l2, subItems]) => (
                  <div key={l2} className={styles.subGroup}>
                    <div className={styles.subHeader}>{l2}</div>
                    {subItems.map(item => (
                      <div
                        key={item.id}
                        className={`${styles.item} ${selectedId === item.id ? styles.selected : ''}`}
                        onClick={() => onSelectItem(item)}
                      >
                        <div className={styles.itemCode}>{item.code}</div>
                        <div className={styles.itemName}>{item.name}</div>
                        <div className={styles.itemMeta}>
                          {getMasteryTag(item.masteryLevel)}
                          {getTrendTag(item.improvementVelocity, 2)}
                          {item.daysSinceLastStudy !== undefined && (
                            <Tag>{item.daysSinceLastStudy} 天前</Tag>
                          )}
                        </div>
                        {item.recommendationReason && (
                          <div className={styles.itemReason}>{item.recommendationReason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </Collapse.Panel>
            ))}
          </Collapse>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={`${styles.item} ${selectedId === item.id ? styles.selected : ''}`}
              onClick={() => onSelectItem(item)}
            >
              <div className={styles.itemCode}>{item.code}</div>
              <div className={styles.itemName}>{item.name}</div>
              <div className={styles.itemMeta}>
                {getMasteryTag(item.masteryLevel)}
                {item.isMastered !== undefined && (
                  <Tag color={item.isMastered ? 'green' : 'orange'}>
                    {item.isMastered ? '已掌握' : '未掌握'}
                  </Tag>
                )}
                {item.daysSinceLastStudy !== undefined && (
                  <Tag>{item.daysSinceLastStudy} 天前</Tag>
                )}
              </div>
              {item.recommendationReason && (
                <div className={styles.itemReason}>{item.recommendationReason}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the CSS module**

Create `web/src/components/smart-learning/SmartLearningNav.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header :global(.ant-tabs) {
  flex: 1;
}

.header :global(.ant-tabs-nav) {
  margin-bottom: 0;
}

.list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.collapse {
  background: transparent;
}

.subGroup {
  margin-bottom: 8px;
}

.subHeader {
  font-size: 12px;
  color: #8c8c8c;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 4px;
}

.item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.item:hover {
  background: #f5f5f5;
}

.item.selected {
  background: #e6f7ff;
  border-color: #1890ff;
}

.itemCode {
  font-family: monospace;
  font-size: 12px;
  color: #8c8c8c;
}

.itemName {
  font-size: 14px;
  font-weight: 500;
  margin: 2px 0;
}

.itemMeta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.itemReason {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.trendTag {
  font-size: 12px;
}
```

- [ ] **Step 3: Write component tests**

Create `web/src/components/smart-learning/__tests__/SmartLearningNav.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SmartLearningNav } from '../SmartLearningNav'
import type { UnifiedRecommendationItem } from '../../../hooks/useRecommendations'

const mockItems: UnifiedRecommendationItem[] = [
  {
    id: '1',
    code: '1.1.1',
    level1: '集合',
    level2: '概念',
    level3: '元素',
    importanceLevel: 'A',
    definition: '定义',
    name: '集合 > 概念 > 元素',
    masteryLevel: 'D',
    daysSinceLastStudy: 3,
    recommendationReason: '3天未复习',
    improvementVelocity: 1,
  },
  {
    id: '2',
    code: '1.1.2',
    level1: '集合',
    level2: '概念',
    level3: '子集',
    importanceLevel: 'A',
    definition: '定义2',
    name: '集合 > 概念 > 子集',
    masteryLevel: 'E',
    daysSinceLastStudy: 5,
    recommendationReason: '掌握度低',
    improvementVelocity: -1,
  },
]

describe('SmartLearningNav', () => {
  it('renders tabs for three modes', () => {
    render(
      <SmartLearningNav
        mode="weak"
        onModeChange={vi.fn()}
        items={mockItems}
        onSelectItem={vi.fn()}
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    )
    expect(screen.getByText('薄弱点')).toBeInTheDocument()
    expect(screen.getByText('重要性')).toBeInTheDocument()
    expect(screen.getByText('随机')).toBeInTheDocument()
  })

  it('shows grouped collapse for weak mode', () => {
    render(
      <SmartLearningNav
        mode="weak"
        onModeChange={vi.fn()}
        items={mockItems}
        onSelectItem={vi.fn()}
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    )
    expect(screen.getByText('集合')).toBeInTheDocument()
    expect(screen.getByText('概念')).toBeInTheDocument()
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('↗ 上升')).toBeInTheDocument()
    expect(screen.getByText('↘ 下降')).toBeInTheDocument()
  })

  it('shows empty state for weak mode with no items', () => {
    render(
      <SmartLearningNav
        mode="weak"
        onModeChange={vi.fn()}
        items={[]}
        onSelectItem={vi.fn()}
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    )
    expect(screen.getByText('恭喜！暂无薄弱知识点')).toBeInTheDocument()
    expect(screen.getByText('切换到随机模式')).toBeInTheDocument()
  })

  it('calls onSelectItem when clicking an item', () => {
    const onSelect = vi.fn()
    render(
      <SmartLearningNav
        mode="weak"
        onModeChange={vi.fn()}
        items={mockItems}
        onSelectItem={onSelect}
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('1.1.1'))
    expect(onSelect).toHaveBeenCalledWith(mockItems[0])
  })

  it('calls onModeChange when clicking a tab', () => {
    const onModeChange = vi.fn()
    render(
      <SmartLearningNav
        mode="weak"
        onModeChange={onModeChange}
        items={mockItems}
        onSelectItem={vi.fn()}
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('随机'))
    expect(onModeChange).toHaveBeenCalledWith('random')
  })
})
```

- [ ] **Step 4: Run component tests**

Run: `pnpm --filter web test --run -- src/components/smart-learning/__tests__/SmartLearningNav.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/smart-learning/SmartLearningNav.tsx \
  web/src/components/smart-learning/SmartLearningNav.module.css \
  web/src/components/smart-learning/__tests__/SmartLearningNav.test.tsx
git commit -m "feat(web): add SmartLearningNav with grouped recommendation list"
```

---

## Task 5: StudyGoalTracker Component

**Files:**
- Create: `web/src/components/smart-learning/StudyGoalTracker.tsx`
- Create: `web/src/components/smart-learning/StudyGoalTracker.module.css`
- Create: `web/src/components/smart-learning/__tests__/StudyGoalTracker.test.tsx`

- [ ] **Step 1: Create the component**

Create `web/src/components/smart-learning/StudyGoalTracker.tsx`:

```typescript
import React, { useState } from 'react'
import { Progress, Button, Modal, InputNumber, Typography } from 'antd'
import { SettingOutlined, CheckCircleOutlined } from '@ant-design/icons'

export interface StudyGoalTrackerProps {
  studiedCount: number
  goalCount: number
  onGoalChange: (goal: number) => void
}

const { Text } = Typography

export const StudyGoalTracker: React.FC<StudyGoalTrackerProps> = ({
  studiedCount,
  goalCount,
  onGoalChange,
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [tempGoal, setTempGoal] = useState(goalCount)

  const isCompleted = goalCount > 0 && studiedCount >= goalCount
  const percent = goalCount > 0 ? Math.min(100, Math.round((studiedCount / goalCount) * 100)) : 0

  const handleSave = () => {
    onGoalChange(tempGoal)
    setModalOpen(false)
  }

  return (
    <div className="study-goal-tracker" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {isCompleted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a' }}>
          <CheckCircleOutlined />
          <Text strong>今日目标达成！继续保持</Text>
        </div>
      ) : (
        <>
          <Text>
            今日已复习 {studiedCount}
            {goalCount > 0 ? ` / ${goalCount}` : ''} 个薄弱点
          </Text>
          {goalCount > 0 && <Progress percent={percent} size="small" style={{ width: 120 }} />}
        </>
      )}
      <Button icon={<SettingOutlined />} size="small" onClick={() => setModalOpen(true)} />

      <Modal
        title="设定今日学习目标"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <div style={{ margin: '16px 0' }}>
          <Text>每日复习目标数量（1-20）：</Text>
          <InputNumber
            min={1}
            max={20}
            value={tempGoal}
            onChange={val => setTempGoal(val ?? 1)}
            style={{ marginLeft: 12, width: 80 }}
          />
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Create the CSS module**

Create `web/src/components/smart-learning/StudyGoalTracker.module.css`:

```css
.tracker {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 8px;
}
```

- [ ] **Step 3: Write tests**

Create `web/src/components/smart-learning/__tests__/StudyGoalTracker.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudyGoalTracker } from '../StudyGoalTracker'

describe('StudyGoalTracker', () => {
  it('displays progress with goal', () => {
    render(<StudyGoalTracker studiedCount={3} goalCount={10} onGoalChange={vi.fn()} />)
    expect(screen.getByText('今日已复习 3 / 10 个薄弱点')).toBeInTheDocument()
  })

  it('displays count without goal', () => {
    render(<StudyGoalTracker studiedCount={3} goalCount={0} onGoalChange={vi.fn()} />)
    expect(screen.getByText('今日已复习 3 个薄弱点')).toBeInTheDocument()
  })

  it('shows completion state when goal reached', () => {
    render(<StudyGoalTracker studiedCount={10} goalCount={10} onGoalChange={vi.fn()} />)
    expect(screen.getByText('今日目标达成！继续保持')).toBeInTheDocument()
  })

  it('opens settings modal', () => {
    render(<StudyGoalTracker studiedCount={0} goalCount={5} onGoalChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('设定今日学习目标')).toBeInTheDocument()
  })

  it('calls onGoalChange with new value', () => {
    const onGoalChange = vi.fn()
    render(<StudyGoalTracker studiedCount={0} goalCount={5} onGoalChange={onGoalChange} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.click(screen.getByText('确定'))
    expect(onGoalChange).toHaveBeenCalledWith(8)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web test --run -- src/components/smart-learning/__tests__/StudyGoalTracker.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/smart-learning/StudyGoalTracker.tsx \
  web/src/components/smart-learning/StudyGoalTracker.module.css \
  web/src/components/smart-learning/__tests__/StudyGoalTracker.test.tsx
git commit -m "feat(web): add StudyGoalTracker with goal setting modal"
```

---

## Task 6: Rewrite SmartLearningPage

**Files:**
- Modify: `web/src/pages/smart-learning/SmartLearningPage.tsx`
- Modify: `web/src/pages/smart-learning/SmartLearningPage.module.css`

- [ ] **Step 1: Rewrite SmartLearningPage**

Replace `web/src/pages/smart-learning/SmartLearningPage.tsx`:

```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { App } from 'antd'
import { ResizableLayout } from '../../components/Layout/ResizableLayout'
import { SmartLearningNav } from '../../components/smart-learning/SmartLearningNav'
import { StudyGoalTracker } from '../../components/smart-learning/StudyGoalTracker'
import { MarkdownPreview } from '../../components/MarkdownPreview'
import { KnowledgeOverview } from '../../components/KnowledgeOverview'
import { FeedbackPanel } from '../../components/learning/FeedbackPanel'
import { AIFab } from '../../components/learning/AIFab'
import { useRecommendations, type RecommendationMode } from '../../hooks/useRecommendations'
import { useRefreshRecommendations } from '../../hooks/useRecommendations'
import { knowledgeApi } from '../../services/knowledgeApi'
import type { UnifiedRecommendationItem } from '../../hooks/useRecommendations'
import styles from './SmartLearningPage.module.css'

const SmartLearningPage: React.FC = () => {
  const { message } = App.useApp()
  const [mode, setMode] = useState<RecommendationMode>('weak')
  const [selectedItem, setSelectedItem] = useState<UnifiedRecommendationItem | null>(null)
  const [content, setContent] = useState('')
  const [detail, setDetail] = useState<{ definition?: string; characteristics?: string; importanceLevel?: string }>({})
  const [contentLoading, setContentLoading] = useState(false)
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set())
  const [goalCount, setGoalCount] = useState(5)
  const [showNextCta, setShowNextCta] = useState(false)

  const { items, isLoading, refetch } = useRecommendations(mode)
  const { refresh } = useRefreshRecommendations()

  // Default select first item when list loads or mode changes
  useEffect(() => {
    if (items.length > 0 && (!selectedItem || !items.find(i => i.id === selectedItem.id))) {
      setSelectedItem(items[0])
    }
  }, [items, selectedItem])

  // Load content when selection changes
  useEffect(() => {
    if (!selectedItem) return
    setContentLoading(true)
    knowledgeApi
      .getKnowledgePointDetail(selectedItem.id)
      .then(d => {
        setContent(d.content || d.definition || '暂无内容')
        setDetail({
          definition: d.definition || undefined,
          characteristics: d.characteristics || undefined,
          importanceLevel: d.importanceLevel,
        })
      })
      .catch(() => {
        message.error('加载内容失败')
        setContent('加载失败')
      })
      .finally(() => setContentLoading(false))
  }, [selectedItem, message])

  const handleModeChange = useCallback(
    (newMode: RecommendationMode) => {
      setMode(newMode)
      setShowNextCta(false)
      // selectedItem reset is handled by the useEffect above
    },
    [],
  )

  const handleSelectItem = useCallback((item: UnifiedRecommendationItem) => {
    setSelectedItem(item)
    setShowNextCta(false)
  }, [])

  const handleSubmitSuccess = useCallback(() => {
    if (selectedItem) {
      setStudiedIds(prev => new Set([...prev, selectedItem.id]))
    }
    setShowNextCta(true)
  }, [selectedItem])

  const handleNextRecommendation = useCallback(() => {
    if (!selectedItem || items.length === 0) return
    const currentIndex = items.findIndex(i => i.id === selectedItem.id)
    const nextItem = items[currentIndex + 1]
    if (nextItem) {
      setSelectedItem(nextItem)
      setShowNextCta(false)
    }
  }, [selectedItem, items])

  const isLastItem = useMemo(() => {
    if (!selectedItem || items.length === 0) return false
    return items.findIndex(i => i.id === selectedItem.id) === items.length - 1
  }, [selectedItem, items])

  const handleRefresh = useCallback(() => {
    refresh(mode)
    refetch()
  }, [mode, refresh, refetch])

  // Export handlers
  const handleExportMarkdown = useCallback(() => {
    if (!selectedItem) return
    const parts: string[] = []
    parts.push(`# ${selectedItem.name}`)
    parts.push(`\n**编号**: ${selectedItem.code}`)
    if (detail.importanceLevel) {
      parts.push(`**重要性**: ${detail.importanceLevel}`)
    }
    if (detail.definition) {
      parts.push(`\n## 定义\n\n${detail.definition}`)
    }
    if (content && content !== '暂无内容') {
      parts.push(`\n## 详细内容\n\n${content}`)
    }
    const blob = new Blob([parts.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeTitle = selectedItem.name.replace(/[^\w一-龥]/g, '_') || 'knowledge'
    a.download = `${selectedItem.code || 'export'}-${safeTitle}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [selectedItem, detail, content])

  const leftPanel = (
    <SmartLearningNav
      mode={mode}
      onModeChange={handleModeChange}
      items={items}
      selectedId={selectedItem?.id}
      onSelectItem={handleSelectItem}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  )

  const centerPanel = (
    <div className={styles.contentArea}>
      <div className={styles.contentHeader}>
        <StudyGoalTracker
          studiedCount={studiedIds.size}
          goalCount={goalCount}
          onGoalChange={setGoalCount}
        />
        <button className={styles.exportBtn} onClick={handleExportMarkdown}>
          导出 Markdown
        </button>
      </div>
      <div className={styles.exportArea}>
        <KnowledgeOverview
          definition={detail.definition}
          characteristics={detail.characteristics}
          importanceLevel={detail.importanceLevel}
        />
        <MarkdownPreview content={content} loading={contentLoading} />
      </div>
    </div>
  )

  const bottomPanel = selectedItem ? (
    <div className={styles.feedbackArea}>
      <FeedbackPanel
        key={selectedItem.id}
        knowledgePointId={selectedItem.id}
        onSubmitSuccess={handleSubmitSuccess}
      />
      {showNextCta && (
        <div className={styles.nextCta}>
          {isLastItem ? (
            <button className={styles.ctaBtn} onClick={handleRefresh}>
              已学完当前列表，刷新查看新推荐
            </button>
          ) : (
            <button className={styles.ctaBtn} onClick={handleNextRecommendation}>
              继续学习下一个推荐
            </button>
          )}
        </div>
      )}
    </div>
  ) : null

  return (
    <div className={styles.page}>
      <ResizableLayout
        leftPanel={leftPanel}
        centerPanel={centerPanel}
        bottomPanel={bottomPanel}
        showBottomPanel={!!selectedItem}
        defaultSizes={{ left: 320, center: 600, bottom: 220 }}
      />
      <AIFab
        knowledgePointId={selectedItem?.id}
        knowledgePointTitle={selectedItem?.name}
      />
    </div>
  )
}

export default SmartLearningPage
```

- [ ] **Step 2: Rewrite CSS module**

Replace `web/src/pages/smart-learning/SmartLearningPage.module.css`:

```css
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.contentArea {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.contentHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.exportBtn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
}

.exportBtn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.exportArea {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.feedbackArea {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.nextCta {
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.ctaBtn {
  padding: 6px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.ctaBtn:hover {
  background: #40a9ff;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/smart-learning/
git commit -m "feat(web): rewrite SmartLearningPage with three-pane layout"
```

---

## Task 7: Integration Tests for SmartLearningPage

**Files:**
- Create: `web/src/pages/smart-learning/__tests__/SmartLearningPage.test.tsx`

- [ ] **Step 1: Write integration tests**

Create `web/src/pages/smart-learning/__tests__/SmartLearningPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SmartLearningPage from '../SmartLearningPage'
import { smartLearningApi } from '../../../services/smartLearningApi'
import { knowledgeApi } from '../../../services/knowledgeApi'

vi.mock('../../../services/smartLearningApi')
vi.mock('../../../services/knowledgeApi')
vi.mock('../../../components/learning/FeedbackPanel', () => ({
  FeedbackPanel: ({ onSubmitSuccess }: { onSubmitSuccess?: () => void }) => (
    <button onClick={onSubmitSuccess}>提交反馈</button>
  ),
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('SmartLearningPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.resetAllMocks()
  })

  it('renders nav with weak points by default', async () => {
    vi.mocked(smartLearningApi.getWeakPoints).mockResolvedValue({
      total: 1,
      items: [
        {
          knowledgePoint: {
            id: '1', code: '1.1.1', level1: '集合', level2: '概念', level3: '元素',
            importanceLevel: 'A', definition: '定义',
          },
          learningRecord: {
            id: 'r1', masteryLevel: 'D', durationMinutes: 30,
            startTime: new Date().toISOString(), notes: null,
          },
          priority: 80, recommendationReason: '测试', improvementVelocity: 0,
        },
      ],
    })
    vi.mocked(knowledgeApi.getKnowledgePointDetail).mockResolvedValue({
      id: '1', content: '# 测试内容', definition: '定义', importanceLevel: 'A',
    })

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByText('薄弱点')).toBeInTheDocument())
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
  })

  it('shows next recommendation CTA after feedback submit', async () => {
    vi.mocked(smartLearningApi.getWeakPoints).mockResolvedValue({
      total: 2,
      items: [
        {
          knowledgePoint: {
            id: '1', code: '1.1.1', level1: 'A', level2: 'B', level3: 'C',
            importanceLevel: 'A', definition: '',
          },
          learningRecord: {
            id: 'r1', masteryLevel: 'D', durationMinutes: 30,
            startTime: new Date().toISOString(), notes: null,
          },
          priority: 80, recommendationReason: '', improvementVelocity: 0,
        },
        {
          knowledgePoint: {
            id: '2', code: '1.1.2', level1: 'A', level2: 'B', level3: 'D',
            importanceLevel: 'A', definition: '',
          },
          learningRecord: {
            id: 'r2', masteryLevel: 'E', durationMinutes: 30,
            startTime: new Date().toISOString(), notes: null,
          },
          priority: 90, recommendationReason: '', improvementVelocity: 0,
        },
      ],
    })
    vi.mocked(knowledgeApi.getKnowledgePointDetail).mockResolvedValue({
      id: '1', content: '', definition: '', importanceLevel: 'A',
    })

    render(<SmartLearningPage />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByText('提交反馈')).toBeInTheDocument())
    fireEvent.click(screen.getByText('提交反馈'))

    await waitFor(() => expect(screen.getByText('继续学习下一个推荐')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter web test --run -- src/pages/smart-learning/__tests__/SmartLearningPage.test.tsx`

Expected: PASS (or identify mock issues and fix)

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/smart-learning/__tests__/
git commit -m "test(web): add SmartLearningPage integration tests"
```

---

## Task 8: Quality Gates

- [ ] **Step 1: Run typecheck**

Run: `pnpm --filter web typecheck`

Expected: Zero errors

- [ ] **Step 2: Run lint**

Run: `pnpm --filter web lint`

Expected: Zero errors

- [ ] **Step 3: Run all new tests**

Run:
```bash
pnpm --filter web test --run -- src/hooks/__tests__/useRecommendations.test.ts
pnpm --filter web test --run -- src/components/smart-learning/__tests__/
pnpm --filter web test --run -- src/pages/smart-learning/__tests__/
```

Expected: All PASS

- [ ] **Step 4: Run regression tests for LearningPage**

Run:
```bash
pnpm --filter web test --run -- src/pages/LearningPage
pnpm --filter web test --run -- src/components/learning
```

Expected: No new failures (pre-existing failures are acceptable)

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(web): quality gates pass for smart learning UI unification"
```

---

## Task 9: Manual Verification

- [ ] **Step 1: Start dev servers**

```bash
# Terminal 1
pnpm dev:server

# Terminal 2
pnpm dev
```

- [ ] **Step 2: Verify golden path**

1. Login and navigate to `/smart-learning`
2. Confirm: 薄弱点 tab 默认选中，列表显示，第一个知识点自动选中
3. Confirm: 中间内容区渲染 Markdown + KnowledgeOverview
4. Confirm: 底部 FeedbackPanel 显示
5. Submit feedback → confirm "继续学习下一个推荐" CTA 出现
6. Click CTA → confirm next item selected, content updates, FeedbackPanel resets

- [ ] **Step 3: Verify mode switching**

1. Click "重要性" tab → confirm list updates, first item auto-selected
2. Click "随机" tab → confirm list updates
3. Switch back to "薄弱点" → confirm selection preserved if item still in list

- [ ] **Step 4: Verify goal tracking**

1. Click settings icon on StudyGoalTracker
2. Set goal to 2
3. Complete 2 feedback submissions
4. Confirm "今日目标达成" message appears

- [ ] **Step 5: Verify no LearningPage regression**

1. Navigate to `/learning/:textbookId`
2. Confirm: knowledge tree, markdown preview, feedback panel all work
3. Confirm: export Markdown works

- [ ] **Step 6: Commit verification notes**

```bash
git commit --allow-empty -m "verify: manual testing complete for unify-smart-learning-ui"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| 三栏布局 (ResizableLayout) | Task 6 |
| 知识点内容渲染 (MarkdownPreview + KnowledgeOverview) | Task 6 |
| 反馈面板复用 (FeedbackPanel) | Task 6 |
| AI 学习助手保留 (AIFab) | Task 6 |
| 推荐模式切换 tabs | Task 4 |
| 薄弱点列表按 level1/level2 分组折叠 | Task 4 |
| 列表项信息展示 (编码/名称/掌握度/推荐理由/趋势/时间) | Task 4 |
| 列表刷新按钮 | Task 4 |
| 列表加载状态 (骨架屏) | Task 4 |
| 空状态 + 切换到随机模式快捷入口 | Task 4 |
| improvementVelocity 趋势标识 | Task 4 |
| 学习进度追踪 (StudyGoalTracker) | Task 5 |
| 目标设定弹窗 (1-20) | Task 5 |
| 目标达成状态 | Task 5 |
| 提交反馈后"继续学习下一个推荐"CTA | Task 6 |
| 点击 CTA 加载下一个知识点 | Task 6 |
| 最后一个推荐完成后的刷新提示 | Task 6 |
| 状态不持久化 | Task 6 (useState only) |
| 跨模式保持选中 | Task 6 |
| 提交反馈后不自动刷新列表 | Task 6 (no invalidate on submit) |
| 内容导出 (Markdown) | Task 6 |

**Gap: None identified.**

### Placeholder Scan

- No "TBD", "TODO", "implement later" found
- No vague "add appropriate error handling" instructions
- All test code is complete with assertions
- All file paths are exact

### Type Consistency

- `RecommendationMode` type used consistently across `useRecommendations`, `SmartLearningNav`, and `SmartLearningPage`
- `UnifiedRecommendationItem` type used in hook, nav, and page
- `improvementVelocity: number` consistent in DTO, service, API types, and component props
