import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
  getClassOverview,
  getKnowledgeHeat,
  getStudentComparison,
  exportData,
} from './analytics.service';

const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
  },
}));

vi.mock('axios', () => ({
  default: {
    create: () => mockAxiosInstance,
  },
}));

vi.mock('./auth.service', () => ({
  getToken: (): string => 'test-token',
}));

describe('analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStudentOverview makes correct GET request', async () => {
    const mockData = {
      totalLearningCount: 10,
      totalDurationMinutes: 60,
      uniqueKnowledgePoints: 5,
    };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getStudentOverview();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/student/overview',
    );
    expect(result).toEqual(mockData);
  });

  it('getMasteryDistribution makes correct GET request', async () => {
    const mockData = { distribution: [] };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getMasteryDistribution();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/student/mastery-distribution',
    );
    expect(result).toEqual(mockData);
  });

  it('getLearningTrend makes correct GET request with days param', async () => {
    const mockData = { trend: [] };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getLearningTrend(30);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/student/learning-trend',
      {
        params: { days: 30 },
      },
    );
    expect(result).toEqual(mockData);
  });

  it('getWeakPoints makes correct GET request with limit param', async () => {
    const mockData = { weakPoints: [] };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getWeakPoints(10);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/student/weak-points',
      {
        params: { limit: 10 },
      },
    );
    expect(result).toEqual(mockData);
  });

  it('getClassOverview makes correct GET request with classId', async () => {
    const mockData = {
      studentCount: 30,
      activeStudentCount: 25,
      avgLearningCount: 8,
      avgDurationMinutes: 120,
    };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getClassOverview('class-1');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/teacher/class-overview',
      {
        params: { classId: 'class-1' },
      },
    );
    expect(result).toEqual(mockData);
  });

  it('getClassOverview makes correct GET request without classId', async () => {
    const mockData = {
      studentCount: 30,
      activeStudentCount: 25,
      avgLearningCount: 8,
      avgDurationMinutes: 120,
    };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getClassOverview();
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/teacher/class-overview',
      {
        params: undefined,
      },
    );
    expect(result).toEqual(mockData);
  });

  it('getKnowledgeHeat makes correct GET request with limit param', async () => {
    const mockData = { heatList: [] };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getKnowledgeHeat(20);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/teacher/knowledge-heat',
      {
        params: { limit: 20 },
      },
    );
    expect(result).toEqual(mockData);
  });

  it('getStudentComparison makes correct GET request', async () => {
    const mockData = { students: [] };
    mockAxiosInstance.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const result = await getStudentComparison(['s1', 's2']);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/analytics/teacher/student-comparison',
      {
        params: { studentIds: 's1,s2' },
      },
    );
    expect(result).toEqual(mockData);
  });

  it('exportData makes POST request with blob responseType', async () => {
    const mockBlob = new Blob(['test'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    mockAxiosInstance.post.mockResolvedValue({ data: mockBlob });

    const params = { classId: 'class-1', format: 'xlsx' as const };
    const result = await exportData(params);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/analytics/teacher/export',
      params,
      {
        responseType: 'blob',
      },
    );
    expect(result).toEqual(mockBlob);
  });
});
