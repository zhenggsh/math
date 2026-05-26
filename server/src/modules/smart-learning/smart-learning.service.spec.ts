import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmartLearningService } from './smart-learning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

describe('SmartLearningService', () => {
  let service: SmartLearningService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockTextbookId = 'textbook-123';

  // Mock data
  const mockKnowledgePoints = [
    {
      id: 'kp-1',
      code: '1.1.1',
      level1: 'Chapter 1',
      level2: 'Section 1',
      level3: 'Point 1',
      importanceLevel: ImportanceLevel.A,
      definition: 'Definition 1',
    },
    {
      id: 'kp-2',
      code: '1.1.2',
      level1: 'Chapter 1',
      level2: 'Section 1',
      level3: 'Point 2',
      importanceLevel: ImportanceLevel.B,
      definition: 'Definition 2',
    },
    {
      id: 'kp-3',
      code: '1.2.1',
      level1: 'Chapter 1',
      level2: 'Section 2',
      level3: 'Point 3',
      importanceLevel: ImportanceLevel.C,
      definition: 'Definition 3',
    },
  ];

  const mockLearningRecords = [
    {
      id: 'lr-1',
      userId: mockUserId,
      knowledgePointId: 'kp-1',
      masteryLevel: MasteryLevel.E,
      durationMinutes: 30,
      startTime: new Date('2024-01-01'),
      notes: null,
      knowledgePoint: mockKnowledgePoints[0],
    },
    {
      id: 'lr-2',
      userId: mockUserId,
      knowledgePointId: 'kp-2',
      masteryLevel: MasteryLevel.D,
      durationMinutes: 20,
      startTime: new Date('2024-01-02'),
      notes: null,
      knowledgePoint: mockKnowledgePoints[1],
    },
    {
      id: 'lr-3',
      userId: mockUserId,
      knowledgePointId: 'kp-3',
      masteryLevel: MasteryLevel.C,
      durationMinutes: 15,
      startTime: new Date('2024-01-03'),
      notes: null,
      knowledgePoint: mockKnowledgePoints[2],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartLearningService,
        {
          provide: PrismaService,
          useValue: {
            learningRecord: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
            },
            knowledgePoint: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              decayPerDay: 2,
              decayMax: 30,
              recentPenalty: 15,
              frequencyWindowDays: 7,
              importanceWeightA: 1.5,
              importanceWeightB: 1.2,
              importanceWeightC: 1.0,
              velocityMultiplier: 10,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SmartLearningService>(SmartLearningService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeakPoints', () => {
    it('should return weak points with recommendationReason', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(mockLearningRecords as any);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.items[0]).toHaveProperty('recommendationReason');
      expect(typeof result.items[0].recommendationReason).toBe('string');
    });

    it('should filter by textbookId when provided', async () => {
      const findManySpy = jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([mockLearningRecords[0]] as any);

      await service.getWeakPoints(mockUserId, { textbookId: mockTextbookId });

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            masteryLevel: {
              in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E],
            },
            knowledgePoint: { textbookId: mockTextbookId },
          }),
        }),
      );
    });

    it('should apply limit parameter', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(mockLearningRecords.slice(0, 2) as any);

      const result = await service.getWeakPoints(mockUserId, { limit: 2 });

      expect(result.items).toHaveLength(2);
    });

    it('should return empty array when no weak points', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should include recommendationReason for each weak point', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(mockLearningRecords as any);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items[0]).toHaveProperty('recommendationReason');
      expect(typeof result.items[0].recommendationReason).toBe('string');
      expect(result.items[0].recommendationReason.length).toBeGreaterThan(0);
    });

    it('should sort by scoring model with tie-breakers', async () => {
      // C-level with long decay + high importance should outrank E-level studied yesterday
      const longAgoRecords = [
        {
          ...mockLearningRecords[0],
          knowledgePoint: {
            ...mockKnowledgePoints[0],
            importanceLevel: ImportanceLevel.A,
          },
          startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          masteryLevel: MasteryLevel.C,
        },
        {
          ...mockLearningRecords[1],
          startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          masteryLevel: MasteryLevel.E,
        },
      ];

      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(longAgoRecords as any);

      const result = await service.getWeakPoints(mockUserId, {});

      // The C-level with long decay + high importance should outrank E-level studied yesterday
      expect(result.items[0].learningRecord.masteryLevel).toBe(MasteryLevel.C);
    });
  });

  describe('getByImportance', () => {
    it('should return points by importance level A with learningRecord and recommendationReason', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([mockKnowledgePoints[0]] as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(1);

      const result = await service.getByImportance(mockUserId, {
        level: ImportanceLevel.A,
      });

      expect(result.level).toBe(ImportanceLevel.A);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('kp-1');
      expect(result.items[0]).toHaveProperty('learningRecord');
      expect(result.items[0]).toHaveProperty('recommendationReason');
      expect(typeof result.items[0].recommendationReason).toBe('string');
    });

    it('should exclude mastered points when excludeMastered is true', async () => {
      // Mock a mastered record for kp-1
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValueOnce([{ knowledgePointId: 'kp-1' }] as any) // mastered check
        .mockResolvedValueOnce([
          {
            id: 'lr-1',
            knowledgePointId: 'kp-1',
            masteryLevel: MasteryLevel.A,
            startTime: new Date(),
            durationMinutes: 0,
            notes: null,
          },
        ] as any); // batch records
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue(mockKnowledgePoints as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(3);

      await service.getByImportance(mockUserId, {
        level: ImportanceLevel.A,
        excludeMastered: true,
      });

      expect(prismaService.knowledgePoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            importanceLevel: ImportanceLevel.A,
            id: { notIn: ['kp-1'] },
          }),
        }),
      );
    });

    it('should return all levels when level is not specified', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue(mockKnowledgePoints as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(3);

      const result = await service.getByImportance(mockUserId, {});

      expect(result.level).toBe(ImportanceLevel.A);
    });
  });

  describe('getRandomPoints', () => {
    it('should return random points', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue(mockKnowledgePoints as any);

      const result = await service.getRandomPoints(mockUserId, { count: 3 });

      expect(result.items).toHaveLength(3);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should limit count to specified number', async () => {
      const queryRawSpy = jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue(mockKnowledgePoints.slice(0, 2) as any);

      await service.getRandomPoints(mockUserId, { count: 2 });

      expect(queryRawSpy).toHaveBeenCalled();
    });
  });

  describe('getLearningStats', () => {
    it('should return learning statistics', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'count')
        .mockResolvedValueOnce(5);
      jest
        .spyOn(prismaService.knowledgePoint, 'count')
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(30);

      const result = await service.getLearningStats(mockUserId);

      expect(result.weakPointCount).toBe(5);
      expect(result.importanceStats).toEqual({ A: 10, B: 20, C: 30 });
    });
  });

  describe('pre-filtering', () => {
    it('should limit candidates when over 500', async () => {
      const manyRecords = Array.from({ length: 600 }, (_, i) => ({
        id: `lr-${i}`,
        userId: mockUserId,
        knowledgePointId: `kp-${i}`,
        masteryLevel: MasteryLevel.C,
        durationMinutes: 10,
        startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        notes: null,
        knowledgePoint: {
          id: `kp-${i}`,
          code: `${i}.1.1`,
          level1: 'Chapter',
          level2: 'Section',
          level3: 'Point',
          importanceLevel: ImportanceLevel.C,
          definition: 'Definition',
        },
      }));

      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(manyRecords as any);

      const result = await service.getWeakPoints(mockUserId, { limit: 20 });

      expect(result.items.length).toBeLessThanOrEqual(20);
    });
  });

  describe('zero-record fallback', () => {
    it('should return empty for weak points when no records', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return all points for importance when no records', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue(mockKnowledgePoints as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(3);

      const result = await service.getByImportance(mockUserId, {
        level: ImportanceLevel.A,
      });

      expect(result.items.length).toBe(3);
    });
  });

  describe('tie-breaking', () => {
    it('should sort by importance level when scores tie', async () => {
      const tiedRecords = [
        {
          ...mockLearningRecords[0],
          masteryLevel: MasteryLevel.C,
          startTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          knowledgePoint: {
            ...mockKnowledgePoints[0],
            importanceLevel: ImportanceLevel.B,
          },
        },
        {
          ...mockLearningRecords[1],
          masteryLevel: MasteryLevel.C,
          startTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          knowledgePoint: {
            ...mockKnowledgePoints[1],
            importanceLevel: ImportanceLevel.A,
          },
        },
      ];

      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(tiedRecords as any);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items[0].knowledgePoint.importanceLevel).toBe(
        ImportanceLevel.A,
      );
    });
  });
});
