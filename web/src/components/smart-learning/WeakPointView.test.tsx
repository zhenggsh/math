import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WeakPointView } from './WeakPointView';

// Mock the API hooks
vi.mock('../../hooks/useSmartLearning', () => ({
  useWeakPoints: vi.fn(),
  useRefreshSmartLearning: () => ({
    refreshWeakPoints: vi.fn(),
  }),
}));

import { useWeakPoints } from '../../hooks/useSmartLearning';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('WeakPointView', () => {
  const mockWeakPoints = {
    total: 2,
    items: [
      {
        knowledgePoint: {
          id: 'kp-1',
          code: '1.1.1',
          level1: 'Chapter 1',
          level2: 'Section 1',
          level3: 'Point 1',
          importanceLevel: 'A',
          definition: 'Definition 1',
        },
        learningRecord: {
          id: 'lr-1',
          masteryLevel: 'E',
          durationMinutes: 30,
          startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
          notes: null,
        },
        priority: 100,
      },
    ],
  };

  it('should show loading state', () => {
    (useWeakPoints as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(<WeakPointView />);

    expect(screen.getByText('Loading weak points...')).toBeInTheDocument();
  });

  it('should display weak points list', async () => {
    (useWeakPoints as any).mockReturnValue({
      data: mockWeakPoints,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<WeakPointView />);

    await waitFor(() => {
      expect(screen.getByText('Total Weak Points')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should show empty state when no weak points', () => {
    (useWeakPoints as any).mockReturnValue({
      data: { total: 0, items: [] },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<WeakPointView />);

    expect(screen.getByText('No weak points found! Great job!')).toBeInTheDocument();
  });

  it('should show error state', () => {
    (useWeakPoints as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderWithQueryClient(<WeakPointView />);

    expect(screen.getByText('Failed to load weak points')).toBeInTheDocument();
  });
});
