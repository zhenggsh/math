import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FollowUpChips } from '../FollowUpChips'

describe('FollowUpChips', () => {
  it('renders follow-up questions', () => {
    const questions = ['导数如何计算？', '导数的几何意义是什么？', '导数的应用场景有哪些？']
    render(<FollowUpChips questions={questions} onClick={vi.fn()} />)

    questions.forEach(question => {
      expect(screen.getByText(question)).toBeInTheDocument()
    })
  })

  it('calls onClick when a chip is clicked', () => {
    const handleClick = vi.fn()
    const questions = ['导数如何计算？']
    render(<FollowUpChips questions={questions} onClick={handleClick} />)

    fireEvent.click(screen.getByText('导数如何计算？'))
    expect(handleClick).toHaveBeenCalledWith('导数如何计算？')
  })
})
