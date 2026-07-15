import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EditKnowledgePointModal } from '../EditKnowledgePointModal'

describe('EditKnowledgePointModal', () => {
  const baseValues = {
    code: '1.1.1',
    name: '集合的包含关系',
    definition: '初始定义',
    characteristics: '初始特性',
    importanceLevel: 'B' as const,
  }

  it('pre-fills form with initial values including code and name', () => {
    render(
      <EditKnowledgePointModal
        open
        initialValues={baseValues}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('1.1.1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('集合的包含关系')).toBeInTheDocument()
    expect(screen.getByDisplayValue('初始定义')).toBeInTheDocument()
    expect(screen.getByDisplayValue('初始特性')).toBeInTheDocument()
  })

  it('calls onSubmit with updated values when OK is clicked', async () => {
    const handleSubmit = vi.fn()
    render(
      <EditKnowledgePointModal
        open
        initialValues={baseValues}
        onCancel={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('编号'), { target: { value: '1.1.2' } })
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '集合的相等关系' } })
    fireEvent.change(screen.getByLabelText('定义'), { target: { value: '新定义' } })
    fireEvent.change(screen.getByLabelText('特性'), { target: { value: '新特性' } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          code: '1.1.2',
          name: '集合的相等关系',
          definition: '新定义',
          characteristics: '新特性',
          importanceLevel: 'B',
        })
      )
    })
  })

  it('shows validation error when required fields are empty', async () => {
    render(
      <EditKnowledgePointModal
        open
        initialValues={baseValues}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('编号'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('定义'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(screen.getByText('请输入编号')).toBeInTheDocument()
      expect(screen.getByText('请输入名称')).toBeInTheDocument()
      expect(screen.getByText('请输入定义')).toBeInTheDocument()
    })
  })
})
