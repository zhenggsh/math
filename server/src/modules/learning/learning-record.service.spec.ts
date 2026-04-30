import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LearningRecordService } from './learning-record.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

describe('LearningRecordService', () => {
  let service: LearningRecordService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockKnowledgePointId = 'kp-123';

  const mockPrismaService = {
    knowledgePoint: {
      findUnique: jest.fn(),
    },
    learningRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningRecordService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LearningRecordService>(LearningRecordService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a learning record successfully', async () => {
      const createDto = {
        knowledgePointId: mockKnowledgePointId,
        masteryLevel: MasteryLevel.B,
        durationMinutes: 30,
        notes: 'Test notes',
      };

      const mockKnowledgePoint = {
        id: mockKnowledgePointId,
        code: '1.1.1',
        level1: 'Test',
        importanceLevel: ImportanceLevel.A,
      };

      const mockRecord = {
        id: 'record-123',
        userId: mockUserId,
        knowledgePointId: mockKnowledgePointId,
        startTime: new Date(),
        durationMinutes: 30,
        masteryLevel: MasteryLevel.B,
        notes: 'Test notes',
        createdAt: new Date(),
        knowledgePoint: mockKnowledgePoint,
      };

      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue(
        mockKnowledgePoint,
      );
      mockPrismaService.learningRecord.create.mockResolvedValue(mockRecord);

      const result = await service.create(mockUserId, createDto);

      expect(result.id).toBe('record-123');
      expect(result.masteryLevel).toBe(MasteryLevel.B);
      expect(mockPrismaService.knowledgePoint.findUnique).toHaveBeenCalledWith({
        where: { id: mockKnowledgePointId },
      });
      expect(mockPrismaService.learningRecord.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when knowledge point does not exist', async () => {
      const createDto = {
        knowledgePointId: 'invalid-id',
        masteryLevel: MasteryLevel.B,
        durationMinutes: 30,
      };

      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated learning records', async () => {
      const mockRecords = [
        {
          id: 'record-1',
          userId: mockUserId,
          knowledgePointId: mockKnowledgePointId,
          startTime: new Date(),
          durationMinutes: 30,
          masteryLevel: MasteryLevel.A,
          notes: null,
          createdAt: new Date(),
          knowledgePoint: {
            id: mockKnowledgePointId,
            code: '1.1.1',
            level1: 'Test',
            importanceLevel: ImportanceLevel.A,
          },
        },
      ];

      mockPrismaService.learningRecord.findMany.mockResolvedValue(mockRecords);
      mockPrismaService.learningRecord.count.mockResolvedValue(1);

      const result = await service.findAll(mockUserId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by knowledgePointId when provided', async () => {
      mockPrismaService.learningRecord.findMany.mockResolvedValue([]);
      mockPrismaService.learningRecord.count.mockResolvedValue(0);

      await service.findAll(mockUserId, {
        knowledgePointId: mockKnowledgePointId,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.learningRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            knowledgePointId: mockKnowledgePointId,
          },
        }),
      );
    });
  });

  describe('findByKnowledgePoint', () => {
    it('should return records for specific knowledge point', async () => {
      const mockKnowledgePoint = {
        id: mockKnowledgePointId,
        code: '1.1.1',
      };

      const mockRecords = [
        {
          id: 'record-1',
          userId: mockUserId,
          knowledgePointId: mockKnowledgePointId,
          startTime: new Date(),
          durationMinutes: 30,
          masteryLevel: MasteryLevel.A,
          notes: null,
          createdAt: new Date(),
          knowledgePoint: mockKnowledgePoint,
        },
      ];

      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue(
        mockKnowledgePoint,
      );
      mockPrismaService.learningRecord.findMany.mockResolvedValue(mockRecords);

      const result = await service.findByKnowledgePoint(
        mockUserId,
        mockKnowledgePointId,
      );

      expect(result).toHaveLength(1);
      expect(mockPrismaService.learningRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            knowledgePointId: mockKnowledgePointId,
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should throw NotFoundException when knowledge point does not exist', async () => {
      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue(null);

      await expect(
        service.findByKnowledgePoint(mockUserId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
