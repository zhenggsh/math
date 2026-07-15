import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'

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
    fetchTextbook: vi.fn(),
    expand: vi.fn(),
  })),
}))

describe('TextbookDetailPage', () => {
  it('should render textbook detail and knowledge points', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/textbooks/tb-1']}>
        <Routes>
          <Route path="/teacher/textbooks/:id" element={<TextbookDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Math 01')).toBeInTheDocument()
    })
    expect(screen.getAllByText('1.1.1').length).toBeGreaterThan(0)
  })
})
