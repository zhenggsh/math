import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StudyMessageRole, StudyMessageFeedback } from '@prisma/client';
import { StudyAgentController } from './study-agent.controller';
import { StudySessionService } from './services/study-session.service';
import { StudyMessageService } from './services/study-message.service';
import { MessageFeedbackService } from './services/message-feedback.service';
import { StudyRateLimitService } from './services/study-rate-limit.service';
import { StudySkillRegistry } from './services/study-skill.registry';
import { QaSkillInput, QaSkillResult } from './services/skills/qa.skill';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

describe('StudyAgentController', () => {
  let controller: StudyAgentController;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';
  const mockKnowledgePointId = 'kp-123';
  const mockTitle = '三角函数的基本概念';
  const mockCode = '1.1.1';
  const mockContentRef = 'trigonometry.md';
  const mockTextbookContentPath = 'textbook.md';

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    knowledgePointId: mockKnowledgePointId,
    title: mockTitle,
    createdAt: new Date('2026-07-01T00:00:00Z'),
  };

  const mockSessionService = {
    upsert: jest.fn(),
    findById: jest.fn(),
  };

  const mockMessageService = {
    createUserMessage: jest.fn(),
    createAgentMessage: jest.fn(),
    findBySession: jest.fn(),
    findUserMessageById: jest.fn(),
    findAgentResponseForUserMessage: jest.fn(),
    updateAgentMessage: jest.fn(),
  };

  const mockFeedbackService = {
    updateFeedback: jest.fn(),
  };

  const mockRateLimitService = {
    isAllowed: jest.fn(),
  };

  const mockSkillExecute = jest.fn<Promise<QaSkillResult>, [QaSkillInput]>();
  const mockSkillRegistry = {
    getDefaultSkill: jest.fn().mockReturnValue({
      execute: mockSkillExecute,
    }),
  };

  const mockPrismaService = {
    knowledgePoint: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyAgentController],
      providers: [
        { provide: StudySessionService, useValue: mockSessionService },
        { provide: StudyMessageService, useValue: mockMessageService },
        { provide: MessageFeedbackService, useValue: mockFeedbackService },
        { provide: StudyRateLimitService, useValue: mockRateLimitService },
        { provide: StudySkillRegistry, useValue: mockSkillRegistry },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<StudyAgentController>(StudyAgentController);

    jest.clearAllMocks();
    mockRateLimitService.isAllowed.mockReturnValue(true);
  });

  describe('POST /study-agent/sessions', () => {
    it('should create or upsert a session and return it with messages', async () => {
      const dto: CreateSessionDto = {
        knowledgePointId: mockKnowledgePointId,
        knowledgePointTitle: mockTitle,
      };

      mockSessionService.upsert.mockResolvedValue(mockSession);
      mockMessageService.findBySession.mockResolvedValue([]);

      const result = await controller.createSession(mockUserId, dto);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockSessionId);
      expect(result.data.title).toBe(mockTitle);
      expect(result.data.messages).toEqual([]);
      expect(mockSessionService.upsert).toHaveBeenCalledWith(
        mockUserId,
        mockKnowledgePointId,
        mockTitle,
      );
    });
  });

  describe('GET /study-agent/sessions/:id', () => {
    it('should return session with messages', async () => {
      const userMessage = {
        id: 'msg-1',
        sessionId: mockSessionId,
        role: StudyMessageRole.USER,
        content: 'hello',
        followUps: [],
        feedback: null,
        createdAt: new Date('2026-07-01T00:01:00Z'),
      };

      mockSessionService.findById.mockResolvedValue(mockSession);
      mockMessageService.findBySession.mockResolvedValue([userMessage]);

      const result = await controller.findSession(mockUserId, mockSessionId);

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.messages[0].role).toBe('user');
    });

    it('should throw 404 if session not found or not owned', async () => {
      mockSessionService.findById.mockResolvedValue(null);

      await expect(
        controller.findSession(mockUserId, mockSessionId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('POST /study-agent/sessions/:id/messages', () => {
    const dto: CreateMessageDto = { content: '什么是三角函数？' };

    const userMessage = {
      id: 'msg-user-1',
      sessionId: mockSessionId,
      role: StudyMessageRole.USER,
      content: dto.content,
      followUps: [],
      feedback: null,
      createdAt: new Date('2026-07-01T00:01:00Z'),
    };

    const agentMessage = {
      id: 'msg-agent-1',
      sessionId: mockSessionId,
      role: StudyMessageRole.AGENT,
      content: 'AI answer',
      followUps: ['q1', 'q2', 'q3'],
      feedback: null,
      createdAt: new Date('2026-07-01T00:02:00Z'),
    };

    beforeEach(() => {
      mockSessionService.findById.mockResolvedValue(mockSession);
      mockMessageService.createUserMessage.mockResolvedValue(userMessage);
      mockMessageService.findBySession.mockResolvedValue([userMessage]);
      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue({
        id: mockKnowledgePointId,
        code: mockCode,
        contentRef: mockContentRef,
        textbook: { contentPath: mockTextbookContentPath },
      });
      mockSkillExecute.mockResolvedValue({
        content: 'AI answer',
        followUps: ['q1', 'q2', 'q3'],
      });
      mockMessageService.createAgentMessage.mockResolvedValue(agentMessage);
    });

    it('should create user message, generate agent response, and return it', async () => {
      const result = await controller.createMessage(
        mockUserId,
        mockSessionId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data.role).toBe('agent');
      expect(result.data.content).toBe('AI answer');
      expect(result.data.followUps).toEqual(['q1', 'q2', 'q3']);
      expect(mockRateLimitService.isAllowed).toHaveBeenCalledWith(mockUserId);
      expect(mockMessageService.createUserMessage).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
        dto.content,
      );
      expect(mockSkillExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          knowledgePointId: mockKnowledgePointId,
          question: dto.content,
          history: [],
          title: mockTitle,
          code: mockCode,
          contentRef: mockContentRef,
          textbookContentPath: mockTextbookContentPath,
        }),
      );
    });

    it('should throw 404 if session not found', async () => {
      mockSessionService.findById.mockResolvedValue(null);

      await expect(
        controller.createMessage(mockUserId, mockSessionId, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw 429 if rate limit exceeded', async () => {
      mockRateLimitService.isAllowed.mockReturnValue(false);

      await expect(
        controller.createMessage(mockUserId, mockSessionId, dto),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: '请求太频繁，请稍后再试',
      });
    });

    it('should throw 503 if LLM call fails', async () => {
      mockSkillExecute.mockRejectedValue(new Error('LLM timeout'));

      await expect(
        controller.createMessage(mockUserId, mockSessionId, dto),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('PUT /study-agent/messages/:id/feedback', () => {
    it('should update feedback on agent message', async () => {
      const dto: UpdateFeedbackDto = { feedback: 'positive' };
      mockFeedbackService.updateFeedback.mockResolvedValue(undefined);

      const result = await controller.updateFeedback(
        mockUserId,
        'msg-agent-1',
        dto,
      );

      expect(result.success).toBe(true);
      expect(mockFeedbackService.updateFeedback).toHaveBeenCalledWith(
        mockUserId,
        'msg-agent-1',
        'positive',
      );
    });

    it('should allow removing feedback', async () => {
      const dto: UpdateFeedbackDto = {};
      mockFeedbackService.updateFeedback.mockResolvedValue(undefined);

      await controller.updateFeedback(mockUserId, 'msg-agent-1', dto);

      expect(mockFeedbackService.updateFeedback).toHaveBeenCalledWith(
        mockUserId,
        'msg-agent-1',
        null,
      );
    });
  });

  describe('POST /study-agent/messages/:userMessageId/regenerate', () => {
    const userMessageId = 'msg-user-1';
    const agentMessageId = 'msg-agent-1';
    const userCreatedAt = new Date('2026-07-01T00:01:00Z');
    const agentCreatedAt = new Date('2026-07-01T00:02:00Z');
    const updatedCreatedAt = new Date('2026-07-01T00:03:00Z');

    const userMessage = {
      id: userMessageId,
      sessionId: mockSessionId,
      role: StudyMessageRole.USER,
      content: '请解释三角函数',
      followUps: [],
      feedback: null,
      createdAt: userCreatedAt,
    };

    const agentMessage = {
      id: agentMessageId,
      sessionId: mockSessionId,
      role: StudyMessageRole.AGENT,
      content: 'Old answer',
      followUps: ['old-1'],
      feedback: StudyMessageFeedback.POSITIVE,
      createdAt: agentCreatedAt,
    };

    const updatedAgentMessage = {
      id: agentMessageId,
      sessionId: mockSessionId,
      role: StudyMessageRole.AGENT,
      content: 'New answer',
      followUps: ['new-1', 'new-2', 'new-3'],
      feedback: null,
      createdAt: updatedCreatedAt,
    };

    beforeEach(() => {
      mockMessageService.findUserMessageById.mockResolvedValue(userMessage);
      mockMessageService.findAgentResponseForUserMessage.mockResolvedValue(
        agentMessage,
      );
      mockSessionService.findById.mockResolvedValue(mockSession);
      mockMessageService.findBySession.mockResolvedValue([
        userMessage,
        agentMessage,
      ]);
      mockPrismaService.knowledgePoint.findUnique.mockResolvedValue({
        id: mockKnowledgePointId,
        code: mockCode,
        contentRef: mockContentRef,
        textbook: { contentPath: mockTextbookContentPath },
      });
      mockSkillExecute.mockResolvedValue({
        content: 'New answer',
        followUps: ['new-1', 'new-2', 'new-3'],
      });
      mockMessageService.updateAgentMessage.mockResolvedValue(
        updatedAgentMessage,
      );
    });

    it('should regenerate the agent response for the user message', async () => {
      const result = await controller.regenerate(mockUserId, userMessageId);

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('New answer');
      expect(result.data.followUps).toEqual(['new-1', 'new-2', 'new-3']);
      expect(result.data.feedback).toBeNull();
      expect(mockSkillExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          question: userMessage.content,
        }),
      );
      const actualHistory = mockSkillExecute.mock.calls[0][0].history as Array<{
        role: StudyMessageRole;
        content: string;
      }>;
      expect(actualHistory).toHaveLength(0);
      expect(mockMessageService.updateAgentMessage).toHaveBeenCalledWith(
        mockUserId,
        agentMessageId,
        'New answer',
        ['new-1', 'new-2', 'new-3'],
      );
    });

    it('should throw 404 if user message not found', async () => {
      mockMessageService.findUserMessageById.mockResolvedValue(null);

      await expect(
        controller.regenerate(mockUserId, userMessageId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw 404 if agent response not found', async () => {
      mockMessageService.findAgentResponseForUserMessage.mockResolvedValue(
        null,
      );

      await expect(
        controller.regenerate(mockUserId, userMessageId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw 429 if rate limit exceeded', async () => {
      mockRateLimitService.isAllowed.mockReturnValue(false);

      await expect(
        controller.regenerate(mockUserId, userMessageId),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: '请求太频繁，请稍后再试',
      });
    });

    it('should throw 503 if LLM call fails', async () => {
      mockSkillExecute.mockRejectedValue(new Error('LLM error'));

      await expect(
        controller.regenerate(mockUserId, userMessageId),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('role and feedback mapping', () => {
    it('should map agent message with positive feedback correctly', async () => {
      const agentMessage = {
        id: 'msg-agent-1',
        sessionId: mockSessionId,
        role: StudyMessageRole.AGENT,
        content: 'AI answer',
        followUps: ['q1', 'q2', 'q3'],
        feedback: StudyMessageFeedback.POSITIVE,
        createdAt: new Date('2026-07-01T00:01:00Z'),
      };

      mockSessionService.findById.mockResolvedValue(mockSession);
      mockMessageService.findBySession.mockResolvedValue([agentMessage]);

      const result = await controller.findSession(mockUserId, mockSessionId);

      expect(result.data.messages[0].role).toBe('agent');
      expect(result.data.messages[0].feedback).toBe('positive');
    });
  });
});
