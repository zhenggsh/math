import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MdEditor } from '../MdEditor'

describe('MdEditor', () => {
  it('renders textarea with content', () => {
    render(<MdEditor content="hello" onChange={vi.fn()} fileSize={100} />)

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
  })

  it('calls onChange when text is edited', () => {
    const onChange = vi.fn()
    render(<MdEditor content="hello" onChange={onChange} fileSize={100} />)

    const textarea = screen.getByDisplayValue('hello')
    fireEvent.change(textarea, { target: { value: 'hello world' } })

    expect(onChange).toHaveBeenCalledWith('hello world')
  })

  it('shows disabled message when fileSize exceeds limit', () => {
    render(<MdEditor content="hello" onChange={vi.fn()} fileSize={2 * 1024 * 1024} />)

    expect(screen.getByText(/文件超过 1 MB/)).toBeInTheDocument()
  })
})
