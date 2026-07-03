import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KnowledgeContextBar } from '../KnowledgeContextBar'

describe('KnowledgeContextBar', () => {
  it('renders title', () => {
    render(<KnowledgeContextBar title="三角函数" />)
    expect(screen.getByText('三角函数')).toBeInTheDocument()
  })
})
