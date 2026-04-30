import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel } from '@prisma/client';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            learningRecord: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            knowledgePoint: {
              findMany: jest.fn(),
            },
            user: {
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStudentOverview', () => {
    it('should return student overview stats', async () => {
      jest.spyOn(prismaService.learningRecord, 'aggregate').mockResolvedValue({
        _count: { id: 10 },
        _sum: { durationMinutes: 300 },
      } as never);
      jest.spyOn(prismaService.learningRecord, 'groupBy').mockResolvedValue([
        { knowledgePointId: 'kp-1', _count: { knowledgePointId: 1 } },
        { knowledgePointId: 'kp-2', _count: { knowledgePointId: 1 } },
      ] as never);

      const result = await service.getStudentOverview(mockUserId);

      expect(result).toEqual({
        totalLearningCount: 10,
        totalDurationMinutes: 300,
        uniqueKnowledgePoints: 2,
      });
    });

    it('should handle zero records', async () => {
      jest.spyOn(prismaService.learningRecord, 'aggregate').mockResolvedValue({
        _count: { id: 0 },
        _sum: { durationMinutes: null },
      } as never);
      jest
        .spyOn(prismaService.learningRecord, 'groupBy')
        .mockResolvedValue([] as never);

      const result = await service.getStudentOverview(mockUserId);

      expect(result).toEqual({
        totalLearningCount: 0,
        totalDurationMinutes: 0,
        uniqueKnowledgePoints: 0,
      });
    });
  });

  describe('getMasteryDistribution', () => {
    it('should return mastery distribution', async () => {
      jest.spyOn(prismaService.learningRecord, 'groupBy').mockResolvedValue([
        { masteryLevel: MasteryLevel.A, _count: { id: 5 } },
        { masteryLevel: MasteryLevel.B, _count: { id: 3 } },
        { masteryLevel: MasteryLevel.C, _count: { id: 2 } },
      ] as never);

      const result = await service.getMasteryDistribution(mockUserId);

      expect(result.distribution).toHaveLength(5);
      expect(result.distribution[0]).toEqual({
        level: 'A',
        count: 5,
        percentage: 50,
      });
      expect(result.distribution[1]).toEqual({
        level: 'B',
        count: 3,
        percentage: 30,
      });
    });

    it('should handle empty distribution', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'groupBy')
        .mockResolvedValue([] as never);

      const result = await service.getMasteryDistribution(mockUserId);

      expect(
        result.distribution.every((d) => d.count === 0 && d.percentage === 0),
      ).toBe(true);
    });
  });

  describe('getLearningTrend', () => {
    it('should return learning trend for specified days', async () => {
      const mockDate = new Date();
      const dateStr = mockDate.toISOString().split('T')[0];
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([
          { durationMinutes: 30, createdAt: mockDate },
        ] as never);

      const result = await service.getLearningTrend(mockUserId, 7);

      expect(result.trend).toHaveLength(7);
      const todayEntry = result.trend.find((t) => t.date === dateStr);
      expect(todayEntry).toBeDefined();
      expect(todayEntry!.durationMinutes).toBe(30);
    });
  });

  describe('getWeakPoints', () => {
    it('should return weak points sorted by importance', async () => {
      jest.spyOn(prismaService.learningRecord, 'findMany').mockResolvedValue([
        {
          knowledgePoint: {
            id: 'kp-1',
            code: '1.1.1',
            level1: 'Chapter 1',
            level2: 'Section 1',
            level3: 'Point 1',
            importanceLevel: 'B',
          },
          masteryLevel: 'D',
          createdAt: new Date(),
        },
        {
          knowledgePoint: {
            id: 'kp-2',
            code: '1.1.2',
            level1: 'Chapter 1',
            level2: 'Section 1',
            level3: 'Point 2',
            importanceLevel: 'A',
          },
          masteryLevel: 'E',
          createdAt: new Date(),
        },
      ] as never);

      const result = await service.getWeakPoints(mockUserId, 10);

      expect(result.weakPoints).toHaveLength(2);
      expect(result.weakPoints[0].importanceLevel).toBe('A');
    });
  });

  describe('getClassOverview', () => {
    it('should return class overview stats', async () => {
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(50);
      jest.spyOn(prismaService.learningRecord, 'aggregate').mockResolvedValue({
        _count: { id: 200 },
        _sum: { durationMinutes: 5000 },
      } as never);
      jest.spyOn(prismaService.learningRecord, 'groupBy').mockResolvedValue([
        { userId: 'u-1', _count: { userId: 1 } },
        { userId: 'u-2', _count: { userId: 1 } },
      ] as never);

      const result = await service.getClassOverview();

      expect(result.studentCount).toBe(50);
      expect(result.activeStudentCount).toBe(2);
    });
  });

  describe('getKnowledgeHeat', () => {
    it('should return knowledge heat list', async () => {
      jest.spyOn(prismaService.learningRecord, 'groupBy').mockResolvedValue([
        { knowledgePointId: 'kp-1', _count: { id: 10 } },
        { knowledgePointId: 'kp-2', _count: { id: 5 } },
      ] as never);
      jest.spyOn(prismaService.knowledgePoint, 'findMany').mockResolvedValue([
        {
          id: 'kp-1',
          code: '1.1.1',
          level1: 'Ch1',
          level2: 'Sec1',
          level3: 'P1',
        },
        {
          id: 'kp-2',
          code: '1.1.2',
          level1: 'Ch1',
          level2: 'Sec1',
          level3: 'P2',
        },
      ] as never);
      jest
        .spyOn(prismaService.learningRecord, 'groupBy')
        .mockResolvedValueOnce([
          { knowledgePointId: 'kp-1', _count: { id: 10 } },
          { knowledgePointId: 'kp-2', _count: { id: 5 } },
        ] as never);

      const result = await service.getKnowledgeHeat(10);

      expect(result.heatList).toHaveLength(2);
    });
  });

  describe('getStudentComparison', () => {
    it('should return student comparison data', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        id: 'student-1',
        name: 'Student A',
      } as never);
      jest.spyOn(prismaService.learningRecord, 'findMany').mockResolvedValue([
        { durationMinutes: 30, masteryLevel: MasteryLevel.A },
        { durationMinutes: 20, masteryLevel: MasteryLevel.B },
      ] as never);

      const result = await service.getStudentComparison(['student-1']);

      expect(result.students).toHaveLength(1);
      expect(result.students[0].name).toBe('Student A');
      expect(result.students[0].totalDuration).toBe(50);
    });
  });
});
