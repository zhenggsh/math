import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudyMessageFeedback, StudyMessageRole } from '@prisma/client';

export type FeedbackValue = 'positive' | 'negative' | null;

@Injectable()
export class MessageFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async updateFeedback(
    userId: string,
    messageId: string,
    feedback: FeedbackValue,
  ): Promise<void> {
    if (
      feedback !== 'positive' &&
      feedback !== 'negative' &&
      feedback !== null
    ) {
      throw new BadRequestException(
        `Invalid feedback value: ${String(feedback)}. Must be 'positive', 'negative', or null.`,
      );
    }

    const message = await this.prisma.studyMessage.findFirst({
      where: {
        id: messageId,
        role: StudyMessageRole.AGENT,
        session: { userId },
      },
    });

    if (!message) {
      throw new NotFoundException('Agent message not found');
    }

    const feedbackValue = this.toStudyMessageFeedback(feedback);

    await this.prisma.studyMessage.update({
      where: { id: messageId },
      data: { feedback: feedbackValue },
    });
  }

  private toStudyMessageFeedback(
    feedback: FeedbackValue,
  ): StudyMessageFeedback | null {
    if (feedback === 'positive') {
      return StudyMessageFeedback.POSITIVE;
    }
    if (feedback === 'negative') {
      return StudyMessageFeedback.NEGATIVE;
    }
    return null;
  }
}
