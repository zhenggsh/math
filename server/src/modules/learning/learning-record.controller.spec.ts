import { Test, TestingModule } from '@nestjs/testing';
import { LearningRecordController } from './learning-record.controller';
import { LearningRecordService } from './learning-record.service';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

describe('LearningRecordController', () => {
  let controller: LearningRecordController;
  let service: LearningRecordService;

  const mockUserId = 'user-123';

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByKnowledgePoint: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningRecordController],
      providers: [
        {
          provide: LearningRecordService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LearningRecordController>(LearningRecordController);
    service = module.get<LearningRecordService>(LearningRecordService);

    jest.clearAllMocks();
  });

  describe('POST /learning-records', () => {
    it('should create a learning record', async () => {
      const createDto = {
        knowledgePointId: 'kp-123',
        masteryLevel: MasteryLevel.B,
        durationMinutes: 30,
        notes: 'Test notes',
      };

      const mockRecord = {
        id: 'record-123',
        userId: mockUserId,
        knowledgePointId: 'kp-123',
        startTime: new Date(),
        durationMinutes: 30,
        masteryLevel: MasteryLevel.B,
        notes: 'Test notes',
        createdAt: new Date(),
        knowledgePoint: {
          id: 'kp-123',
          code: '1.1.1',
          level1: 'Test',
          level2: null,
          level3: null,
          importanceLevel: ImportanceLevel.A,
        },
      };

      mockService.create.mockResolvedValue(mockRecord);

      const result = await controller.create(mockUserId, createDto);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('record-123');
      expect(mockService.create).toHaveBeenCalledWith(mockUserId, createDto);
    });
  });

  describe('GET /learning-records', () => {
    it('should return paginated learning records', async () => {
      const mockResult = {
        items: [
          {
            id: 'record-123',
            userId: mockUserId,
            knowledgePointId: 'kp-123',
            startTime: new Date(),
            durationMinutes: 30,
            masteryLevel: MasteryLevel.A,
            notes: null,
            createdAt: new Date(),
            knowledgePoint: {
              id: 'kp-123',
              code: '1.1.1',
              level1: 'Test',
              level2: null,
              level3: null,
              importanceLevel: ImportanceLevel.A,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('should pass query parameters to service', async () => {
      const query = {
        knowledgePointId: 'kp-123',
        page: 2,
        limit: 10,
      };

      mockService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      await controller.findAll(mockUserId, query);

      expect(mockService.findAll).toHaveBeenCalledWith(mockUserId, query);
    });
  });

  describe('GET /learning-records/knowledge-point/:knowledgePointId', () => {
    it('should return records for specific knowledge point', async () => {
      const knowledgePointId = 'kp-123';
      const mockRecords = [
        {
          id: 'record-123',
          userId: mockUserId,
          knowledgePointId,
          startTime: new Date(),
          durationMinutes: 30,
          masteryLevel: MasteryLevel.A,
          notes: null,
          createdAt: new Date(),
          knowledgePoint: {
            id: knowledgePointId,
            code: '1.1.1',
            level1: 'Test',
            level2: null,
            level3: null,
            importanceLevel: ImportanceLevel.A,
          },
        },
      ];

      mockService.findByKnowledgePoint.mockResolvedValue(mockRecords);

      const result = await controller.findByKnowledgePoint(
        mockUserId,
        knowledgePointId,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockService.findByKnowledgePoint).toHaveBeenCalledWith(
        mockUserId,
        knowledgePointId,
      );
    });
  });
});
