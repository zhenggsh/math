import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddChildKnowledgePointButton } from '../AddChildKnowledgePointButton'
import type { ParentKnowledgeNode } from '../../../types/knowledge-point.types'

describe('AddChildKnowledgePointButton', () => {
  const parentNode: ParentKnowledgeNode = {
    id: 'kp-1',
    code: '1',
    title: '集合',
  }

  it('renders enabled when parent is a level-1 node and user can edit', () => {
    render(<AddChildKnowledgePointButton parentNode={parentNode} canEdit onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新增子知识点/ })).toBeEnabled()
  })

  it('is disabled for level-3 parent', () => {
    const level3: ParentKnowledgeNode = { ...parentNode, code: '1.1.1' }
    render(<AddChildKnowledgePointButton parentNode={level3} canEdit onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新增子知识点/ })).toBeDisabled()
  })

  it('is disabled when user cannot edit', () => {
    render(
      <AddChildKnowledgePointButton parentNode={parentNode} canEdit={false} onClick={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /新增子知识点/ })).toBeDisabled()
  })

  it('is disabled when parent node is null', () => {
    render(<AddChildKnowledgePointButton parentNode={null} canEdit onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新增子知识点/ })).toBeDisabled()
  })
})
