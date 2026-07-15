import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExpandKnowledgePointsModal } from '../components/ExpandKnowledgePointsModal'

describe('ExpandKnowledgePointsModal', () => {
  it('should render modal with title and disabled submit when no files selected', () => {
    const onCancel = vi.fn()

    render(
      <ExpandKnowledgePointsModal
        open={true}
        onCancel={onCancel}
        onSubmit={vi.fn()}
        loading={false}
        error={null}
      />
    )

    expect(screen.getByText('扩充知识点')).toBeInTheDocument()
    expect(screen.getByText(/上传新的 xlsx/i)).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: /确认上传/i })
    expect(submitButton).toBeDisabled()

    const cancelButton = screen.getByRole('button', { name: /取 消/i })
    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalled()
  })
})
