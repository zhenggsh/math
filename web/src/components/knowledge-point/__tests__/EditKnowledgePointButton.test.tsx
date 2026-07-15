import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EditKnowledgePointButton } from '../EditKnowledgePointButton'

describe('EditKnowledgePointButton', () => {
  it('is enabled when user can edit', () => {
    render(<EditKnowledgePointButton canEdit onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /编辑概要/ })).toBeEnabled()
  })

  it('is disabled when user cannot edit', () => {
    render(<EditKnowledgePointButton canEdit={false} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /编辑概要/ })).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<EditKnowledgePointButton canEdit disabled onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /编辑概要/ })).toBeDisabled()
  })
})
