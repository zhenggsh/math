import { Test, TestingModule } from '@nestjs/testing';
import { StudySessionService } from './study-session.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudySession } from '@prisma/client';

describe('StudySessionService', () => {
  let service: StudySessionService;

  const mockPrismaService = {
    studySession: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudySessionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StudySessionService>(StudySessionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    it('should create or update a study session using the named unique constraint', async () => {
      const userId = 'user-1';
      const knowledgePointId = 'kp-1';
      const title = 'Session Title';
      const session: StudySession = {
        id: 'session-1',
        userId,
        knowledgePointId,
        title,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studySession.upsert.mockResolvedValue(session);

      const result = await service.upsert(userId, knowledgePointId, title);

      expect(mockPrismaService.studySession.upsert).toHaveBeenCalledWith({
        where: {
          idx_study_session_user_knowledge_point: {
            userId,
            knowledgePointId,
          },
        },
        create: {
          userId,
          knowledgePointId,
          title,
        },
        update: {},
      });
      expect(result).toBe(session);
    });
  });

  describe('findById', () => {
    it('should find a session scoped to the user', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';
      const session: StudySession = {
        id: sessionId,
        userId,
        knowledgePointId: 'kp-1',
        title: 'Session Title',
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studySession.findFirst.mockResolvedValue(session);

      const result = await service.findById(userId, sessionId);

      expect(mockPrismaService.studySession.findFirst).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          userId,
        },
      });
      expect(result).toBe(session);
    });

    it('should return null when no session is found', async () => {
      mockPrismaService.studySession.findFirst.mockResolvedValue(null);

      const result = await service.findById('user-1', 'missing');

      expect(result).toBeNull();
    });
  });

  describe('findByKnowledgePoint', () => {
    it('should find a session by user and knowledge point', async () => {
      const userId = 'user-1';
      const knowledgePointId = 'kp-1';
      const session: StudySession = {
        id: 'session-1',
        userId,
        knowledgePointId,
        title: 'Session Title',
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studySession.findFirst.mockResolvedValue(session);

      const result = await service.findByKnowledgePoint(
        userId,
        knowledgePointId,
      );

      expect(mockPrismaService.studySession.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          knowledgePointId,
        },
      });
      expect(result).toBe(session);
    });

    it('should return null when no session is found', async () => {
      mockPrismaService.studySession.findFirst.mockResolvedValue(null);

      const result = await service.findByKnowledgePoint('user-1', 'missing');

      expect(result).toBeNull();
    });
  });
});
