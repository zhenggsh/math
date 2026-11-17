import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { message, App } from 'antd'

const renderWithApp = (ui: React.ReactElement) => render(<App>{ui}</App>)
import { MdEditor } from '../MdEditor'
import type { EditorRow } from '../../../utils/knowledgeBlocks'

const createRow = (code: string): EditorRow => ({
  rowId: `row-${code}`,
  知识点编号: code,
})

describe('MdEditor', () => {
  beforeEach(() => {
    vi.spyOn(message, 'warning').mockReturnValue({} as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders textarea with content', () => {
    renderWithApp(<MdEditor content="hello" onChange={vi.fn()} fileSize={100} />)

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('calls onChange when text is edited', () => {
    const onChange = vi.fn()
    renderWithApp(<MdEditor content="hello" onChange={onChange} fileSize={100} />)

    const textarea = screen.getByDisplayValue('hello')
    fireEvent.change(textarea, { target: { value: 'hello world' } })

    expect(onChange).toHaveBeenCalledWith('hello world')
  })

  it('shows disabled message when fileSize exceeds limit', () => {
    renderWithApp(<MdEditor content="hello" onChange={vi.fn()} fileSize={2 * 1024 * 1024} />)

    expect(screen.getByText(/文件超过 1 MB/)).toBeInTheDocument()
  })

  it('shows sync hint text', () => {
    renderWithApp(<MdEditor content="hello" onChange={vi.fn()} fileSize={100} />)

    expect(
      screen.getByText(
        /xlsx 编辑会自动同步 Markdown 标题；直接编辑 Markdown 正文不会反向同步到 xlsx/
      )
    ).toBeInTheDocument()
  })

  it('renders line numbers for each line', () => {
    renderWithApp(<MdEditor content="line1\nline2\nline3" onChange={vi.fn()} fileSize={100} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('disables replace button when source and target levels are equal', async () => {
    renderWithApp(<MdEditor content="hello" onChange={vi.fn()} fileSize={100} />)

    const comboboxes = screen.getAllByRole('combobox')
    // Source is already 2; change target from 3 to 2
    const targetSelect = comboboxes[1].closest('.ant-select') as HTMLElement
    fireEvent.mouseDown(targetSelect)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: '##' })).toBeInTheDocument()
    })
    const option = document.querySelector('.ant-select-item[title="##"]') as HTMLElement
    option.click()
    await waitFor(() => {
      expect(
        comboboxes[1].closest('.ant-select')?.querySelector('.ant-select-content')
      ).toHaveAttribute('title', '##')
    })
    expect(screen.getByRole('button', { name: /替\s*换/ })).toBeDisabled()
  })

  describe('batch heading replacement', () => {
    it('replaces all headings in all scope', () => {
      const onChange = vi.fn()
      const content = '## 知识点 1.1.1：foo\n\nbody\n## 知识点 1.1.2：bar\n\nbody2'
      renderWithApp(<MdEditor content={content} onChange={onChange} fileSize={100} />)

      fireEvent.click(screen.getByRole('button', { name: /替\s*换/ }))

      expect(onChange).toHaveBeenCalledWith(
        '### 知识点 1.1.1：foo\n\nbody\n### 知识点 1.1.2：bar\n\nbody2'
      )
    })

    it('replaces only selected rows in selected scope', async () => {
      const onChange = vi.fn()
      const content = '## 知识点 1.1.1：foo\n\nbody\n## 知识点 1.1.2：bar\n\nbody2'
      renderWithApp(
        <MdEditor
          content={content}
          onChange={onChange}
          fileSize={100}
          selectedRows={[createRow('1.1.1')]}
        />
      )

      const comboboxes = screen.getAllByRole('combobox')
      const scopeSelect = comboboxes[2].closest('.ant-select') as HTMLElement
      fireEvent.mouseDown(scopeSelect)
      await waitFor(() => {
        expect(document.querySelector('.ant-select-item[title="仅选中的行"]')).toBeInTheDocument()
      })
      const option = document.querySelector('.ant-select-item[title="仅选中的行"]') as HTMLElement
      option.click()
      await waitFor(() => {
        expect(
          comboboxes[2].closest('.ant-select')?.querySelector('.ant-select-content')
        ).toHaveAttribute('title', '仅选中的行')
      })

      fireEvent.click(screen.getByRole('button', { name: /替\s*换/ }))

      expect(onChange).toHaveBeenCalledWith(
        '### 知识点 1.1.1：foo\n\nbody\n## 知识点 1.1.2：bar\n\nbody2'
      )
    })

    it('warns and does not replace when no selected rows match', async () => {
      const onChange = vi.fn()
      const content = '## 知识点 1.1.1：foo\n\nbody'
      renderWithApp(
        <MdEditor
          content={content}
          onChange={onChange}
          fileSize={100}
          selectedRows={[createRow('9.9.9')]}
        />
      )

      const comboboxes = screen.getAllByRole('combobox')
      const scopeSelect = comboboxes[2].closest('.ant-select') as HTMLElement
      fireEvent.mouseDown(scopeSelect)
      await waitFor(() => {
        expect(document.querySelector('.ant-select-item[title="仅选中的行"]')).toBeInTheDocument()
      })
      const option = document.querySelector('.ant-select-item[title="仅选中的行"]') as HTMLElement
      option.click()
      await waitFor(() => {
        expect(
          comboboxes[2].closest('.ant-select')?.querySelector('.ant-select-content')
        ).toHaveAttribute('title', '仅选中的行')
      })

      fireEvent.click(screen.getByRole('button', { name: /替\s*换/ }))

      expect(onChange).not.toHaveBeenCalled()
      expect(message.warning).toHaveBeenCalledWith('未选中任何行，无法应用替换')
    })
  })
})
