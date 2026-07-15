import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DeleteKnowledgePointButton } from '../DeleteKnowledgePointButton'

describe('DeleteKnowledgePointButton', () => {
  it('is enabled for editable users when node has no children', () => {
    render(<DeleteKnowledgePointButton canEdit hasChildren={false} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: /删除/ })).toBeEnabled()
  })

  it('is disabled for non-editable users', () => {
    render(<DeleteKnowledgePointButton canEdit={false} hasChildren={false} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled()
  })

  it('is disabled when node has children', () => {
    render(<DeleteKnowledgePointButton canEdit hasChildren onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: /删除/ })).toBeDisabled()
  })

  it('shows confirmation when clicked', () => {
    render(<DeleteKnowledgePointButton canEdit hasChildren={false} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /删除/ }))
    expect(screen.getByText('确认删除知识点？')).toBeInTheDocument()
  })
})
