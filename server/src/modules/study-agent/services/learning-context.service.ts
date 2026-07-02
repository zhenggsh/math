import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LearningContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentRecords(
    userId: string,
    knowledgePointId: string,
  ): Promise<string> {
    const records = await this.prisma.learningRecord.findMany({
      where: { userId, knowledgePointId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        masteryLevel: true,
        durationMinutes: true,
      },
    });

    if (records.length === 0) {
      return 'No prior learning records for this knowledge point.';
    }

    return records
      .slice(0, 3)
      .map(
        (record, index) =>
          `${index + 1}. Mastery: ${record.masteryLevel}, Duration: ${record.durationMinutes} minutes`,
      )
      .join('\n');
  }
}
