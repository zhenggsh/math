import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudySession } from '@prisma/client';

@Injectable()
export class StudySessionService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    userId: string,
    knowledgePointId: string,
    title: string,
  ): Promise<StudySession> {
    return this.prisma.studySession.upsert({
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
  }

  async findById(
    userId: string,
    sessionId: string,
  ): Promise<StudySession | null> {
    return this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async findByKnowledgePoint(
    userId: string,
    knowledgePointId: string,
  ): Promise<StudySession | null> {
    return this.prisma.studySession.findUnique({
      where: {
        idx_study_session_user_knowledge_point: {
          userId,
          knowledgePointId,
        },
      },
    });
  }
}
