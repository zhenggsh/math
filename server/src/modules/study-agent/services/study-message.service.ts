import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudyMessage, StudyMessageRole } from '@prisma/client';

export interface CreateAgentMessageInput {
  sessionId: string;
  content: string;
  followUps: string[];
}

@Injectable()
export class StudyMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<StudyMessage> {
    const session = await this.prisma.studySession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.studyMessage.create({
      data: {
        sessionId,
        role: StudyMessageRole.USER,
        content,
      },
    });
  }

  async createAgentMessage(
    userId: string,
    input: CreateAgentMessageInput,
  ): Promise<StudyMessage> {
    const session = await this.prisma.studySession.findFirst({
      where: { id: input.sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.studyMessage.create({
      data: {
        sessionId: input.sessionId,
        role: StudyMessageRole.AGENT,
        content: input.content,
        followUps: input.followUps,
      },
    });
  }

  async findBySession(
    userId: string,
    sessionId: string,
  ): Promise<StudyMessage[]> {
    return this.prisma.studyMessage.findMany({
      where: { sessionId, session: { userId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLastAgentMessage(
    userId: string,
    sessionId: string,
  ): Promise<StudyMessage | null> {
    return this.prisma.studyMessage.findFirst({
      where: {
        sessionId,
        role: StudyMessageRole.AGENT,
        session: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserMessageById(
    userId: string,
    userMessageId: string,
  ): Promise<StudyMessage | null> {
    return this.prisma.studyMessage.findFirst({
      where: {
        id: userMessageId,
        role: StudyMessageRole.USER,
        session: { userId },
      },
    });
  }

  async findAgentResponseForUserMessage(
    userId: string,
    sessionId: string,
    userMessageId: string,
  ): Promise<StudyMessage | null> {
    const userMessage = await this.prisma.studyMessage.findFirst({
      where: {
        id: userMessageId,
        sessionId,
        role: StudyMessageRole.USER,
        session: { userId },
      },
      select: { createdAt: true },
    });

    if (!userMessage) {
      return null;
    }

    return this.prisma.studyMessage.findFirst({
      where: {
        sessionId,
        role: StudyMessageRole.AGENT,
        createdAt: { gt: userMessage.createdAt },
        session: { userId },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAgentMessage(
    userId: string,
    id: string,
    content: string,
    followUps: string[],
  ): Promise<StudyMessage> {
    const message = await this.prisma.studyMessage.findFirst({
      where: {
        id,
        role: StudyMessageRole.AGENT,
        session: { userId },
      },
    });

    if (!message) {
      throw new NotFoundException('Agent message not found');
    }

    return this.prisma.studyMessage.update({
      where: { id },
      data: {
        content,
        followUps,
        feedback: null,
      },
    });
  }
}
