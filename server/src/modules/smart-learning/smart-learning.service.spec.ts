import { Test, TestingModule } from '@nestjs/testing';
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
      ],
    }).compile();

    service = module.get<SmartLearningService>(SmartLearningService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeakPoints', () => {
    it('should return weak points sorted by mastery level', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue(mockLearningRecords as any);
      jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(3);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      // E level should have highest priority
      expect(result.items[0].learningRecord.masteryLevel).toBe(MasteryLevel.E);
      expect(result.items[1].learningRecord.masteryLevel).toBe(MasteryLevel.D);
      expect(result.items[2].learningRecord.masteryLevel).toBe(MasteryLevel.C);
    });

    it('should filter by textbookId when provided', async () => {
      const findManySpy = jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([mockLearningRecords[0]] as any);
      jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(1);

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
      jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(2);

      const result = await service.getWeakPoints(mockUserId, { limit: 2 });

      expect(result.items).toHaveLength(2);
    });

    it('should return empty array when no weak points', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);
      jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(0);

      const result = await service.getWeakPoints(mockUserId, {});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getByImportance', () => {
    it('should return points by importance level A', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([]);
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([mockKnowledgePoints[0]] as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(1);
      jest
        .spyOn(prismaService.learningRecord, 'findFirst')
        .mockResolvedValue(null);

      const result = await service.getByImportance(mockUserId, {
        level: ImportanceLevel.A,
      });

      expect(result.level).toBe(ImportanceLevel.A);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('kp-1');
    });

    it('should exclude mastered points when excludeMastered is true', async () => {
      jest
        .spyOn(prismaService.learningRecord, 'findMany')
        .mockResolvedValue([{ knowledgePointId: 'kp-1' }] as any);
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([mockKnowledgePoints[1]] as any);
      jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(1);

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
      jest
        .spyOn(prismaService.learningRecord, 'findFirst')
        .mockResolvedValue(null);

      const result = await service.getByImportance(mockUserId, {});

      expect(result.level).toBe(ImportanceLevel.A); // Default to A
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
});
