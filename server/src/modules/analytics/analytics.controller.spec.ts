import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';
import type {
  StudentOverviewDto,
  MasteryDistributionDto,
  LearningTrendDto,
  WeakPointsDto,
  KnowledgePointProgressDto,
  ClassOverviewDto,
  KnowledgeHeatDto,
  StudentComparisonDto,
} from './interfaces/stats.interfaces';
import type { Response } from 'express';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockUserId = 'user-123';

  const mockAnalyticsService = {
    getStudentOverview: jest.fn(),
    getMasteryDistribution: jest.fn(),
    getLearningTrend: jest.fn(),
    getWeakPoints: jest.fn(),
    getLearnedKnowledgePoints: jest.fn(),
    getKnowledgePointProgress: jest.fn(),
    getClassOverview: jest.fn(),
    getKnowledgeHeat: jest.fn(),
    getStudentComparison: jest.fn(),
  };

  const mockExportService = {
    exportLearningRecords: jest.fn(),
  };

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);

    jest.clearAllMocks();
  });

  it('should be defined', (): void => {
    expect(controller).toBeDefined();
  });

  describe('GET student/overview', () => {
    it('should return student overview', async (): Promise<void> => {
      const mockData: StudentOverviewDto = {
        totalLearningCount: 10,
        totalDurationMinutes: 300,
        uniqueKnowledgePoints: 5,
      };

      mockAnalyticsService.getStudentOverview.mockResolvedValue(mockData);

      const result = await controller.getStudentOverview(mockUserId);

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getStudentOverview).toHaveBeenCalledWith(
        mockUserId,
      );
    });
  });

  describe('GET student/mastery-distribution', () => {
    it('should return mastery distribution', async (): Promise<void> => {
      const mockData: MasteryDistributionDto = {
        distribution: [
          { level: MasteryLevel.A, count: 5, percentage: 50 },
          { level: MasteryLevel.B, count: 3, percentage: 30 },
          { level: MasteryLevel.C, count: 2, percentage: 20 },
        ],
      };

      mockAnalyticsService.getMasteryDistribution.mockResolvedValue(mockData);

      const result = await controller.getMasteryDistribution(mockUserId);

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getMasteryDistribution).toHaveBeenCalledWith(
        mockUserId,
      );
    });
  });

  describe('GET student/learning-trend', () => {
    it('should return learning trend with default days', async (): Promise<void> => {
      const mockData: LearningTrendDto = {
        trend: [{ date: '2026-04-01', durationMinutes: 60, count: 2 }],
      };

      mockAnalyticsService.getLearningTrend.mockResolvedValue(mockData);

      const result = await controller.getLearningTrend(mockUserId, {
        days: 30,
      });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getLearningTrend).toHaveBeenCalledWith(
        mockUserId,
        30,
      );
    });

    it('should pass custom days parameter to service', async (): Promise<void> => {
      const mockData: LearningTrendDto = { trend: [] };

      mockAnalyticsService.getLearningTrend.mockResolvedValue(mockData);

      await controller.getLearningTrend(mockUserId, { days: 7 });

      expect(mockAnalyticsService.getLearningTrend).toHaveBeenCalledWith(
        mockUserId,
        7,
      );
    });
  });

  describe('GET student/weak-points', () => {
    it('should return weak points with default limit', async (): Promise<void> => {
      const mockData: WeakPointsDto = {
        weakPoints: [
          {
            knowledgePointId: 'kp-1',
            code: '1.1.1',
            name: '集合的含义',
            importanceLevel: ImportanceLevel.A,
            lastMasteryLevel: 'D',
            lastLearningDate: '2026-04-01',
          },
        ],
      };

      mockAnalyticsService.getWeakPoints.mockResolvedValue(mockData);

      const result = await controller.getWeakPoints(mockUserId, { limit: 10 });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getWeakPoints).toHaveBeenCalledWith(
        mockUserId,
        10,
      );
    });

    it('should pass custom limit parameter to service', async (): Promise<void> => {
      const mockData: WeakPointsDto = { weakPoints: [] };

      mockAnalyticsService.getWeakPoints.mockResolvedValue(mockData);

      await controller.getWeakPoints(mockUserId, { limit: 5 });

      expect(mockAnalyticsService.getWeakPoints).toHaveBeenCalledWith(
        mockUserId,
        5,
      );
    });
  });

  describe('GET student/learned-knowledge-points', () => {
    it('should return learned knowledge points', async (): Promise<void> => {
      const mockData = {
        learnedKnowledgePoints: [
          {
            knowledgePointId: 'kp-1',
            code: '1.1.1',
            name: '集合 > 集合的含义',
            lastMasteryLevel: 'C',
            lastLearningDate: '2026-04-01',
          },
        ],
      };

      mockAnalyticsService.getLearnedKnowledgePoints.mockResolvedValue(mockData);

      const result = await controller.getLearnedKnowledgePoints(mockUserId);

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getLearnedKnowledgePoints).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('GET student/knowledge-point-progress', () => {
    it('should return knowledge point progress with date range', async (): Promise<void> => {
      const mockData: KnowledgePointProgressDto = {
        knowledgePointId: 'kp-1',
        code: '1.1.1',
        title: '集合的含义',
        level1: '集合与常用逻辑用语',
        level2: '集合的概念',
        level3: '集合的含义',
        progressRecords: [
          {
            date: '2026-04-01',
            masteryLevel: 'B',
            durationMinutes: 30,
            notes: '理解较好',
          },
        ],
      };

      mockAnalyticsService.getKnowledgePointProgress.mockResolvedValue(mockData);

      const result = await controller.getKnowledgePointProgress(
        mockUserId,
        { knowledgePointId: 'kp-1', startDate: '2026-01-01', endDate: '2026-12-31' },
      );

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getKnowledgePointProgress).toHaveBeenCalledWith(
        mockUserId,
        'kp-1',
        '2026-01-01',
        '2026-12-31',
      );
    });

    it('should call service without date range when not provided', async (): Promise<void> => {
      const mockData: KnowledgePointProgressDto = {
        knowledgePointId: 'kp-1',
        code: '1.1.1',
        title: '集合的含义',
        level1: '集合与常用逻辑用语',
        progressRecords: [],
      };

      mockAnalyticsService.getKnowledgePointProgress.mockResolvedValue(mockData);

      const result = await controller.getKnowledgePointProgress(
        mockUserId,
        { knowledgePointId: 'kp-1' },
      );

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getKnowledgePointProgress).toHaveBeenCalledWith(
        mockUserId,
        'kp-1',
        undefined,
        undefined,
      );
    });
  });

  describe('GET teacher/class-overview', () => {
    it('should return class overview', async (): Promise<void> => {
      const mockData: ClassOverviewDto = {
        studentCount: 30,
        activeStudentCount: 25,
        avgLearningCount: 10,
        avgDurationMinutes: 300,
      };

      mockAnalyticsService.getClassOverview.mockResolvedValue(mockData);

      const result = await controller.getClassOverview({
        classId: 'class-001',
      });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getClassOverview).toHaveBeenCalledWith(
        'class-001',
      );
    });

    it('should pass classId parameter to service', async (): Promise<void> => {
      const mockData: ClassOverviewDto = {
        studentCount: 0,
        activeStudentCount: 0,
        avgLearningCount: 0,
        avgDurationMinutes: 0,
      };

      mockAnalyticsService.getClassOverview.mockResolvedValue(mockData);

      await controller.getClassOverview({ classId: 'class-002' });

      expect(mockAnalyticsService.getClassOverview).toHaveBeenCalledWith(
        'class-002',
      );
    });
  });

  describe('GET teacher/knowledge-heat', () => {
    it('should return knowledge heat with default limit', async (): Promise<void> => {
      const mockData: KnowledgeHeatDto = {
        heatList: [
          {
            knowledgePointId: 'kp-1',
            code: '1.1.1',
            name: '集合的含义',
            learnCount: 50,
            uniqueStudentCount: 25,
          },
        ],
      };

      mockAnalyticsService.getKnowledgeHeat.mockResolvedValue(mockData);

      const result = await controller.getKnowledgeHeat({ limit: 20 });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getKnowledgeHeat).toHaveBeenCalledWith(20);
    });

    it('should pass custom limit parameter to service', async (): Promise<void> => {
      const mockData: KnowledgeHeatDto = { heatList: [] };

      mockAnalyticsService.getKnowledgeHeat.mockResolvedValue(mockData);

      await controller.getKnowledgeHeat({ limit: 10 });

      expect(mockAnalyticsService.getKnowledgeHeat).toHaveBeenCalledWith(10);
    });
  });

  describe('GET teacher/student-comparison', () => {
    it('should return student comparison', async (): Promise<void> => {
      const mockData: StudentComparisonDto = {
        students: [
          {
            id: 'user-1',
            name: 'Student A',
            totalDuration: 300,
            masteryStats: { A: 5, B: 3, C: 2 },
          },
        ],
      };

      mockAnalyticsService.getStudentComparison.mockResolvedValue(mockData);

      const result = await controller.getStudentComparison({
        studentIds: 'user-1,user-2',
      });

      expect(result).toEqual({ success: true, data: mockData });
      expect(mockAnalyticsService.getStudentComparison).toHaveBeenCalledWith([
        'user-1',
        'user-2',
      ]);
    });

    it('should handle empty studentIds', async (): Promise<void> => {
      const mockData: StudentComparisonDto = { students: [] };

      mockAnalyticsService.getStudentComparison.mockResolvedValue(mockData);

      await controller.getStudentComparison({ studentIds: '' });

      expect(mockAnalyticsService.getStudentComparison).toHaveBeenCalledWith(
        [],
      );
    });
  });

  describe('POST teacher/export', () => {
    it('should export learning records as xlsx', async (): Promise<void> => {
      const buffer = Buffer.from('mock-xlsx-data');

      mockExportService.exportLearningRecords.mockResolvedValue(buffer);

      const dto = {
        classId: 'class-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        format: 'xlsx' as const,
      };

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportData(dto, res);

      expect(mockExportService.exportLearningRecords).toHaveBeenCalledWith(dto);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename="learning-records-'),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.xlsx"'),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it('should export learning records as csv', async (): Promise<void> => {
      const buffer = Buffer.from('mock-csv-data');

      mockExportService.exportLearningRecords.mockResolvedValue(buffer);

      const dto = {
        format: 'csv' as const,
      };

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportData(dto, res);

      expect(mockExportService.exportLearningRecords).toHaveBeenCalledWith(dto);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv"'),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });
  });
});
