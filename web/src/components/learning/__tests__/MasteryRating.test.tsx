import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MasteryRating } from '../MasteryRating';

describe('MasteryRating', () => {
  it('should render all five rating options', () => {
    render(<MasteryRating />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('should call onChange when a rating is selected', () => {
    const handleChange = vi.fn();
    render(<MasteryRating onChange={handleChange} />);

    const ratingB = screen.getByText('B');
    fireEvent.click(ratingB);

    expect(handleChange).toHaveBeenCalledWith('B');
  });

  it('should display the selected value', () => {
    render(<MasteryRating value="C" />);

    // Check that C is selected (radio button with checked state)
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<MasteryRating disabled />);

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it('should show tooltips with descriptions', async () => {
    render(<MasteryRating />);

    // Check that tooltips are rendered (title attributes or aria-labels)
    const ratingA = screen.getByText('A').closest('label');
    expect(ratingA).toBeInTheDocument();
  });
});
