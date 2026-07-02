import { Test, TestingModule } from '@nestjs/testing';
import { StudyMessage, StudyMessageRole } from '@prisma/client';
import { StudyMessageService } from './study-message.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('StudyMessageService', () => {
  let service: StudyMessageService;

  const mockPrismaService = {
    studyMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyMessageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StudyMessageService>(StudyMessageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUserMessage', () => {
    it('should create a user message', async () => {
      const sessionId = 'session-1';
      const content = 'Hello';
      const message: StudyMessage = {
        id: 'msg-1',
        sessionId,
        role: StudyMessageRole.USER,
        content,
        followUps: [],
        feedback: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studyMessage.create.mockResolvedValue(message);

      const result = await service.createUserMessage(sessionId, content);

      expect(mockPrismaService.studyMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId,
          role: StudyMessageRole.USER,
          content,
        },
      });
      expect(result).toBe(message);
    });
  });

  describe('createAgentMessage', () => {
    it('should create an agent message with follow-ups', async () => {
      const input = {
        sessionId: 'session-1',
        content: 'Explanation',
        followUps: ['Q1', 'Q2'],
      };
      const message: StudyMessage = {
        id: 'msg-2',
        sessionId: input.sessionId,
        role: StudyMessageRole.AGENT,
        content: input.content,
        followUps: input.followUps,
        feedback: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studyMessage.create.mockResolvedValue(message);

      const result = await service.createAgentMessage(input);

      expect(mockPrismaService.studyMessage.create).toHaveBeenCalledWith({
        data: {
          sessionId: input.sessionId,
          role: StudyMessageRole.AGENT,
          content: input.content,
          followUps: input.followUps,
        },
      });
      expect(result).toBe(message);
    });
  });

  describe('findBySession', () => {
    it('should return messages ordered by createdAt ascending', async () => {
      const sessionId = 'session-1';
      const messages: StudyMessage[] = [
        {
          id: 'msg-1',
          sessionId,
          role: StudyMessageRole.USER,
          content: 'First',
          followUps: [],
          feedback: null,
          createdAt: new Date('2026-07-01T00:00:00Z'),
          updatedAt: new Date('2026-07-01T00:00:00Z'),
        },
      ];
      mockPrismaService.studyMessage.findMany.mockResolvedValue(messages);

      const result = await service.findBySession(sessionId);

      expect(mockPrismaService.studyMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(messages);
    });
  });

  describe('findLastAgentMessage', () => {
    it('should return the most recent agent message', async () => {
      const sessionId = 'session-1';
      const message: StudyMessage = {
        id: 'msg-2',
        sessionId,
        role: StudyMessageRole.AGENT,
        content: 'Latest',
        followUps: [],
        feedback: null,
        createdAt: new Date('2026-07-01T12:00:00Z'),
        updatedAt: new Date('2026-07-01T12:00:00Z'),
      };
      mockPrismaService.studyMessage.findMany.mockResolvedValue([message]);

      const result = await service.findLastAgentMessage(sessionId);

      expect(mockPrismaService.studyMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId, role: StudyMessageRole.AGENT },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(result).toBe(message);
    });

    it('should return null when there is no agent message', async () => {
      mockPrismaService.studyMessage.findMany.mockResolvedValue([]);

      const result = await service.findLastAgentMessage('session-1');

      expect(result).toBeNull();
    });
  });

  describe('findUserMessageById', () => {
    it('should find a user message scoped to the user', async () => {
      const userId = 'user-1';
      const userMessageId = 'msg-1';
      const message: StudyMessage = {
        id: userMessageId,
        sessionId: 'session-1',
        role: StudyMessageRole.USER,
        content: 'Question',
        followUps: [],
        feedback: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studyMessage.findFirst.mockResolvedValue(message);

      const result = await service.findUserMessageById(userId, userMessageId);

      expect(mockPrismaService.studyMessage.findFirst).toHaveBeenCalledWith({
        where: {
          id: userMessageId,
          role: StudyMessageRole.USER,
          session: { userId },
        },
      });
      expect(result).toBe(message);
    });
  });

  describe('findAgentResponseForUserMessage', () => {
    it('should return the first agent message after the user message', async () => {
      const sessionId = 'session-1';
      const userMessageId = 'msg-1';
      const userCreatedAt = new Date('2026-07-01T10:00:00Z');
      const agentMessage: StudyMessage = {
        id: 'msg-2',
        sessionId,
        role: StudyMessageRole.AGENT,
        content: 'Response',
        followUps: [],
        feedback: null,
        createdAt: new Date('2026-07-01T10:01:00Z'),
        updatedAt: new Date('2026-07-01T10:01:00Z'),
      };
      mockPrismaService.studyMessage.findFirst
        .mockResolvedValueOnce({ createdAt: userCreatedAt })
        .mockResolvedValueOnce(agentMessage);

      const result = await service.findAgentResponseForUserMessage(
        sessionId,
        userMessageId,
      );

      expect(mockPrismaService.studyMessage.findFirst).toHaveBeenNthCalledWith(
        1,
        {
          where: {
            id: userMessageId,
            sessionId,
            role: StudyMessageRole.USER,
          },
          select: { createdAt: true },
        },
      );
      expect(mockPrismaService.studyMessage.findFirst).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            sessionId,
            role: StudyMessageRole.AGENT,
            createdAt: { gt: userCreatedAt },
          },
          orderBy: { createdAt: 'asc' },
        },
      );
      expect(result).toBe(agentMessage);
    });

    it('should return null when the user message does not exist', async () => {
      mockPrismaService.studyMessage.findFirst.mockResolvedValue(null);

      const result = await service.findAgentResponseForUserMessage(
        'session-1',
        'missing',
      );

      expect(result).toBeNull();
    });
  });

  describe('updateAgentMessage', () => {
    it('should update content, follow-ups, and reset feedback', async () => {
      const id = 'msg-2';
      const content = 'Updated';
      const followUps = ['Q3'];
      const message: StudyMessage = {
        id,
        sessionId: 'session-1',
        role: StudyMessageRole.AGENT,
        content,
        followUps,
        feedback: null,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      mockPrismaService.studyMessage.update.mockResolvedValue(message);

      const result = await service.updateAgentMessage(id, content, followUps);

      expect(mockPrismaService.studyMessage.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          content,
          followUps,
          feedback: null,
        },
      });
      expect(result).toBe(message);
    });
  });
});
