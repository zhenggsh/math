import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LearningModeSelector } from './LearningModeSelector';

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

describe('LearningModeSelector', () => {
  const defaultProps = {
    activeMode: 'weak' as const,
    onModeChange: vi.fn(),
    stats: {
      weakPointCount: 5,
      importanceStats: { A: 10, B: 20, C: 30 },
    },
    loading: false,
  };

  it('should render three mode cards', () => {
    renderWithQueryClient(<LearningModeSelector {...defaultProps} />);

    expect(screen.getByText('Weak Points')).toBeInTheDocument();
    expect(screen.getByText('By Importance')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
  });

  it('should call onModeChange when clicking a card', () => {
    const onModeChange = vi.fn();
    renderWithQueryClient(<LearningModeSelector {...defaultProps} onModeChange={onModeChange} />);

    fireEvent.click(screen.getByText('By Importance'));

    expect(onModeChange).toHaveBeenCalledWith('importance');
  });

  it('should display weak point count badge', () => {
    renderWithQueryClient(<LearningModeSelector {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display importance stats', () => {
    renderWithQueryClient(<LearningModeSelector {...defaultProps} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});
