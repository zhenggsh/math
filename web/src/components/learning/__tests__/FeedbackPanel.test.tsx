import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackPanel } from '../FeedbackPanel';
import * as learningRecordApi from '../../../services/learningRecordApi';

vi.mock('../../../services/learningRecordApi');

describe('FeedbackPanel', () => {
  const mockKnowledgePointId = 'kp-123';

  beforeEach(() => {
    vi.clearAllMocks();
    (
      learningRecordApi.getLearningRecordsByKnowledgePoint as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue([]);
  });

  it('should render timer, rating, and form elements', () => {
    render(<FeedbackPanel knowledgePointId={mockKnowledgePointId} />);

    expect(screen.getByText('学习时长')).toBeInTheDocument();
    expect(screen.getByText('学习反馈')).toBeInTheDocument();
    expect(screen.getByText('掌握程度')).toBeInTheDocument();
    expect(screen.getByText('学习备注（可选）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /提交学习记录/i })).toBeInTheDocument();
  });

  it('should show error when submitting without mastery level', async () => {
    render(<FeedbackPanel knowledgePointId={mockKnowledgePointId} />);

    const submitButton = screen.getByRole('button', { name: /提交学习记录/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请选择掌握程度')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockSubmitSuccess = vi.fn();
    const mockCreateRecord = vi.fn().mockResolvedValue({ id: 'record-123' });
    (
      learningRecordApi.createLearningRecord as ReturnType<typeof vi.fn>
    ).mockImplementation(mockCreateRecord);

    render(
      <FeedbackPanel
        knowledgePointId={mockKnowledgePointId}
        onSubmitSuccess={mockSubmitSuccess}
      />,
    );

    // Select a mastery level
    const ratingB = screen.getByText('B');
    fireEvent.click(ratingB);

    // Add notes
    const notesInput = screen.getByPlaceholderText(
      '记录今天的学习心得、疑问或需要注意的地方...',
    );
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /提交学习记录/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateRecord).toHaveBeenCalled();
    });
  });

  it('should display history section', () => {
    render(<FeedbackPanel knowledgePointId={mockKnowledgePointId} />);

    expect(screen.getByText('学习历史')).toBeInTheDocument();
  });

  it('should load and display history records', async () => {
    const mockRecords = [
      {
        id: 'record-1',
        userId: 'user-123',
        knowledgePointId: mockKnowledgePointId,
        startTime: '2024-03-20T10:00:00Z',
        durationMinutes: 30,
        masteryLevel: 'A' as const,
        notes: null,
        createdAt: '2024-03-20T10:30:00Z',
        knowledgePoint: {
          id: mockKnowledgePointId,
          code: '1.1.1',
          level1: 'Test',
          level2: null,
          level3: null,
          importanceLevel: 'A' as const,
        },
      },
    ];

    (
      learningRecordApi.getLearningRecordsByKnowledgePoint as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockRecords);

    render(<FeedbackPanel knowledgePointId={mockKnowledgePointId} />);

    await waitFor(() => {
      expect(
        learningRecordApi.getLearningRecordsByKnowledgePoint,
      ).toHaveBeenCalledWith(mockKnowledgePointId);
    });
  });
});
