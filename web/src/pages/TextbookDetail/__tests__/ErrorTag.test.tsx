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

    expect(screen.getByText(/编号 1\.1\.2/)).toBeInTheDocument()
    expect(screen.getByText(/已存在/)).toBeInTheDocument()
  })

  it('calls onClick with location when clicked', () => {
    const handleClick = vi.fn()
    render(<ErrorTag issue={issue} onClick={handleClick} />)

    fireEvent.click(screen.getByText(/编号 1\.1\.2/))
    expect(handleClick).toHaveBeenCalledWith(issue.location)
  })
})
