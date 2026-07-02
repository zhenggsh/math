import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  StudyMessage,
  StudyMessageRole,
  StudyMessageFeedback,
} from '@prisma/client';
import {
  MessageFeedbackService,
  FeedbackValue,
} from './message-feedback.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('MessageFeedbackService', () => {
  let service: MessageFeedbackService;

  const mockPrismaService = {
    studyMessage: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageFeedbackService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MessageFeedbackService>(MessageFeedbackService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update feedback to positive', async () => {
    const userId = 'user-1';
    const messageId = 'msg-1';
    const message: StudyMessage = {
      id: messageId,
      sessionId: 'session-1',
      role: StudyMessageRole.AGENT,
      content: 'Answer',
      followUps: [],
      feedback: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };
    mockPrismaService.studyMessage.findFirst.mockResolvedValue(message);
    mockPrismaService.studyMessage.update.mockResolvedValue(message);

    await service.updateFeedback(userId, messageId, 'positive');

    expect(mockPrismaService.studyMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: messageId,
        role: StudyMessageRole.AGENT,
        session: { userId },
      },
    });
    expect(mockPrismaService.studyMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { feedback: StudyMessageFeedback.POSITIVE },
    });
  });

  it('should update feedback to negative', async () => {
    const userId = 'user-1';
    const messageId = 'msg-1';
    const message: StudyMessage = {
      id: messageId,
      sessionId: 'session-1',
      role: StudyMessageRole.AGENT,
      content: 'Answer',
      followUps: [],
      feedback: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };
    mockPrismaService.studyMessage.findFirst.mockResolvedValue(message);
    mockPrismaService.studyMessage.update.mockResolvedValue(message);

    await service.updateFeedback(userId, messageId, 'negative');

    expect(mockPrismaService.studyMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { feedback: StudyMessageFeedback.NEGATIVE },
    });
  });

  it('should reset feedback to null', async () => {
    const userId = 'user-1';
    const messageId = 'msg-1';
    const message: StudyMessage = {
      id: messageId,
      sessionId: 'session-1',
      role: StudyMessageRole.AGENT,
      content: 'Answer',
      followUps: [],
      feedback: StudyMessageFeedback.POSITIVE,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };
    mockPrismaService.studyMessage.findFirst.mockResolvedValue(message);
    mockPrismaService.studyMessage.update.mockResolvedValue(message);

    await service.updateFeedback(userId, messageId, null);

    expect(mockPrismaService.studyMessage.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { feedback: null },
    });
  });

  it('should throw BadRequestException for an invalid feedback value', async () => {
    await expect(
      service.updateFeedback('user-1', 'msg-1', 'neutral' as FeedbackValue),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.studyMessage.findFirst).not.toHaveBeenCalled();
    expect(mockPrismaService.studyMessage.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when the agent message does not exist', async () => {
    mockPrismaService.studyMessage.findFirst.mockResolvedValue(null);

    await expect(
      service.updateFeedback('user-1', 'missing', 'positive'),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrismaService.studyMessage.update).not.toHaveBeenCalled();
  });
});
