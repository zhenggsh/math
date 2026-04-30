import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AISidebar } from '../AISidebar'

describe('AISidebar', () => {
  it('renders AI sidebar with placeholder content', () => {
    render(<AISidebar />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    expect(screen.getByText('AI features coming soon')).toBeInTheDocument()
  })

  it('displays knowledge point title when provided', () => {
    render(<AISidebar knowledgePointId="kp-1" knowledgePointTitle="集合的含义" />)
    expect(screen.getByText('Current Topic')).toBeInTheDocument()
    expect(screen.getByText('集合的含义')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    render(<AISidebar />)
    expect(screen.getByText('Explain')).toBeInTheDocument()
    expect(screen.getByText('Quiz')).toBeInTheDocument()
    expect(screen.getByText('Summarize')).toBeInTheDocument()
  })
})
