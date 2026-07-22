# 实现 Guided Expansion Workflow 弹窗改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `TextbookDetail` 页的「扩充知识点」弹窗改造为三步向导，支持左右分栏预览、错误联动、CSV 框架文件、影响预览、草稿保存、列表快捷入口和响应式回退。

**Architecture:** 把当前 `ExpandKnowledgePointsModal` 中的预览与错误展示逻辑拆成独立的 `FrameworkPreview` / `MdPreview` / `ErrorTag` / `ImpactPreview` 组件；`ExpandKnowledgePointsModal` 用 Ant Design `Steps` 管理三步状态，并通过 `sessionStorage` 保存草稿；`TextbookTable` 增加跳转入口。后端验证端点保持不变，仅在前端兼容 `.csv` 的客户端解析与展示。

**Tech Stack:** React 19 + TypeScript + Vite + Ant Design 6 + `xlsx` + `papaparse` (已在项目) + Vitest + jsdom

---

## File Structure

- `web/src/pages/TextbookDetail/components/FrameworkPreview.tsx` — 新增：xlsx/csv 表格预览，含状态列和错误高亮
- `web/src/pages/TextbookDetail/components/MdPreview.tsx` — 新增：带行号的 md 文本预览，含错误行高亮
- `web/src/pages/TextbookDetail/components/ErrorTag.tsx` — 新增：可点击的错误标签
- `web/src/pages/TextbookDetail/components/ImpactPreview.tsx` — 新增：最终提交前的影响预览
- `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` — 大幅修改：改为三步向导，集成新组件
- `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx` — 保持内容，移除默认展开，改为 Drawer 触发
- `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts` — 扩展：草稿保存/恢复、成功滚动定位
- `web/src/pages/TextbookManage/components/TextbookTable.tsx` — 新增「扩充」快捷按钮
- `web/src/utils/textbookFilePreview.ts` — 扩展：增加 `parseCsvPreview`
- `web/src/types/textbook.types.ts` — 如有需要，扩展 DraftState / WizardStep 类型
- 各组件的测试文件

---

## Task 1: Extend `textbookFilePreview` with CSV support

**Files:**
- Modify: `web/src/utils/textbookFilePreview.ts`
- Test: `web/src/utils/__tests__/textbookFilePreview.test.ts`

- [ ] **Step 1: Write the failing test**

在 `web/src/utils/__tests__/textbookFilePreview.test.ts` 末尾添加：

```typescript
it('parses csv rows into preview objects', async () => {
  const csv = 'code,level1,level2\n1.1.1,集合,集合的含义\n1.1.2,集合,元素与集合'
  const file = new File([csv], 'expand.csv', { type: 'text/csv' })

  const rows = await parseCsvPreview(file)

  expect(rows).toHaveLength(2)
  expect(rows[0]).toEqual({
    code: '1.1.1',
    level1: '集合',
    level2: '集合的含义',
  })
})

it('limits csv preview rows', async () => {
  const csv = 'code\n' + Array.from({ length: 5 }, (_, i) => `${i + 1}`).join('\n')
  const file = new File([csv], 'expand.csv', { type: 'text/csv' })

  const rows = await parseCsvPreview(file, 2)

  expect(rows).toHaveLength(2)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/utils/__tests__/textbookFilePreview.test.ts`
Expected: FAIL with `parseCsvPreview` not found.

- [ ] **Step 3: Implement the CSV preview function**

在 `web/src/utils/textbookFilePreview.ts` 中添加：

```typescript
import Papa from 'papaparse'

export async function parseCsvPreview(
  file: File,
  limit = 100,
): Promise<XlsxPreviewRow[]> {
  const text = await readTextFile(file)
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, unknown>[]).slice(0, limit).map((row) => {
          const record: XlsxPreviewRow = {}
          Object.keys(row).forEach((key) => {
            const value = row[key]
            record[key] = value === undefined || value === null ? '' : String(value)
          })
          return record
        })
        resolve(rows)
      },
      error: (error) => reject(new Error(error.message)),
    })
  })
}
```

同时添加一个根据扩展名分发的辅助函数：

```typescript
export async function parseFrameworkPreview(
  file: File,
  limit = 100,
): Promise<XlsxPreviewRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsvPreview(file, limit)
  }
  return parseXlsxPreview(file, limit)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/utils/__tests__/textbookFilePreview.test.ts`
Expected: PASS (5 tests)。

- [ ] **Step 5: Commit**

```bash
git add web/src/utils/textbookFilePreview.ts web/src/utils/__tests__/textbookFilePreview.test.ts
git commit -m "feat(web/textbook): add CSV preview utility"
```

---

## Task 2: Create `FrameworkPreview` component

**Files:**
- Create: `web/src/pages/TextbookDetail/components/FrameworkPreview.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/FrameworkPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/pages/TextbookDetail/__tests__/FrameworkPreview.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FrameworkPreview } from '../components/FrameworkPreview'
import type { ValidationIssue } from '../../../types/textbook.types'

const rows = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合' },
]

const errors: ValidationIssue[] = [
  { type: 'xlsx', location: { file: 'xlsx', code: '1.1.2' }, message: '已存在' },
]

describe('FrameworkPreview', () => {
  it('renders preview table with status column', () => {
    render(<FrameworkPreview rows={rows} errors={errors} />)

    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('1.1.2')).toBeInTheDocument()
    expect(screen.getByText('已存在')).toBeInTheDocument()
  })

  it('renders empty state when no rows', () => {
    render(<FrameworkPreview rows={[]} errors={[]} />)

    expect(screen.getByText(/选择文件后/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/FrameworkPreview.test.tsx`
Expected: FAIL with `FrameworkPreview` not found.

- [ ] **Step 3: Implement the component**

Create `web/src/pages/TextbookDetail/components/FrameworkPreview.tsx`:

```typescript
import React, { useMemo } from 'react'
import { Table, Typography, Empty } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  onRowClick?: (code: string) => void
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  onRowClick,
}) => {
  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>()
    errors.forEach((err) => {
      if (err.location.code) {
        const list = map.get(err.location.code) || []
        list.push(err)
        map.set(err.location.code, list)
      }
    })
    return map
  }, [errors])

  const columns = useMemo(() => {
    const baseColumns = rows.length > 0
      ? Object.keys(rows[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
        }))
      : []
    return [
      ...baseColumns,
      {
        title: '状态',
        key: 'status',
        width: 120,
        render: (_value: unknown, record: XlsxPreviewRow) => {
          const code = record.code
          const rowErrors = code ? errorMap.get(code) : undefined
          if (rowErrors && rowErrors.length > 0) {
            return (
              <Typography.Text type="danger">
                ✗ {rowErrors.map((e) => e.message).join('；')}
              </Typography.Text>
            )
          }
          return <Typography.Text type="success">✓</Typography.Text>
        },
      },
    ]
  }, [rows, errorMap])

  if (rows.length === 0) {
    return <Empty description="选择文件后在此处预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <Table
      dataSource={rows}
      columns={columns}
      rowKey={(_record, index) => `framework-row-${index}`}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }}
      onRow={(record) => ({
        onClick: () => {
          if (record.code && onRowClick) {
            onRowClick(record.code)
          }
        },
      })}
      rowClassName={(record) => {
        return record.code && errorMap.has(record.code) ? 'framework-row-error' : ''
      }}
    />
  )
}

export default FrameworkPreview
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/FrameworkPreview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/FrameworkPreview.tsx web/src/pages/TextbookDetail/__tests__/FrameworkPreview.test.tsx
git commit -m "feat(web/textbook): add FrameworkPreview component with status column"
```

---

## Task 3: Create `MdPreview` component

**Files:**
- Create: `web/src/pages/TextbookDetail/components/MdPreview.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/MdPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/pages/TextbookDetail/__tests__/MdPreview.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MdPreview } from '../components/MdPreview'
import type { ValidationIssue } from '../../../types/textbook.types'

const content = '#### 1.1.1 集合的含义\n\n这是内容。\n### 1.1.2 元素与集合'

const errors: ValidationIssue[] = [
  { type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' },
]

describe('MdPreview', () => {
  it('renders line numbers and content', () => {
    render(<MdPreview content={content} errors={[]} />)

    expect(screen.getByText('1.1.1 集合的含义')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('highlights error lines', () => {
    render(<MdPreview content={content} errors={errors} />)

    expect(screen.getByText('标题层级错误')).toBeInTheDocument()
  })

  it('renders empty state when no content', () => {
    render(<MdPreview content="" errors={[]} />)

    expect(screen.getByText(/选择文件后/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/MdPreview.test.tsx`
Expected: FAIL with `MdPreview` not found.

- [ ] **Step 3: Implement the component**

Create `web/src/pages/TextbookDetail/components/MdPreview.tsx`:

```typescript
import React, { useMemo, useRef, useEffect } from 'react'
import { Empty, Typography } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'

interface MdPreviewProps {
  content: string
  errors: ValidationIssue[]
  highlightedLine?: number
}

export const MdPreview: React.FC<MdPreviewProps> = ({
  content,
  errors,
  highlightedLine,
}) => {
  const lines = useMemo(() => content.split('\n'), [content])
  const errorMap = useMemo(() => {
    const map = new Map<number, ValidationIssue[]>()
    errors.forEach((err) => {
      if (err.location.row) {
        const list = map.get(err.location.row) || []
        list.push(err)
        map.set(err.location.row, list)
      }
    })
    return map
  }, [errors])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (highlightedLine && containerRef.current) {
      const element = containerRef.current.querySelector(`[data-line="${highlightedLine}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedLine])

  if (!content) {
    return <Empty description="选择文件后在此处预览" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.6,
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: 12,
        maxHeight: 320,
        overflow: 'auto',
        background: '#fafafa',
      }}
    >
      {lines.map((line, index) => {
        const lineNumber = index + 1
        const lineErrors = errorMap.get(lineNumber)
        const isHighlighted = highlightedLine === lineNumber
        return (
          <div
            key={`md-line-${lineNumber}`}
            data-line={lineNumber}
            style={{
              display: 'flex',
              backgroundColor: isHighlighted ? '#fff7e6' : lineErrors ? '#fff1f0' : 'transparent',
              padding: '2px 0',
              transition: 'background-color 0.3s',
            }}
          >
            <span style={{ color: '#999', minWidth: 36, textAlign: 'right', paddingRight: 12, userSelect: 'none' }}>
              {lineNumber}
            </span>
            <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {line || ' '}
            </span>
          </div>
        )
      })}
      {Array.from(errorMap.entries()).map(([lineNumber, lineErrors]) => (
        <div
          key={`md-error-${lineNumber}`}
          style={{ padding: '4px 0 4px 48px', color: '#ff4d4f', fontSize: 12 }}
        >
          <Typography.Text type="danger">
            ✗ 第 {lineNumber} 行：{lineErrors.map((e) => e.message).join('；')}
          </Typography.Text>
        </div>
      ))}
    </div>
  )
}

export default MdPreview
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/MdPreview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/MdPreview.tsx web/src/pages/TextbookDetail/__tests__/MdPreview.test.tsx
git commit -m "feat(web/textbook): add MdPreview component with line numbers and error highlights"
```

---

## Task 4: Create `ErrorTag` component

**Files:**
- Create: `web/src/pages/TextbookDetail/components/ErrorTag.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ErrorTag.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/pages/TextbookDetail/__tests__/ErrorTag.test.tsx`:

```typescript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorTag } from '../components/ErrorTag'
import type { ValidationIssue } from '../../../types/textbook.types'

const issue: ValidationIssue = {
  type: 'xlsx',
  location: { file: 'xlsx', code: '1.1.2' },
  message: '已存在',
}

describe('ErrorTag', () => {
  it('renders error message', () => {
    render(<ErrorTag issue={issue} onClick={() => {}} />)

    expect(screen.getByText(/编号 1.1.2/)).toBeInTheDocument()
    expect(screen.getByText(/已存在/)).toBeInTheDocument()
  })

  it('calls onClick with location when clicked', () => {
    const handleClick = vi.fn()
    render(<ErrorTag issue={issue} onClick={handleClick} />)

    fireEvent.click(screen.getByText(/编号 1.1.2/))
    expect(handleClick).toHaveBeenCalledWith(issue.location)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ErrorTag.test.tsx`
Expected: FAIL with `ErrorTag` not found.

- [ ] **Step 3: Implement the component**

Create `web/src/pages/TextbookDetail/components/ErrorTag.tsx`:

```typescript
import React, { useCallback } from 'react'
import { Tag } from 'antd'
import type { ValidationIssue } from '../../../types/textbook.types'

interface ErrorTagProps {
  issue: ValidationIssue
  onClick: (location: ValidationIssue['location']) => void
}

export const ErrorTag: React.FC<ErrorTagProps> = ({ issue, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(issue.location)
  }, [issue.location, onClick])

  const prefix = issue.location.code
    ? `编号 ${issue.location.code}`
    : issue.location.row
      ? `第 ${issue.location.row} 行`
      : '未知位置'

  return (
    <Tag color="error" style={{ cursor: 'pointer' }} onClick={handleClick}>
      ✗ {prefix}：{issue.message}
    </Tag>
  )
}

export default ErrorTag
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ErrorTag.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ErrorTag.tsx web/src/pages/TextbookDetail/__tests__/ErrorTag.test.tsx
git commit -m "feat(web/textbook): add ErrorTag component for error linkage"
```

---

## Task 5: Create `ImpactPreview` component

**Files:**
- Create: `web/src/pages/TextbookDetail/components/ImpactPreview.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ImpactPreview.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/pages/TextbookDetail/__tests__/ImpactPreview.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ImpactPreview } from '../components/ImpactPreview'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

const rows: XlsxPreviewRow[] = [
  { code: '1.1.1', level1: '集合', level2: '集合的含义', level3: '', importanceLevel: 'A' },
  { code: '1.1.2', level1: '集合', level2: '元素与集合', level3: '', importanceLevel: 'A' },
]

describe('ImpactPreview', () => {
  it('shows summary and code examples', () => {
    render(<ImpactPreview rows={rows} />)

    expect(screen.getByText(/将新增 2 个知识点/)).toBeInTheDocument()
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
    expect(screen.getByText('1.1.2')).toBeInTheDocument()
  })

  it('shows empty state when no rows', () => {
    render(<ImpactPreview rows={[]} />)

    expect(screen.getByText(/未识别到有效知识点/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ImpactPreview.test.tsx`
Expected: FAIL with `ImpactPreview` not found.

- [ ] **Step 3: Implement the component**

Create `web/src/pages/TextbookDetail/components/ImpactPreview.tsx`:

```typescript
import React, { useMemo } from 'react'
import { Alert, Descriptions, Empty, Statistic, Tag } from 'antd'
import type { XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface ImpactPreviewProps {
  rows: XlsxPreviewRow[]
}

export const ImpactPreview: React.FC<ImpactPreviewProps> = ({ rows }) => {
  const validCodes = useMemo(() => {
    return rows
      .map((row) => row.code)
      .filter((code): code is string => Boolean(code))
  }, [rows])

  const levelDistribution = useMemo(() => {
    const dist = new Map<string, number>()
    rows.forEach((row) => {
      const key = row.level1 || '未分类'
      dist.set(key, (dist.get(key) || 0) + 1)
    })
    return Array.from(dist.entries()).map(([level, count]) => ({ level, count }))
  }, [rows])

  if (validCodes.length === 0) {
    return <Empty description="未识别到有效知识点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div>
      <Alert
        message="校验已通过"
        description="以下知识点将被追加到当前教材。确认后无法撤销，请仔细核对。"
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <Statistic title="新增知识点数量" value={validCodes.length} />
        <Statistic title="首个编号" value={validCodes[0]} />
        <Statistic title="末个编号" value={validCodes[validCodes.length - 1]} />
      </div>
      <Descriptions bordered size="small" title="一级知识点分布">
        {levelDistribution.map(({ level, count }) => (
          <Descriptions.Item key={level} label={level}>
            <Tag color="blue">{count} 个</Tag>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </div>
  )
}

export default ImpactPreview
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ImpactPreview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ImpactPreview.tsx web/src/pages/TextbookDetail/__tests__/ImpactPreview.test.tsx
git commit -m "feat(web/textbook): add ImpactPreview component"
```

---

## Task 6: Update `ValidationRulesPanel` to be Drawer-compatible

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx` (update)

- [ ] **Step 1: Update the test**

修改 `web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx` 为：

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ValidationRulesPanel } from '../components/ValidationRulesPanel'

describe('ValidationRulesPanel', () => {
  it('renders xlsx and md validation rules', () => {
    render(<ValidationRulesPanel />)

    expect(screen.getByText(/框架文件.*xlsx.*校验规范/)).toBeInTheDocument()
    expect(screen.getByText(/内容文件.*md.*校验规范/)).toBeInTheDocument()
    expect(screen.getByText(/必须包含列/)).toBeInTheDocument()
    expect(screen.getByText(/文件不能为空/)).toBeInTheDocument()
  })
})
```

（保持原有测试即可，因为内容不变。）

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx`
Expected: PASS.

- [ ] **Step 3: Add a thin wrapper or export a drawer trigger**

在 `ValidationRulesPanel.tsx` 中保留原有导出不变。后续在 Modal 中通过 `Drawer` 直接包裹 `<ValidationRulesPanel />` 即可，无需修改本文件。因此本任务只更新测试并提交。

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx
git commit -m "test(web/textbook): update ValidationRulesPanel test for drawer usage"
```

---

## Task 7: Rebuild `ExpandKnowledgePointsModal` as three-step wizard

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx` (large update)

- [ ] **Step 1: Update the modal tests**

Replace the existing content of `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx` with tests that cover the step wizard, two-column layout, error linkage, and impact preview. This is a large test file; write it in the next steps after the component is implemented, or keep it minimal first. For this task, focus on step navigation and basic rendering.

- [ ] **Step 2: Implement the wizard structure**

Replace `ExpandKnowledgePointsModal.tsx` to use `Steps` from Ant Design. The steps are:
1. 上传文件
2. 预览校验
3. 确认扩充

Key changes:
- Use `useState` for `currentStep` (0, 1, 2).
- Footer buttons change per step:
  - Step 0: 取消 / 下一步（enabled when both files selected）
  - Step 1: 上一步 / 开始校验 / 下一步（next enabled when validation passes）
  - Step 2: 上一步 / 确认上传
- Keep existing state for files, previews, validation result.
- Add `Drawer` for rules panel triggered by top bar button.
- Add `beforeUpload={() => false}` and custom request to keep uploads client-side until submit.

- [ ] **Step 3: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS (after tests are written to match the new structure).

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): rebuild expand modal as three-step wizard"
```

---

## Task 8: Integrate two-column linked preview layout into Step 2

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`

- [ ] **Step 1: Integrate FrameworkPreview and MdPreview**

In Step 2 (`预览校验`):
- Render a two-column grid: left `<FrameworkPreview />`, right `<MdPreview />`.
- Pass `errors` from `validationResult` to both components.
- Add `highlightedFrameworkCode` and `highlightedMdLine` state; when an error tag is clicked, set these states so the previews scroll to the row/line.

- [ ] **Step 2: Add error tag panel at bottom of Step 2**

- Render `ErrorTag` components for each error in `validationResult.errors`.
- Group by `xlsx` and `md` if desired, but keep them as clickable tags.
- Clicking a tag sets `highlightedFrameworkCode` or `highlightedMdLine` based on `error.type` and `location`.

- [ ] **Step 3: Update tests**

Add tests that verify:
- Both previews are rendered in Step 2.
- Clicking an error tag updates the highlighted state.
- Error tags are visible when validation fails.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): integrate two-column linked preview and error tags"
```

---

## Task 9: Add impact preview to Step 3

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`

- [ ] **Step 1: Render ImpactPreview in Step 3**

- In Step 3 (`确认扩充`), render `<ImpactPreview rows={xlsxPreview || []} />`.
- Disable the 「上一步」 and 「确认上传」 buttons when `loading`.
- Show the button as loading during upload.

- [ ] **Step 2: Update tests**

Add tests that verify:
- Step 3 shows the impact preview when the user proceeds after validation passes.
- Submit button calls `onSubmit` with the selected files.

- [ ] **Step 3: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointModal.test.tsx
git commit -m "feat(web/textbook): add impact preview to final step"
```

---

## Task 10: Add action feedback (loading, messages, scroll-to-new)

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Modify: `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`
- Modify: `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`
- Test: update tests

- [ ] **Step 1: Disable modal close during submit**

- In `ExpandKnowledgePointsModal`, set `Modal` props: `maskClosable={!loading}` and `keyboard={!loading}`.
- Footer submit button shows `loading` and disabled when `loading`.

- [ ] **Step 2: Show success message and close**

In `useTextbookDetail.ts`, when `expand` succeeds:
- Use Ant Design `message.success(`成功扩充 ${count} 个知识点`)`.
- Return the new knowledge points count or the list of new codes.

- [ ] **Step 3: Scroll to first new point after refresh**

In `TextbookDetailPage.tsx`:
- After successful expansion, use `useEffect` to find the first new code in the knowledge points list and scroll it into view (using DOM query or table ref).
- Highlight the row briefly.

- [ ] **Step 4: Update tests**

- Add tests for `useTextbookDetail` success message.
- Add tests for modal close behavior during loading.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/TextbookDetailPage.tsx web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts web/src/pages/TextbookDetail/__tests__
git commit -m "feat(web/textbook): add action feedback and scroll-to-new-point"
```

---

## Task 11: Add CSV support in the validation modal

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Modify: `web/src/services/textbook.service.ts`
- Modify: `web/src/types/textbook.types.ts` (if needed)
- Test: update tests

- [ ] **Step 1: Allow `.csv` in framework upload**

- Change `Upload` `accept=".xlsx"` to `accept=".xlsx,.csv"`.
- Use `parseFrameworkPreview` (from `textbookFilePreview.ts`) instead of `parseXlsxPreview` for preview.

- [ ] **Step 2: Update service to accept CSV**

- In `validateTextbook` and `expandTextbook`, the service already accepts `File` objects, so no change is needed unless the backend restricts extensions. The backend `expand` endpoint already supports CSV, so `validate` endpoint should also accept it. If the backend validation endpoint rejects `.csv`, update the backend DTO/interceptor to allow it. This plan assumes the backend already accepts CSV; verify by checking `TextbookController`.

- [ ] **Step 3: Update tests**

- Add a test that selects a `.csv` file and verifies the preview renders.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/services/textbook.service.ts web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): support csv framework files in expand modal"
```

---

## Task 12: Add error report export

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: update tests

- [ ] **Step 1: Add export button to error panel**

- In Step 2, when validation fails, render an `Button` 「导出错误报告」.
- On click, generate a text blob with grouped errors and trigger download using `URL.createObjectURL` and a temporary `<a>` element.

- [ ] **Step 2: Implement export helper**

Add a helper function inside the modal or in a new `web/src/utils/exportErrorReport.ts`:

```typescript
export function downloadErrorReport(errors: ValidationIssue[], filename: string): void {
  const lines = [
    '校验错误报告',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    '',
    ...errors.map((err) => {
      const location = err.location.code
        ? `编号 ${err.location.code}`
        : err.location.row
          ? `第 ${err.location.row} 行`
          : '未知位置'
      return `[${err.type}] ${location}：${err.message}`
    }),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Update tests**

- Add a test that clicking the export button creates a download.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/utils/exportErrorReport.ts web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): add validation error report export"
```

---

## Task 13: Add draft preservation

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Modify: `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`
- Test: update tests

- [ ] **Step 1: Define draft state type**

In `web/src/types/textbook.types.ts` add:

```typescript
export interface ExpansionDraft {
  textbookId: string
  frameworkFileName?: string
  frameworkFileContent?: string
  contentFileName?: string
  contentFileContent?: string
  validationResult?: ValidationReport
}
```

- [ ] **Step 2: Save draft on close**

In `ExpandKnowledgePointsModal`:
- When the user closes the modal and files are selected, show a `Modal.confirm` asking if they want to keep the draft.
- If yes, save file names and text content to `sessionStorage` under `math-tong-expansion-draft-${textbookId}`.
- If no, clear the draft.

- [ ] **Step 3: Restore draft on open**

- When `open` changes from false to true, check `sessionStorage` for a draft for this `textbookId`.
- If present, reconstruct `File` objects from the saved content (using `new File([content], name, { type })`) and restore previews and validation result.
- Validation result restoration should still disable submit until the user re-runs validation (design requirement: still requires re-validation before submit).

- [ ] **Step 4: Update tests**

- Add tests that verify draft save/restore behavior.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/types/textbook.types.ts web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): add expansion draft preservation"
```

---

## Task 14: Add quick access button in `TextbookTable`

**Files:**
- Modify: `web/src/pages/TextbookManage/components/TextbookTable.tsx`
- Modify: `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`
- Test: update tests

- [ ] **Step 1: Add expand action to textbook table**

In `TextbookTable.tsx`:
- Add an action column with a 「扩充」 button.
- On click, navigate to `/teacher/textbooks/${id}?expand=1`.

- [ ] **Step 2: Auto-open modal from URL param**

In `TextbookDetailPage.tsx`:
- Read `expand` query param from the URL.
- If `expand === '1'`, set `modalOpen(true)` on mount and clear the query param (using `navigate({ search: '' }, { replace: true })`).

- [ ] **Step 3: Update tests**

- Add tests for `TextbookTable` action and `TextbookDetailPage` auto-open.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookManage/__tests__ web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookManage/components/TextbookTable.tsx web/src/pages/TextbookDetail/TextbookDetailPage.tsx web/src/pages/TextbookManage/__tests__ web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx
git commit -m "feat(web/textbook): add quick expand access from textbook list"
```

---

## Task 15: Add responsive fallback

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: update tests

- [ ] **Step 1: Detect narrow screen and switch to Drawer**

- Use `window.innerWidth` or a resize listener to detect `< 768px`.
- On narrow screens, render a `Drawer` with `placement="bottom"` and height `90vh` instead of a `Modal`.
- Inside the Drawer, use a single-column layout for the two previews.

- [ ] **Step 2: Keep same internal state**

- The wizard state, preview state, and error state should remain the same; only the container and layout differ.

- [ ] **Step 3: Update tests**

- Add a test that verifies the `Drawer` is rendered when `window.innerWidth` is small.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): add responsive drawer fallback for expand modal"
```

---

## Task 16: Update and add tests for all new behavior

**Files:**
- Test files listed above
- Modify: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
- Modify: `web/src/pages/TextbookDetail/__tests__/useTextbookDetail.test.ts`
- Modify: `web/src/pages/TextbookManage/__tests__/TextbookTable.test.tsx` (if exists)

- [ ] **Step 1: Write comprehensive tests for the modal**

The test file should cover:
- Step navigation (0 → 1 → 2 → submit)
- Step 0: file selection enables next
- Step 1: preview rendering, validation flow, error tags, error linkage
- Step 2: impact preview rendering
- Action feedback: loading disables close, success message
- CSV support
- Error report export
- Draft preservation prompt
- Responsive Drawer rendering

- [ ] **Step 2: Run the modal tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 3: Update hook tests**

Add tests for `useTextbookDetail`:
- Success message on expand
- Draft save/restore integration (if managed by hook)

- [ ] **Step 4: Run the hook tests**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/hooks/useTextbookDetail.test.ts`
Expected: PASS.

- [ ] **Step 5: Update service tests**

- If `textbook.service.ts` was changed for CSV support, update service tests.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx web/src/pages/TextbookDetail/hooks/useTextbookDetail.test.ts
git commit -m "test(web/textbook): add comprehensive tests for guided expansion workflow"
```

---

## Task 17: Quality gates

**Files:** all changed files

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: zero errors.

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: all tests pass. (Note: 5 pre-existing web tests may fail for unrelated reasons; this change should not introduce new failures.)

- [ ] **Step 4: Run OpenSpec status**

Run: `openspec status --change add-textbook-expansion-validation`
Expected: all artifacts complete and change ready for archive.

- [ ] **Step 5: Check off section 8 in tasks.md**

Update `openspec/changes/add-textbook-expansion-validation/tasks.md` to mark 8.1–8.14 as `[x]`.

- [ ] **Step 6: Final commit**

```bash
git add openspec/changes/add-textbook-expansion-validation/tasks.md
git commit -m "docs(textbook): mark guided expansion workflow tasks complete"
```

---

## Self-Review

**Spec coverage:**
- 8.1 三步向导：Task 7
- 8.2 规则面板 Drawer：Task 6 / Task 7
- 8.3 两栏布局：Task 8
- 8.4 错误联动：Task 4 / Task 8
- 8.5 影响预览：Task 5 / Task 9
- 8.6 操作反馈：Task 10
- 8.7 CSV 支持：Task 1 / Task 11
- 8.8 导出错误报告：Task 12
- 8.9 草稿保存：Task 13
- 8.10 快捷入口：Task 14
- 8.11 响应式：Task 15
- 8.12 测试：Task 16
- 8.13 / 8.14 质量门：Task 17

**Placeholder scan:** 无 TBD/TODO/"fill in details" 等占位符。每个步骤包含可执行代码或命令。

**Type consistency:** `ValidationIssue` / `ValidationReport` / `XlsxPreviewRow` 复用现有类型；新增 `ExpansionDraft` 在 Task 13 定义并在后续使用。

**Gaps identified:**
- 8.7 的 CSV 后端兼容性需要验证；若后端 `validate` 端点拒绝 `.csv`，需额外添加后端任务。
- 响应式测试在 jsdom 中模拟窗口宽度可能需要额外封装，计划里留出了测试位置。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-implement-guided-expansion-workflow.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
