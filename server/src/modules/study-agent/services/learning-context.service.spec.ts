import { Test, TestingModule } from '@nestjs/testing';
import { LearningContextService } from './learning-context.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MasteryLevel } from '@prisma/client';

describe('LearningContextService', () => {
  let service: LearningContextService;

  const mockPrismaService = {
    learningRecord: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningContextService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LearningContextService>(LearningContextService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should format recent records for a knowledge point', async () => {
    const userId = 'user-1';
    const knowledgePointId = 'kp-1';
    const records = [
      {
        masteryLevel: MasteryLevel.A,
        durationMinutes: 10,
        createdAt: new Date('2026-07-01T10:00:00Z'),
      },
      {
        masteryLevel: MasteryLevel.B,
        durationMinutes: 20,
        createdAt: new Date('2026-07-01T09:00:00Z'),
      },
    ];

    mockPrismaService.learningRecord.findMany.mockResolvedValue(records);

    const result = await service.getRecentRecords(userId, knowledgePointId);

    expect(mockPrismaService.learningRecord.findMany).toHaveBeenCalledWith({
      where: { userId, knowledgePointId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        masteryLevel: true,
        durationMinutes: true,
        createdAt: true,
      },
    });
    expect(result).toContain('1. Mastery: A, Duration: 10 minutes');
    expect(result).toContain('2. Mastery: B, Duration: 20 minutes');
  });

  it('should return a no-records message when none exist', async () => {
    mockPrismaService.learningRecord.findMany.mockResolvedValue([]);

    const result = await service.getRecentRecords('user-1', 'kp-1');

    expect(result).toBe('No prior learning records for this knowledge point.');
  });

  it('should limit output to the three most recent records', async () => {
    const records = [
      {
        masteryLevel: MasteryLevel.A,
        durationMinutes: 5,
        createdAt: new Date('2026-07-03T10:00:00Z'),
      },
      {
        masteryLevel: MasteryLevel.B,
        durationMinutes: 10,
        createdAt: new Date('2026-07-02T10:00:00Z'),
      },
      {
        masteryLevel: MasteryLevel.C,
        durationMinutes: 15,
        createdAt: new Date('2026-07-01T10:00:00Z'),
      },
      {
        masteryLevel: MasteryLevel.D,
        durationMinutes: 20,
        createdAt: new Date('2026-06-30T10:00:00Z'),
      },
    ];

    mockPrismaService.learningRecord.findMany.mockResolvedValue(records);

    const result = await service.getRecentRecords('user-1', 'kp-1');

    expect(result).toContain('1. Mastery: A, Duration: 5 minutes');
    expect(result).toContain('2. Mastery: B, Duration: 10 minutes');
    expect(result).toContain('3. Mastery: C, Duration: 15 minutes');
    expect(result).not.toContain('Mastery: D');
  });
});
