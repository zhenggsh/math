import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddChildKnowledgePointModal } from '../AddChildKnowledgePointModal'
import type { ParentKnowledgeNode } from '../../../types/knowledge-point.types'

describe('AddChildKnowledgePointModal', () => {
  const parentNode: ParentKnowledgeNode = {
    id: 'kp-1',
    code: '1.1',
    title: '集合的概念',
  }

  it('derives default code from existing siblings', () => {
    render(
      <AddChildKnowledgePointModal
        open
        parentNode={parentNode}
        existingCodes={['1.1.1', '1.1.2']}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('1.1.3')).toBeInTheDocument()
  })

  it('calls onSubmit with form values when OK is clicked', async () => {
    const handleSubmit = vi.fn()
    render(
      <AddChildKnowledgePointModal
        open
        parentNode={parentNode}
        existingCodes={[]}
        onCancel={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新知识点' } })
    fireEvent.change(screen.getByLabelText('编号'), { target: { value: '1.1.3' } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'kp-1',
          code: '1.1.3',
          name: '新知识点',
          importanceLevel: 'C',
        })
      )
    })
  })
})
