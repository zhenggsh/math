import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  it('sends message when clicking send button', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} loading={false} />)

    const input = screen.getByPlaceholderText('请输入问题...')
    fireEvent.change(input, { target: { value: '什么是导数？' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(handleSend).toHaveBeenCalledWith('什么是导数？')
    expect(input).toHaveValue('')
  })

  it('sends message on Enter key', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} loading={false} />)

    const input = screen.getByPlaceholderText('请输入问题...')
    fireEvent.change(input, { target: { value: '什么是导数？' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(handleSend).toHaveBeenCalledWith('什么是导数？')
  })

  it('does not send empty messages', () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} loading={false} />)

    fireEvent.click(screen.getByRole('button', { name: /发送/i }))
    expect(handleSend).not.toHaveBeenCalled()
  })

  it('disables input and button while loading', () => {
    render(<ChatInput onSend={vi.fn()} loading={true} />)

    expect(screen.getByPlaceholderText('请输入问题...')).toBeDisabled()
    expect(screen.getByRole('button', { name: /发送/i })).toBeDisabled()
  })
})
