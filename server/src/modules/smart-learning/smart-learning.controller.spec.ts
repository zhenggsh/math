import { Test, TestingModule } from '@nestjs/testing';
import { ImportanceLevel } from '@prisma/client';
import { SmartLearningController } from './smart-learning.controller';
import { SmartLearningService } from './smart-learning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('SmartLearningController', () => {
  let controller: SmartLearningController;
  let service: SmartLearningService;

  const mockUserId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmartLearningController],
      providers: [
        {
          provide: SmartLearningService,
          useValue: {
            getWeakPoints: jest.fn(),
            getByImportance: jest.fn(),
            getRandomPoints: jest.fn(),
            getLearningStats: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SmartLearningController>(SmartLearningController);
    service = module.get<SmartLearningService>(SmartLearningService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /weak-points', () => {
    it('should return weak points', async () => {
      const mockResult = {
        total: 2,
        items: [
          {
            knowledgePoint: { id: 'kp-1', code: '1.1.1' },
            learningRecord: { id: 'lr-1', masteryLevel: 'E' },
            priority: 100,
            recommendationReason: '掌握度较低，需要加强',
          },
        ],
      };
      jest.spyOn(service, 'getWeakPoints').mockResolvedValue(mockResult as any);

      const result = await controller.getWeakPoints(mockUserId, {});

      expect(result).toEqual({ success: true, data: mockResult });
      expect(service.getWeakPoints).toHaveBeenCalledWith(mockUserId, {});
    });

    it('should pass query parameters', async () => {
      const query = { textbookId: 'tb-1', limit: 10 };
      jest
        .spyOn(service, 'getWeakPoints')
        .mockResolvedValue({ total: 0, items: [] } as any);

      await controller.getWeakPoints(mockUserId, query);

      expect(service.getWeakPoints).toHaveBeenCalledWith(mockUserId, query);
    });
  });

  describe('GET /by-importance', () => {
    it('should return points by importance', async () => {
      const mockResult = {
        level: 'A',
        total: 5,
        items: [
          {
            id: 'kp-1',
            code: '1.1.1',
            isMastered: false,
            learningRecord: { id: 'lr-1', masteryLevel: 'C' },
            recommendationReason: '重要知识点，优先掌握',
          },
        ],
      };
      jest
        .spyOn(service, 'getByImportance')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getByImportance(mockUserId, {
        level: 'A',
      });

      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should pass query parameters', async () => {
      const query = {
        level: ImportanceLevel.B,
        excludeMastered: true,
        limit: 20,
      };
      jest.spyOn(service, 'getByImportance').mockResolvedValue({} as any);

      await controller.getByImportance(mockUserId, query);

      expect(service.getByImportance).toHaveBeenCalledWith(mockUserId, query);
    });
  });

  describe('GET /random', () => {
    it('should return random points', async () => {
      const mockResult = {
        items: [{ id: 'kp-1', code: '1.1.1' }],
      };
      jest
        .spyOn(service, 'getRandomPoints')
        .mockResolvedValue(mockResult as any);

      const result = await controller.getRandomPoints(mockUserId, { count: 5 });

      expect(result).toEqual({ success: true, data: mockResult });
    });
  });

  describe('GET /stats', () => {
    it('should return learning stats', async () => {
      const mockResult = {
        weakPointCount: 3,
        importanceStats: { A: 10, B: 20, C: 30 },
      };
      jest.spyOn(service, 'getLearningStats').mockResolvedValue(mockResult);

      const result = await controller.getLearningStats(mockUserId);

      expect(result).toEqual({ success: true, data: mockResult });
    });
  });
});
