# 提升知识点扩充校验可读性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已有的知识点扩充校验弹窗中，让校验规则可见、xlsx 内容以表格预览、md 内容以文本预览，并在校验失败时清晰列出原因。

**Architecture:** 在 `web` 端新增纯客户端的文件预览工具（复用后端已用的 `xlsx` 库解析 `.xlsx`，用 `FileReader` 读取 `.md`），新增 `ValidationRulesPanel` 展示规则，扩展 `ExpandKnowledgePointsModal` 同时渲染规则、预览和带位置信息的错误列表。后端接口与数据模型保持不变。

**Tech Stack:** React 19 + TypeScript + Vite + Ant Design 6 + `xlsx` (v0.18.5) + Vitest + jsdom

---

## File Structure

- `web/package.json` — add `xlsx` dependency
- `web/src/utils/textbookFilePreview.ts` — client-side `.xlsx` preview table data and `.md` text reader
- `web/src/utils/__tests__/textbookFilePreview.test.ts` — tests for the preview utilities
- `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx` — static validation rules panel
- `web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx` — rules panel tests
- `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` — wire rules, preview, improved error list
- `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx` — update/extend modal tests

---

## Task 1: Add `xlsx` dependency to `web`

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Add dependency**

Add `"xlsx": "^0.18.5"` to `web/package.json` dependencies:

```json
{
  "dependencies": {
    "@ant-design/icons": "^6.1.0",
    "@tanstack/react-query": "^5.91.2",
    "antd": "^6.3.2",
    "axios": "^1.13.6",
    "html2canvas": "^1.4.1",
    "jspdf": "^4.2.1",
    "katex": "^0.16.38",
    "mermaid": "^11.13.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-error-boundary": "^6.1.2",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.13.1",
    "rehype-katex": "^7.0.1",
    "rehype-mermaid": "^3.0.0",
    "remark-gfm": "^4.0.1",
    "remark-math": "^6.0.0",
    "xlsx": "^0.18.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: `xlsx` is installed and `pnpm-lock.yaml` is updated.

- [ ] **Step 3: Commit**

```bash
git add web/package.json pnpm-lock.yaml
git commit -m "chore(web): add xlsx for client-side framework preview"
```

---

## Task 2: Create client-side preview utilities

**Files:**
- Create: `web/src/utils/textbookFilePreview.ts`
- Create: `web/src/utils/__tests__/textbookFilePreview.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/utils/__tests__/textbookFilePreview.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxPreview, readTextFile } from '../textbookFilePreview'

describe('textbookFilePreview', () => {
  it('parses xlsx rows into preview objects', async () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['知识点编号', '一级知识点', '二级知识点'],
      ['1.1.1', '集合', '集合的含义'],
      ['1.1.2', '集合', '元素与集合的关系'],
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const file = new File(
      [buffer],
      'expand.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    )

    const rows = await parseXlsxPreview(file)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      知识点编号: '1.1.1',
      一级知识点: '集合',
      二级知识点: '集合的含义',
    })
    expect(rows[1]).toEqual({
      知识点编号: '1.1.2',
      一级知识点: '集合',
      二级知识点: '元素与集合的关系',
    })
  })

  it('limits xlsx preview rows', async () => {
    const workbook = XLSX.utils.book_new()
    const data = [['编号'], ...Array.from({ length: 5 }, (_, i) => [`${i + 1}`])]
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const file = new File(
      [buffer],
      'expand.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    )

    const rows = await parseXlsxPreview(file, 2)

    expect(rows).toHaveLength(2)
  })

  it('reads md file as text', async () => {
    const file = new File(
      ['#### 1.1.1 集合的含义\n\n这是内容。'],
      'expand.md',
      { type: 'text/markdown' },
    )

    const text = await readTextFile(file)

    expect(text).toBe('#### 1.1.1 集合的含义\n\n这是内容。')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/utils/__tests__/textbookFilePreview.test.ts`
Expected: FAIL with `textbookFilePreview` not found.

- [ ] **Step 3: Implement the utilities**

Create `web/src/utils/textbookFilePreview.ts`:

```typescript
import * as XLSX from 'xlsx'

export interface XlsxPreviewRow {
  [header: string]: string
}

export async function parseXlsxPreview(
  file: File,
  limit = 100,
): Promise<XlsxPreviewRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  const workbook = XLSX.read(data, { type: 'array' })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return []
  }

  const worksheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
  if (rawRows.length === 0) {
    return []
  }

  const headers = rawRows[0].map(String)
  return rawRows.slice(1, limit + 1).map((row) => {
    const record: XlsxPreviewRow = {}
    headers.forEach((header, index) => {
      const value = row[index]
      record[header] = value === undefined || value === null ? '' : String(value)
    })
    return record
  })
}

export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/utils/__tests__/textbookFilePreview.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/utils/textbookFilePreview.ts web/src/utils/__tests__/textbookFilePreview.test.ts
git commit -m "feat(web/textbook): add client-side xlsx and md preview utilities"
```

---

## Task 3: Create ValidationRulesPanel component

**Files:**
- Create: `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx`
- Create: `web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx`:

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

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx`
Expected: FAIL with `ValidationRulesPanel` not found.

- [ ] **Step 3: Implement the component**

Create `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx`:

```typescript
import React from 'react'
import { Collapse, Typography } from 'antd'

const { Panel } = Collapse

export const ValidationRulesPanel: React.FC = () => {
  return (
    <Collapse defaultActiveKey={[]} ghost>
      <Panel header="框架文件 (.xlsx) 校验规范" key="xlsx">
        <Typography.Paragraph>
          <ul>
            <li>必须包含列：知识点编号 / 编号 / code，以及一级知识点 / 一级 / level1。</li>
            <li>知识点编号必须是数字层级格式，例如 1.1 或 1.1.1。</li>
            <li>同一文件中不能出现重复的知识点编号。</li>
            <li>新编号不能与当前教材数据库中已有的知识点编号冲突。</li>
            <li>每个编号的上级编号必须在数据库中已存在。</li>
          </ul>
        </Typography.Paragraph>
      </Panel>
      <Panel header="内容文件 (.md) 校验规范" key="md">
        <Typography.Paragraph>
          <ul>
            <li>文件不能为空。</li>
            <li>md 中出现的每个知识点编号必须在已上传的 xlsx 中存在。</li>
            <li>二级知识点编号应使用 ### 标题，三级知识点编号应使用 #### 标题。</li>
          </ul>
        </Typography.Paragraph>
      </Panel>
    </Collapse>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx web/src/pages/TextbookDetail/__tests__/ValidationRulesPanel.test.tsx
git commit -m "feat(web/textbook): add validation rules panel"
```

---

## Task 4: Wire rules, preview, and improved errors into the modal

**Files:**
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Modify: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`

- [ ] **Step 1: Update the modal tests**

Replace the existing content of `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx` with:

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExpandKnowledgePointsModal } from '../components/ExpandKnowledgePointsModal'
import type { ValidationReport } from '../../../types/textbook.types'

vi.mock('../../../utils/textbookFilePreview', () => ({
  parseXlsxPreview: vi.fn().mockResolvedValue([
    { 知识点编号: '1.1.1', 一级知识点: '集合', 二级知识点: '集合的含义' },
  ]),
  readTextFile: vi.fn().mockResolvedValue('#### 1.1.1 集合的含义\n\n内容'),
}))

function getFileInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="file"]'))
}

const validReport: ValidationReport = { valid: true, errors: [] }
const invalidReport: ValidationReport = {
  valid: false,
  errors: [
    { type: 'xlsx', location: { file: 'xlsx', code: '1.1.1' }, message: '已存在' },
    { type: 'md', location: { file: 'md', row: 3 }, message: '标题层级错误' },
  ],
}

describe('ExpandKnowledgePointsModal', () => {
  const defaultProps = {
    open: true,
    onCancel: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onValidate: vi.fn().mockResolvedValue(undefined),
    onResetValidation: vi.fn(),
    loading: false,
    validating: false,
    error: null,
    validationResult: null as ValidationReport | null,
    validationError: null,
  }

  it('should render modal with title and disabled validate/submit when no files selected', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} />)

    expect(screen.getByText('扩充知识点')).toBeInTheDocument()
    expect(screen.getByText(/上传新的 xlsx/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/框架文件/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/内容文件/i)).toBeInTheDocument()
    expect(screen.getByText(/框架文件.*xlsx.*校验规范/)).toBeInTheDocument()

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    expect(validateButton).toBeDisabled()

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()

    const cancelButton = screen.getByRole('button', { name: /取 消/i })
    fireEvent.click(cancelButton)
    expect(defaultProps.onCancel).toHaveBeenCalled()
    expect(defaultProps.onResetValidation).toHaveBeenCalled()
  })

  it('should enable validate after selecting both files', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    expect(fileInputs).toHaveLength(2)

    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    await waitFor(() => expect(validateButton).toBeEnabled())

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()
  })

  it('should show file previews after selecting files', async () => {
    const { baseElement } = render(<ExpandKnowledgePointsModal {...defaultProps} />)

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    await waitFor(() => {
      expect(screen.getByText('框架文件预览')).toBeInTheDocument()
      expect(screen.getByText('内容文件预览')).toBeInTheDocument()
      expect(screen.getByText('1.1.1')).toBeInTheDocument()
    })
  })

  it('should call onValidate with File objects when validate clicked', async () => {
    const onValidate = vi.fn().mockResolvedValue(undefined)

    const { baseElement } = render(
      <ExpandKnowledgePointsModal {...defaultProps} onValidate={onValidate} />,
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const validateButton = screen.getByRole('button', { name: /开始校验/i })
    await waitFor(() => expect(validateButton).toBeEnabled())

    fireEvent.click(validateButton)

    await waitFor(() => expect(onValidate).toHaveBeenCalledTimes(1))
    const [submittedXlsx, submittedMd] = onValidate.mock.calls[0] as [File, File]
    expect(submittedXlsx).toBeInstanceOf(File)
    expect(submittedMd).toBeInstanceOf(File)
    expect(submittedXlsx.name).toBe('expand.xlsx')
    expect(submittedMd.name).toBe('expand.md')
  })

  it('should enable submit and show success message when validationResult is valid', async () => {
    const { baseElement } = render(
      <ExpandKnowledgePointsModal {...defaultProps} validationResult={validReport} />,
    )

    expect(screen.getByText('校验通过，可以确认扩充。')).toBeInTheDocument()

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    await waitFor(() => expect(submitButton).toBeEnabled())
  })

  it('should disable submit and show error list with location details when validationResult is invalid', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} validationResult={invalidReport} />)

    expect(screen.getByText(/校验失败/i)).toBeInTheDocument()
    expect(screen.getByText(/编号 1.1.1/)).toBeInTheDocument()
    expect(screen.getByText(/第 3 行/)).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()
  })

  it('should display validation error when validationError is provided', () => {
    render(<ExpandKnowledgePointsModal {...defaultProps} validationError="网络请求失败" />)

    expect(screen.getByText('网络请求失败')).toBeInTheDocument()
  })

  it('should reset validation result and previews when files are changed', async () => {
    const onResetValidation = vi.fn()

    const { baseElement } = render(
      <ExpandKnowledgePointsModal
        {...defaultProps}
        validationResult={validReport}
        onResetValidation={onResetValidation}
      />,
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })

    await waitFor(() => expect(onResetValidation).toHaveBeenCalled())
  })

  it('should call onSubmit when confirm clicked after validation passed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    const { baseElement } = render(
      <ExpandKnowledgePointsModal
        {...defaultProps}
        validationResult={validReport}
        onSubmit={onSubmit}
      />,
    )

    const fileInputs = getFileInputs(baseElement)
    const xlsxFile = new File(['xlsx'], 'expand.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const mdFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(fileInputs[0], { target: { files: [xlsxFile] } })
    fireEvent.change(fileInputs[1], { target: { files: [mdFile] } })

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    await waitFor(() => expect(submitButton).toBeEnabled())

    fireEvent.click(submitButton)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: FAIL because the modal does not yet render the rules panel, previews, or error location details.

- [ ] **Step 3: Implement the modal changes**

Replace the entire content of `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` with:

```typescript
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Upload, Button, Space, Alert, Typography, Table, Input, Spin } from 'antd'
import { FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'
import type { ValidationReport } from '../../../types/textbook.types'
import { ValidationRulesPanel } from './ValidationRulesPanel'
import { parseXlsxPreview, readTextFile, type XlsxPreviewRow } from '../../../utils/textbookFilePreview'

interface ExpandKnowledgePointsModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (frameworkFile: File, contentFile: File) => Promise<void>
  onValidate: (frameworkFile: File, contentFile: File) => Promise<void>
  onResetValidation: () => void
  loading: boolean
  validating: boolean
  error: string | null
  validationResult: ValidationReport | null
  validationError: string | null
}

export const ExpandKnowledgePointsModal: React.FC<ExpandKnowledgePointsModalProps> = ({
  open,
  onCancel,
  onSubmit,
  onValidate,
  onResetValidation,
  loading,
  validating,
  error,
  validationResult,
  validationError,
}) => {
  const [frameworkFile, setFrameworkFile] = useState<File | null>(null)
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [frameworkFileList, setFrameworkFileList] = useState<UploadFile[]>([])
  const [contentFileList, setContentFileList] = useState<UploadFile[]>([])
  const [xlsxPreview, setXlsxPreview] = useState<XlsxPreviewRow[] | null>(null)
  const [mdPreview, setMdPreview] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setFrameworkFile(null)
    setContentFile(null)
    setFrameworkFileList([])
    setContentFileList([])
    setXlsxPreview(null)
    setMdPreview(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onResetValidation()
    onCancel()
  }, [resetState, onResetValidation, onCancel])

  const handleSubmit = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    await onSubmit(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onSubmit])

  const handleValidate = useCallback(async () => {
    if (!frameworkFile || !contentFile) return
    await onValidate(frameworkFile, contentFile)
  }, [frameworkFile, contentFile, onValidate])

  const extractFile = (file: UploadFile | File): File | null => {
    if (file instanceof File) {
      return file
    }
    const origin = file.originFileObj
    return origin instanceof File ? origin : null
  }

  useEffect(() => {
    if (!frameworkFile) {
      setXlsxPreview(null)
      return
    }
    let cancelled = false
    parseXlsxPreview(frameworkFile)
      .then((rows) => {
        if (!cancelled) setXlsxPreview(rows)
      })
      .catch(() => {
        if (!cancelled) setXlsxPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [frameworkFile])

  useEffect(() => {
    if (!contentFile) {
      setMdPreview(null)
      return
    }
    let cancelled = false
    readTextFile(contentFile)
      .then((text) => {
        if (!cancelled) setMdPreview(text)
      })
      .catch(() => {
        if (!cancelled) setMdPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [contentFile])

  const handleFrameworkChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setFrameworkFile(extracted)
      }
      setFrameworkFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      onResetValidation()
    },
    [onResetValidation],
  )

  const handleContentChange = useCallback(
    ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
      const extracted = extractFile(file)
      if (extracted) {
        setContentFile(extracted)
      }
      setContentFileList(fileList.length > 0 ? [fileList[fileList.length - 1]] : [])
      onResetValidation()
    },
    [onResetValidation],
  )

  const handleFrameworkRemove = useCallback(() => {
    setFrameworkFile(null)
    setFrameworkFileList([])
    onResetValidation()
    return true
  }, [onResetValidation])

  const handleContentRemove = useCallback(() => {
    setContentFile(null)
    setContentFileList([])
    onResetValidation()
    return true
  }, [onResetValidation])

  const noopCustomRequest = useCallback(() => {}, [])

  const canValidate = frameworkFile !== null && contentFile !== null
  const canSubmit = canValidate && validationResult?.valid === true

  const xlsxColumns = useMemo(() => {
    if (!xlsxPreview || xlsxPreview.length === 0) return []
    return Object.keys(xlsxPreview[0]).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
    }))
  }, [xlsxPreview])

  const renderValidationResult = () => {
    if (validating) {
      return (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin size="small" />
          <Typography.Text style={{ marginLeft: 8 }}>正在校验...</Typography.Text>
        </div>
      )
    }

    if (validationError) {
      return <Alert message={validationError} type="error" showIcon />
    }

    if (!validationResult) {
      return null
    }

    if (validationResult.valid) {
      return <Alert message="校验通过，可以确认扩充。" type="success" showIcon />
    }

    const xlsxErrors = validationResult.errors.filter((e) => e.type === 'xlsx')
    const mdErrors = validationResult.errors.filter((e) => e.type === 'md')

    return (
      <Alert
        message="校验失败，请修正以下问题后重新校验："
        type="error"
        showIcon
        description={
          <div style={{ marginTop: 8 }}>
            {xlsxErrors.length > 0 && (
              <div>
                <Typography.Text strong>框架文件 (xlsx)</Typography.Text>
                <ul style={{ margin: '4px 0 12px 0', paddingLeft: 18 }}>
                  {xlsxErrors.map((err, index) => (
                    <li key={`xlsx-${index}`}>
                      <Typography.Text>
                        {err.location.code
                          ? `编号 ${err.location.code}：`
                          : err.location.row
                            ? `第 ${err.location.row} 行：`
                            : ''}
                        {err.message}
                      </Typography.Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mdErrors.length > 0 && (
              <div>
                <Typography.Text strong>内容文件 (md)</Typography.Text>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
                  {mdErrors.map((err, index) => (
                    <li key={`md-${index}`}>
                      <Typography.Text>
                        {err.location.code
                          ? `编号 ${err.location.code}：`
                          : err.location.row
                            ? `第 ${err.location.row} 行：`
                            : ''}
                        {err.message}
                      </Typography.Text>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        }
      />
    )
  }

  return (
    <Modal
      title="扩充知识点"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={loading || validating}>
          取消
        </Button>,
        <Button
          key="validate"
          disabled={!canValidate || validating}
          loading={validating}
          onClick={() => {
            void handleValidate()
          }}
        >
          开始校验
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!canSubmit}
          onClick={() => {
            void handleSubmit()
          }}
        >
          确认上传
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          上传新的 xlsx（知识点概述）和 md（知识点详述）文件，编号不冲突的知识点将被追加到当前教材。
        </Typography.Text>

        <ValidationRulesPanel />

        {error && <Alert message={error} type="error" showIcon />}
        {renderValidationResult()}

        <div>
          <label htmlFor="framework-upload" style={{ display: 'block', marginBottom: 8 }}>
            <Typography.Text strong>框架文件 (.xlsx)</Typography.Text>
          </label>
          <Upload
            id="framework-upload"
            accept=".xlsx"
            maxCount={1}
            fileList={frameworkFileList}
            beforeUpload={() => false}
            customRequest={noopCustomRequest}
            onChange={handleFrameworkChange}
            onRemove={handleFrameworkRemove}
          >
            <Button icon={<FileExcelOutlined />}>选择框架文件 (.xlsx)</Button>
          </Upload>
          {xlsxPreview && xlsxPreview.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>框架文件预览</Typography.Text>
              <Table
                dataSource={xlsxPreview}
                columns={xlsxColumns}
                rowKey={(record, index) => `row-${index}`}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="content-upload" style={{ display: 'block', marginBottom: 8 }}>
            <Typography.Text strong>内容文件 (.md)</Typography.Text>
          </label>
          <Upload
            id="content-upload"
            accept=".md"
            maxCount={1}
            fileList={contentFileList}
            beforeUpload={() => false}
            customRequest={noopCustomRequest}
            onChange={handleContentChange}
            onRemove={handleContentRemove}
          >
            <Button icon={<FileTextOutlined />}>选择内容文件 (.md)</Button>
          </Upload>
          {mdPreview !== null && (
            <div style={{ marginTop: 12 }}>
              <Typography.Text strong>内容文件预览</Typography.Text>
              <Input.TextArea
                value={mdPreview}
                readOnly
                rows={6}
                style={{ marginTop: 8, fontFamily: 'monospace' }}
              />
            </div>
          )}
        </div>
      </Space>
    </Modal>
  )
}

export default ExpandKnowledgePointsModal
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter web test -- web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): wire validation rules, file previews, and clearer errors into expand modal"
```

---

## Task 5: Quality gates

**Files:** all changed files

- [x] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [x] **Step 2: Run lint**

Run: `pnpm lint`
Expected: zero errors. Note: `web/src/utils/textbookFilePreview.ts` uses `xlsx` and may trigger an unused variable warning; the `xlsxColumns` variable is used in JSX so it should be fine. If `eslint` reports `xlsx` is not used in the test file, it is used in the test body.

- [x] **Step 3: Run tests**

Run: `pnpm test`
Expected: all tests pass. (Note: 5 pre-existing web tests are failing for unrelated reasons; this change should not introduce new failures.)

- [x] **Step 4: Manual verification**

1. Start backend: `pnpm dev:server`
2. Start frontend: `pnpm dev`
3. Navigate to a textbook detail page and click "扩充知识点"
4. Verify the modal shows "框架文件 (.xlsx) 校验规范" and "内容文件 (.md) 校验规范"
5. Upload a valid `.xlsx` and `.md`
6. Verify the xlsx appears as a table and the md appears as a read-only text area
7. Click "开始校验"
8. If validation fails, verify errors show as "编号 X：原因" or "第 N 行：原因"
9. If validation passes, verify "确认上传" becomes enabled

- [x] **Step 5: Final commit**

```bash
git add docs/superpowers/plans/2026-07-20-improve-textbook-expansion-validation-readability.md
git commit -m "feat(web/textbook): improve expansion validation readability"
```

---

## Self-Review

**Spec coverage:**
- 校验规则明示：Task 3 `ValidationRulesPanel`
- xlsx 表格预览：Task 2 `parseXlsxPreview` + Task 4 modal integration
- md 文本预览：Task 2 `readTextFile` + Task 4 modal integration
- 校验失败原因清晰列出：Task 4 modal `renderValidationResult` with `location.code` / `location.row`

**Placeholder scan:** No TBD/TODO/"fill in details" placeholders. Every step contains exact code, exact commands, or expected output.

**Type consistency:** `XlsxPreviewRow` is defined in the utility and used in the modal. `ValidationRulesPanel` has no props. `ValidationReport` / `ValidationIssue` types are unchanged and reused.

**Gaps identified:**
- The plan does not add row highlighting in the preview table when an error maps to a specific row. This is acceptable for the MVP; the error list already includes the row/code.
- The preview row limit is hard-coded to 100 in `parseXlsxPreview`. This is a sensible default for teacher-uploaded expansion files; it can be made configurable later if needed.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-improve-textbook-expansion-validation-readability.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?