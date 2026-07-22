import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'
import type { ExpandResult } from '../../../types/textbook.types'

const mockExpand = vi.fn()
const mockFetchTextbook = vi.fn()
const mockValidate = vi.fn()
const mockResetValidation = vi.fn()

vi.mock('../hooks/useTextbookDetail', () => ({
  useTextbookDetail: vi.fn(() => ({
    textbook: {
      id: 'tb-1',
      name: 'Math 01',
      fileName: 'math01',
      frameworkType: 'xlsx',
      hasContent: true,
      knowledgePointCount: 2,
      lastModifiedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
    knowledgePoints: [
      {
        id: 'kp-1',
        code: '1.1.1',
        name: '集合的含义',
        level1: '集合',
        level2: '1.1',
        level3: '1.1.1',
        importanceLevel: 'A',
      },
    ],
    loading: false,
    error: null,
    expanding: false,
    expandError: null,
    validating: false,
    validationResult: null,
    validationError: null,
    fetchTextbook: mockFetchTextbook,
    expand: mockExpand,
    validate: mockValidate,
    resetValidation: mockResetValidation,
  })),
}))

vi.mock('../components/ExpandKnowledgePointsModal', () => ({
  ExpandKnowledgePointsModal: (props: {
    open: boolean
    onSubmit: (frameworkFile: File, contentFile: File) => void
  }) => {
    if (!props.open) {
      return null
    }
    return (
      <button
        data-testid="mock-submit"
        onClick={() => {
          props.onSubmit(new File([], 'expand.xlsx'), new File([], 'expand.md'))
        }}
      >
        确认上传
      </button>
    )
  },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/textbooks/tb-1']}>
      <Routes>
        <Route path="/teacher/textbooks/:id" element={<TextbookDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TextbookDetailPage', () => {
  it('should render textbook detail and knowledge points', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Math 01')).toBeInTheDocument()
    })
    expect(screen.getAllByText('1.1.1').length).toBeGreaterThan(0)
  })

  it('should refresh knowledge points after successful expansion', async () => {
    const expandResult: ExpandResult = {
      success: true,
      message: 'ok',
      data: { addedCodes: ['2.1.1'], count: 1 },
    }
    mockExpand.mockResolvedValue(expandResult)

    renderPage()

    await waitFor(() => expect(screen.getByText('Math 01')).toBeInTheDocument())

    fireEvent.click(screen.getByText('扩充知识点'))
    await waitFor(() => expect(screen.getByTestId('mock-submit')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('mock-submit'))

    await waitFor(() => expect(mockExpand).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(mockFetchTextbook).toHaveBeenCalledTimes(1))
  })
})
