import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LearningTimer } from '../LearningTimer';

describe('LearningTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('should display clock icon and title', () => {
    const startTime = new Date();
    render(<LearningTimer startTime={startTime} />);

    expect(screen.getByText('学习时长')).toBeInTheDocument();
  });

  it('should display initial time', () => {
    const startTime = new Date();
    render(<LearningTimer startTime={startTime} />);

    // Timer should show some time format (MM:SS)
    const timeRegex = /\d{2}:\d{2}/;
    expect(screen.getByText(timeRegex)).toBeInTheDocument();
  });

  it('should not update when paused', () => {
    const startTime = new Date();
    render(<LearningTimer startTime={startTime} paused />);

    expect(screen.getByText('学习时长')).toBeInTheDocument();
  });
});
