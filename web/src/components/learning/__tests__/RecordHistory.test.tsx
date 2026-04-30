import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RecordHistory } from '../RecordHistory';
import type { LearningRecord } from '../../../types/learning-record.types';

const mockRecords: LearningRecord[] = [
  {
    id: 'record-1',
    userId: 'user-123',
    knowledgePointId: 'kp-123',
    startTime: '2024-03-20T10:00:00Z',
    durationMinutes: 30,
    masteryLevel: 'A',
    notes: '今天学习得很好',
    createdAt: '2024-03-20T10:30:00Z',
    knowledgePoint: {
      id: 'kp-123',
      code: '1.1.1',
      level1: '集合',
      level2: '集合的概念',
      level3: '集合的含义',
      importanceLevel: 'A',
    },
  },
  {
    id: 'record-2',
    userId: 'user-123',
    knowledgePointId: 'kp-123',
    startTime: '2024-03-19T14:00:00Z',
    durationMinutes: 45,
    masteryLevel: 'C',
    notes: null,
    createdAt: '2024-03-19T14:45:00Z',
    knowledgePoint: {
      id: 'kp-123',
      code: '1.1.1',
      level1: '集合',
      level2: '集合的概念',
      level3: '集合的含义',
      importanceLevel: 'A',
    },
  },
];

describe('RecordHistory', () => {
  it('should render empty state when no records', () => {
    render(<RecordHistory records={[]} />);

    expect(screen.getByText('暂无学习记录')).toBeInTheDocument();
    expect(
      screen.getByText('开始学习后，您的学习记录将显示在这里'),
    ).toBeInTheDocument();
  });

  it('should render records list', () => {
    render(<RecordHistory records={mockRecords} />);

    expect(screen.getByText('优秀 (A)')).toBeInTheDocument();
    expect(screen.getByText('一般 (C)')).toBeInTheDocument();
    expect(screen.getByText('30 分钟')).toBeInTheDocument();
    expect(screen.getByText('45 分钟')).toBeInTheDocument();
  });

  it('should display notes when available', () => {
    render(<RecordHistory records={mockRecords} />);

    expect(screen.getByText('今天学习得很好')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<RecordHistory records={[]} loading />);

    expect(screen.getByText('加载历史记录...')).toBeInTheDocument();
  });

  it('should display mastery level with correct color', () => {
    render(<RecordHistory records={mockRecords} />);

    const tagA = screen.getByText('优秀 (A)');
    expect(tagA).toBeInTheDocument();

    const tagC = screen.getByText('一般 (C)');
    expect(tagC).toBeInTheDocument();
  });
});
