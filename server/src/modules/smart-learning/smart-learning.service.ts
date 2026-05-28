import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';
import type { RecommendationConfig } from './recommendation.config';
import {
  calculateBaseScore,
  calculateDecayBonus,
  calculateRecentStudyPenalty,
  calculateImportanceWeight,
  calculateImprovementVelocity,
  calculateFinalScore,
  generateRecommendationReason,
} from './recommendation-scorer';

export interface WeakPointItem {
  knowledgePoint: {
    id: string;
    code: string;
    level1: string;
    level2: string | null;
    level3: string | null;
    importanceLevel: ImportanceLevel;
    definition: string | null;
  };
  learningRecord: {
    id: string;
    masteryLevel: MasteryLevel;
    durationMinutes: number;
    startTime: Date;
    notes: string | null;
  };
  priority: number;
  recommendationReason: string;
}

export interface ByImportanceItem {
  id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  importanceLevel: ImportanceLevel;
  definition: string | null;
  isMastered: boolean;
  learningRecord: {
    id: string;
    masteryLevel: MasteryLevel;
    durationMinutes: number;
    startTime: Date;
    notes: string | null;
  } | null;
  recommendationReason: string;
}

export interface RandomItem {
  id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  importanceLevel: ImportanceLevel;
  definition: string | null;
}

export interface WeakPointsQuery {
  textbookId?: string;
  limit?: number;
}

export interface ByImportanceQuery {
  level?: ImportanceLevel;
  excludeMastered?: boolean;
  limit?: number;
}

export interface RandomQuery {
  textbookId?: string;
  count?: number;
}

@Injectable()
export class SmartLearningService {
  private readonly logger = new Logger(SmartLearningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async getRecentRecordsForCandidates(
    userId: string,
    candidateIds: string[],
  ): Promise<
    Array<{
      id: string;
      knowledgePointId: string;
      masteryLevel: MasteryLevel;
      startTime: Date;
      durationMinutes: number;
      notes: string | null;
    }>
  > {
    if (candidateIds.length === 0) return [];
    return this.prisma.learningRecord.findMany({
      where: { userId, knowledgePointId: { in: candidateIds } },
      select: {
        id: true,
        knowledgePointId: true,
        masteryLevel: true,
        startTime: true,
        durationMinutes: true,
        notes: true,
      },
      orderBy: { startTime: 'desc' },
      take: Math.min(candidateIds.length * 2, 1000),
    });
  }

  /**
   * 获取薄弱知识点列表
   * 筛选掌握程度为 C/D/E 的知识点，按优先级排序
   */
  async getWeakPoints(
    userId: string,
    query: WeakPointsQuery,
  ): Promise<{ total: number; items: WeakPointItem[] }> {
    const { textbookId, limit = 20 } = query;
    const config = this.configService.get<RecommendationConfig>('recommendation')!;

    // Step 1: Get all non-mastered records for this user
    let records = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        masteryLevel: { in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E] },
        ...(textbookId ? { knowledgePoint: { textbookId } } : {}),
      },
      include: {
        knowledgePoint: {
          select: {
            id: true,
            code: true,
            level1: true,
            level2: true,
            level3: true,
            importanceLevel: true,
            definition: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    // Pre-filtering: if >500 candidates, take oldest 200 first
    if (records.length > 500) {
      records = records.slice(0, 200);
    }

    // Step 2: Get candidate IDs and batch fetch recent records
    const candidateIds = [...new Set(records.map((r) => r.knowledgePointId))];
    const recentRecords = await this.getRecentRecordsForCandidates(userId, candidateIds);

    // Step 3: Group recent records by knowledgePointId
    const recordsByKp = new Map<string, typeof recentRecords>();
    for (const r of recentRecords) {
      const list = recordsByKp.get(r.knowledgePointId) ?? [];
      list.push(r);
      recordsByKp.set(r.knowledgePointId, list);
    }

    // Step 4: Score each unique knowledge point
    const scoredItems: Array<{
      item: WeakPointItem;
      finalScore: number;
      importanceLevel: ImportanceLevel;
      startTime: Date;
      code: string;
    }> = [];

    const seenKpIds = new Set<string>();
    for (const record of records) {
      if (seenKpIds.has(record.knowledgePointId)) continue;
      seenKpIds.add(record.knowledgePointId);

      const kpRecords = recordsByKp.get(record.knowledgePointId) ?? [];
      const latestRecord = kpRecords[0] ?? record;

      const components = {
        baseScore: calculateBaseScore(latestRecord.masteryLevel),
        decayBonus: calculateDecayBonus(latestRecord.startTime, config),
        recentStudyPenalty: calculateRecentStudyPenalty(kpRecords, config),
        importanceWeight: calculateImportanceWeight(
          record.knowledgePoint.importanceLevel,
          config,
        ),
        improvementVelocity: calculateImprovementVelocity(kpRecords, config),
      };

      const finalScore = calculateFinalScore(components);
      const reason = generateRecommendationReason(components);

      scoredItems.push({
        item: {
          knowledgePoint: record.knowledgePoint,
          learningRecord: {
            id: record.id,
            masteryLevel: latestRecord.masteryLevel,
            durationMinutes: record.durationMinutes,
            startTime: latestRecord.startTime,
            notes: record.notes,
          },
          priority: Math.round(finalScore),
          recommendationReason: reason,
        },
        finalScore,
        importanceLevel: record.knowledgePoint.importanceLevel,
        startTime: latestRecord.startTime,
        code: record.knowledgePoint.code,
      });
    }

    // Step 5: Sort by finalScore desc, then tie-breakers
    scoredItems.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      const importanceOrder = { A: 0, B: 1, C: 2 };
      const impDiff =
        importanceOrder[a.importanceLevel] - importanceOrder[b.importanceLevel];
      if (impDiff !== 0) return impDiff;
      if (a.startTime.getTime() !== b.startTime.getTime())
        return a.startTime.getTime() - b.startTime.getTime();
      return a.code.localeCompare(b.code);
    });

    // Step 6: Apply limit
    const total = scoredItems.length;
    const limitedItems = scoredItems.slice(0, limit);

    return {
      total,
      items: limitedItems.map((s) => s.item),
    };
  }

  /**
   * 按重要性级别获取知识点
   */
  async getByImportance(
    userId: string,
    query: ByImportanceQuery,
  ): Promise<{
    level: ImportanceLevel;
    total: number;
    items: ByImportanceItem[];
  }> {
    const { level, excludeMastered = true, limit = 50 } = query;
    const config = this.configService.get<RecommendationConfig>('recommendation')!;
    const targetLevel = level || ImportanceLevel.A;

    // Get mastered IDs if excluding
    let masteredIds: string[] = [];
    if (excludeMastered) {
      const masteredRecords = await this.prisma.learningRecord.findMany({
        where: { userId, masteryLevel: MasteryLevel.A },
        select: { knowledgePointId: true },
      });
      masteredIds = masteredRecords.map((r) => r.knowledgePointId);
    }

    // Query knowledge points
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: {
        importanceLevel: targetLevel,
        ...(excludeMastered && masteredIds.length > 0
          ? { id: { notIn: masteredIds } }
          : {}),
      },
      select: {
        id: true,
        code: true,
        level1: true,
        level2: true,
        level3: true,
        importanceLevel: true,
        definition: true,
      },
      orderBy: { code: 'asc' },
    });

    // Batch fetch recent records for all candidates
    const candidateIds = knowledgePoints.map((kp) => kp.id);
    const recentRecords = await this.getRecentRecordsForCandidates(userId, candidateIds);

    // Group by knowledgePointId
    const recordsByKp = new Map<string, typeof recentRecords>();
    for (const r of recentRecords) {
      const list = recordsByKp.get(r.knowledgePointId) ?? [];
      list.push(r);
      recordsByKp.set(r.knowledgePointId, list);
    }

    // Score and build items
    const scoredItems: Array<{
      item: ByImportanceItem;
      finalScore: number;
      startTime: Date;
      code: string;
    }> = [];

    for (const kp of knowledgePoints) {
      const kpRecords = recordsByKp.get(kp.id) ?? [];
      const latestRecord = kpRecords[0] ?? null;
      const isMastered = latestRecord?.masteryLevel === MasteryLevel.A;

      // Skip mastered if excludeMastered
      if (excludeMastered && isMastered) continue;

      const components = {
        baseScore: latestRecord ? calculateBaseScore(latestRecord.masteryLevel) : 10,
        decayBonus: latestRecord ? calculateDecayBonus(latestRecord.startTime, config) : 0,
        recentStudyPenalty: calculateRecentStudyPenalty(kpRecords, config),
        importanceWeight: calculateImportanceWeight(kp.importanceLevel, config),
        improvementVelocity: calculateImprovementVelocity(kpRecords, config),
      };

      const finalScore = calculateFinalScore(components);
      const reason = generateRecommendationReason(components);

      scoredItems.push({
        item: {
          ...kp,
          isMastered,
          learningRecord: latestRecord
            ? {
                id: latestRecord.id,
                masteryLevel: latestRecord.masteryLevel,
                durationMinutes: latestRecord.durationMinutes,
                startTime: latestRecord.startTime,
                notes: latestRecord.notes,
              }
            : null,
          recommendationReason: reason,
        },
        finalScore,
        startTime: latestRecord?.startTime ?? new Date(0),
        code: kp.code,
      });
    }

    // Sort: unmastered first (by score), then mastered
    scoredItems.sort((a, b) => {
      const aMastered = a.item.isMastered ? 1 : 0;
      const bMastered = b.item.isMastered ? 1 : 0;
      if (aMastered !== bMastered) return aMastered - bMastered;
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    const total = scoredItems.length;
    const limitedItems = scoredItems.slice(0, limit);

    return {
      level: targetLevel,
      total,
      items: limitedItems.map((s) => s.item),
    };
  }

  /**
   * 获取随机知识点
   */
  async getRandomPoints(
    userId: string,
    query: RandomQuery,
  ): Promise<{ items: RandomItem[] }> {
    const { textbookId, count = 10 } = query;

    this.logger.log(
      `Getting random points for user: ${userId}, count: ${count}`,
    );

    // 使用 $queryRaw 实现随机排序
    let knowledgePoints: Array<{
      id: string;
      code: string;
      level1: string;
      level2: string | null;
      level3: string | null;
      importance_level: ImportanceLevel;
      definition: string | null;
    }>;

    if (textbookId) {
      knowledgePoints = await this.prisma.$queryRaw`
        SELECT id, code, level1, level2, level3, importance_level, definition
        FROM knowledge_points
        WHERE textbook_id = ${textbookId}
        ORDER BY RANDOM()
        LIMIT ${count}
      `;
    } else {
      knowledgePoints = await this.prisma.$queryRaw`
        SELECT id, code, level1, level2, level3, importance_level, definition
        FROM knowledge_points
        ORDER BY RANDOM()
        LIMIT ${count}
      `;
    }

    const items: RandomItem[] = knowledgePoints.map((point) => ({
      id: point.id,
      code: point.code,
      level1: point.level1,
      level2: point.level2,
      level3: point.level3,
      importanceLevel: point.importance_level,
      definition: point.definition,
    }));

    return { items };
  }

  /**
   * 获取学习统计信息
   */
  async getLearningStats(userId: string): Promise<{
    weakPointCount: number;
    importanceStats: { A: number; B: number; C: number };
  }> {
    // 薄弱点数量
    const weakPointCount = await this.prisma.learningRecord.count({
      where: {
        userId,
        masteryLevel: {
          in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E],
        },
      },
    });

    // 各级别知识点数量
    const [aCount, bCount, cCount] = await Promise.all([
      this.prisma.knowledgePoint.count({
        where: { importanceLevel: ImportanceLevel.A },
      }),
      this.prisma.knowledgePoint.count({
        where: { importanceLevel: ImportanceLevel.B },
      }),
      this.prisma.knowledgePoint.count({
        where: { importanceLevel: ImportanceLevel.C },
      }),
    ]);

    return {
      weakPointCount,
      importanceStats: { A: aCount, B: bCount, C: cCount },
    };
  }

}
