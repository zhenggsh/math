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
            $queryRaw: jest.fn(),
            learningRecord: {
              aggregate: jest.fn(),
              groupBy: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            knowledgePoint: {
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
            user: {
              count: jest.fn(),
              findUnique: jest.fn(),
            },
            textbook: {
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
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.B },
          { masteryLevel: MasteryLevel.B },
          { masteryLevel: MasteryLevel.B },
          { masteryLevel: MasteryLevel.C },
          { masteryLevel: MasteryLevel.C },
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
        .spyOn(prismaService.learningRecord, 'findMany')
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
          { durationMinutes: 30, startTime: mockDate },
        ] as never);

      const result = await service.getLearningTrend(mockUserId, 7);

      expect(result.trend).toHaveLength(7);
      const todayEntry = result.trend.find((t) => t.date === dateStr);
      expect(todayEntry).toBeDefined();
      expect(todayEntry!.durationMinutes).toBe(30);
    });

    it('should filter learning trend by textbookId', async () => {
      const findManySpy = jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([] as never);

      await service.getLearningTrend(mockUserId, 7, 'tb-1');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            knowledgePoint: { textbookId: 'tb-1' },
          }),
        }),
      );
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
          startTime: new Date(),
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
          startTime: new Date(),
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

  describe('getLearnedKnowledgePoints', () => {
    it('should return all learned knowledge points sorted by mastery level', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          knowledge_point_id: 'kp-a',
          code: '1.1.1',
          level1: '集合',
          level2: '集合的含义',
          level3: null,
          mastery_level: 'A',
          start_time: new Date('2026-05-15'),
        },
        {
          knowledge_point_id: 'kp-a',
          code: '1.1.1',
          level1: '集合',
          level2: '集合的含义',
          level3: null,
          mastery_level: 'B',
          start_time: new Date('2026-05-14'),
        },
        {
          knowledge_point_id: 'kp-c',
          code: '1.2.1',
          level1: '逻辑',
          level2: '命题',
          level3: null,
          mastery_level: 'C',
          start_time: new Date('2026-05-12'),
        },
        {
          knowledge_point_id: 'kp-c',
          code: '1.2.1',
          level1: '逻辑',
          level2: '命题',
          level3: null,
          mastery_level: 'D',
          start_time: new Date('2026-05-11'),
        },
        {
          knowledge_point_id: 'kp-e',
          code: '1.3.1',
          level1: '函数',
          level2: '概念',
          level3: null,
          mastery_level: 'E',
          start_time: new Date('2026-05-10'),
        },
        {
          knowledge_point_id: 'kp-e',
          code: '1.3.1',
          level1: '函数',
          level2: '概念',
          level3: null,
          mastery_level: 'E',
          start_time: new Date('2026-05-09'),
        },
      ] as never);

      const result = await service.getLearnedKnowledgePoints(mockUserId);

      expect(result.learnedKnowledgePoints).toHaveLength(3);
      // Should be sorted E -> C -> A
      expect(result.learnedKnowledgePoints[0].lastMasteryLevel).toBe('E');
      expect(result.learnedKnowledgePoints[0].lastTwoMasteryLevels).toEqual([
        'E',
        'E',
      ]);
      expect(result.learnedKnowledgePoints[1].lastMasteryLevel).toBe('C');
      expect(result.learnedKnowledgePoints[1].lastTwoMasteryLevels).toEqual([
        'D',
        'C',
      ]);
      expect(result.learnedKnowledgePoints[2].lastMasteryLevel).toBe('A');
      expect(result.learnedKnowledgePoints[2].lastTwoMasteryLevels).toEqual([
        'B',
        'A',
      ]);
    });

    it('should return empty array when no learning records', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([] as never);

      const result = await service.getLearnedKnowledgePoints(mockUserId);

      expect(result.learnedKnowledgePoints).toHaveLength(0);
    });

    it('should filter by userId', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([] as never);

      await service.getLearnedKnowledgePoints('user-specific');

      expect(prismaService.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining('lr.user_id ='),
          ]),
          values: expect.arrayContaining(['user-specific']),
        }),
      );
    });

    it('should filter by textbookId when provided', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([] as never);

      await service.getLearnedKnowledgePoints(mockUserId, 'tb-1');

      expect(prismaService.$queryRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining('kp."textbook_id" ='),
          ]),
          values: expect.arrayContaining([mockUserId, 'tb-1']),
        }),
      );
    });
  });

  describe('getTextbookSummary', () => {
    it('should throw NotFoundException when textbook does not exist', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await expect(
        service.getTextbookSummary(mockUserId, 'missing-tb'),
      ).rejects.toThrow('教材 missing-tb 不存在');
    });

    it('should return textbook summary for learned and unlearned points', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        name: 'Test Textbook',
      } as never);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(10);
      jest
        .spyOn(prismaService.learningRecord, 'groupBy')
        .mockResolvedValue([
          { knowledgePointId: 'kp-1', _count: { knowledgePointId: 1 } },
          { knowledgePointId: 'kp-2', _count: { knowledgePointId: 1 } },
          { knowledgePointId: 'kp-3', _count: { knowledgePointId: 1 } },
        ] as never);
      jest
        .spyOn(prismaService.knowledgePoint, 'groupBy')
        .mockResolvedValue([
          { importanceLevel: 'A', _count: { id: 4 } },
          { importanceLevel: 'B', _count: { id: 3 } },
          { importanceLevel: 'C', _count: { id: 3 } },
        ] as never);
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.A },
          { masteryLevel: MasteryLevel.B },
        ] as never);

      const result = await service.getTextbookSummary(mockUserId, 'tb-1');

      expect(result.textbookId).toBe('tb-1');
      expect(result.textbookName).toBe('Test Textbook');
      expect(result.totalKnowledgePoints).toBe(10);
      expect(result.learnedKnowledgePoints).toBe(3);
      expect(result.unlearnedKnowledgePoints).toBe(7);
      expect(result.importanceDistribution).toEqual([
        { level: 'A', count: 4 },
        { level: 'B', count: 3 },
        { level: 'C', count: 3 },
      ]);
      expect(result.masteryDistribution).toHaveLength(5);
      expect(result.masteryDistribution[0]).toEqual({
        level: 'A',
        count: 2,
        percentage: expect.closeTo(66.7, 1),
      });
    });
  });

  describe('getKnowledgePointProgress', () => {
    it('should return progress records sorted by date', async () => {
      const mockRecords = [
        {
          id: 'lr-1',
          startTime: new Date('2024-01-01'),
          durationMinutes: 30,
          masteryLevel: 'C',
          notes: 'First study',
          knowledgePoint: {
            id: 'kp-1',
            code: '1.1.1',
            level1: 'Chapter 1',
            level2: 'Section 1',
            level3: 'Point 1',
          },
        },
        {
          id: 'lr-3',
          startTime: new Date('2024-01-02'),
          durationMinutes: 20,
          masteryLevel: 'C',
          notes: null,
          knowledgePoint: {
            id: 'kp-1',
            code: '1.1.1',
            level1: 'Chapter 1',
            level2: 'Section 1',
            level3: 'Point 1',
          },
        },
        {
          id: 'lr-2',
          startTime: new Date('2024-01-03'),
          durationMinutes: 45,
          masteryLevel: 'B',
          notes: 'Second study',
          knowledgePoint: {
            id: 'kp-1',
            code: '1.1.1',
            level1: 'Chapter 1',
            level2: 'Section 1',
            level3: 'Point 1',
          },
        },
      ];
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(mockRecords as never);

      const result = await service.getKnowledgePointProgress(
        mockUserId,
        'kp-1',
      );

      expect(result.knowledgePointId).toBe('kp-1');
      expect(result.code).toBe('1.1.1');
      expect(result.title).toBe('Chapter 1 > Section 1 > Point 1');
      expect(result.progressRecords).toHaveLength(3);
      expect(result.progressRecords[0].date).toBe('2024-01-01');
      expect(result.progressRecords[1].date).toBe('2024-01-02');
      expect(result.progressRecords[2].date).toBe('2024-01-03');
      expect(result.progressRecords[0].masteryLevel).toBe('C');
      expect(result.progressRecords[0].durationMinutes).toBe(30);
      expect(result.progressRecords[0].notes).toBe('First study');
    });

    it('should return empty records for unlearned knowledge point', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([] as never);

      const result = await service.getKnowledgePointProgress(
        mockUserId,
        'kp-unknown',
      );

      expect(result.progressRecords).toHaveLength(0);
    });

    it('should filter by userId', async () => {
      const findManySpy = jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([] as never);

      await service.getKnowledgePointProgress('other-user', 'kp-1');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'other-user',
            knowledgePointId: 'kp-1',
          }),
        }),
      );
    });

    it('should filter by date range when provided', async () => {
      const findManySpy = jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([] as never);
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await service.getKnowledgePointProgress(
        mockUserId,
        'kp-1',
        startDate,
        endDate,
      );

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            knowledgePointId: 'kp-1',
            startTime: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        }),
      );
    });
  });
});
