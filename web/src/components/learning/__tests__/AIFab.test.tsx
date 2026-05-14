import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

  it('shows mock response after clicking a prompt', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<AIFab knowledgePointTitle="集合" />)
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))

    const prompt = screen.getByText('「集合」易错点分析')
    fireEvent.click(prompt)

    expect(screen.getByText('正在思考...')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(screen.getByText(/学习中的常见易错点/)).toBeInTheDocument()

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

  it('resets to prompt view when reopened after closing', async () => {
    render(<AIFab knowledgePointTitle="数列" />)
    const fab = screen.getByRole('button', { name: /AI 助手/i })

    fireEvent.click(fab)
    fireEvent.click(screen.getByText('「数列」名师讲解视频'))

    const closeButton = screen.getByRole('button', { name: /关闭/i })
    fireEvent.click(closeButton)
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))

    const prompt = await screen.findByText('「数列」名师讲解视频')
    expect(prompt).toBeInTheDocument()
    expect(screen.queryByText(/推荐以下名师/)).not.toBeInTheDocument()
  })

  it('resets to prompts when knowledge point changes while panel is open', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { rerender } = render(<AIFab knowledgePointTitle="集合" />)

    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))
    fireEvent.click(screen.getByText('「集合」易错点分析'))

    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(screen.getByText(/学习中的常见易错点/)).toBeInTheDocument()

    rerender(<AIFab knowledgePointTitle="三角函数" />)

    expect(screen.getByText('生成「三角函数」的常见题目')).toBeInTheDocument()
    expect(screen.queryByText(/学习中的常见易错点/)).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
