import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取薄弱知识点列表
   * 筛选掌握程度为 C/D/E 的知识点，按优先级排序
   */
  async getWeakPoints(
    userId: string,
    query: WeakPointsQuery,
  ): Promise<{ total: number; items: WeakPointItem[] }> {
    const { textbookId, limit = 20 } = query;

    this.logger.log(`Getting weak points for user: ${userId}`);

    // 查询学习记录，按掌握程度和最后学习时间排序
    const records = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        masteryLevel: {
          in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E],
        },
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
      orderBy: [
        { masteryLevel: 'desc' }, // E > D > C
        { startTime: 'asc' }, // 较早学习的优先复习
      ],
      take: limit,
    });

    // 计算优先级分数并转换数据
    const items: WeakPointItem[] = records.map((record) => ({
      knowledgePoint: record.knowledgePoint,
      learningRecord: {
        id: record.id,
        masteryLevel: record.masteryLevel,
        durationMinutes: record.durationMinutes,
        startTime: record.startTime,
        notes: record.notes,
      },
      priority: this.calculatePriority(record.masteryLevel, record.startTime),
    }));

    // 获取总数
    const total = await this.prisma.learningRecord.count({
      where: {
        userId,
        masteryLevel: {
          in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E],
        },
        ...(textbookId ? { knowledgePoint: { textbookId } } : {}),
      },
    });

    return { total, items };
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

    this.logger.log(
      `Getting points by importance for user: ${userId}, level: ${level}`,
    );

    // 如果指定了级别，只查询该级别；否则默认查询 A 级
    const targetLevel = level || ImportanceLevel.A;

    // 获取用户已掌握的知识点ID
    let masteredIds: string[] = [];
    if (excludeMastered) {
      const masteredRecords = await this.prisma.learningRecord.findMany({
        where: {
          userId,
          masteryLevel: MasteryLevel.A,
        },
        select: {
          knowledgePointId: true,
        },
      });
      masteredIds = masteredRecords.map((r) => r.knowledgePointId);
    }

    // 查询知识点
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
      orderBy: {
        code: 'asc',
      },
      take: limit,
    });

    // 检查每个知识点是否已掌握
    const items: ByImportanceItem[] = await Promise.all(
      knowledgePoints.map(async (point) => {
        const record = await this.prisma.learningRecord.findFirst({
          where: {
            userId,
            knowledgePointId: point.id,
            masteryLevel: MasteryLevel.A,
          },
        });
        return {
          ...point,
          isMastered: !!record,
        };
      }),
    );

    const total = await this.prisma.knowledgePoint.count({
      where: {
        importanceLevel: targetLevel,
        ...(excludeMastered && masteredIds.length > 0
          ? { id: { notIn: masteredIds } }
          : {}),
      },
    });

    return { level: targetLevel, total, items };
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
    const knowledgePoints = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        level1: string;
        level2: string | null;
        level3: string | null;
        importance_level: ImportanceLevel;
        definition: string | null;
      }>
    >`
      SELECT id, code, level1, level2, level3, importance_level, definition
      FROM knowledge_points
      ${textbookId ? this.prisma.$queryRaw`WHERE textbook_id = ${textbookId}` : this.prisma.$queryRaw``}
      ORDER BY RANDOM()
      LIMIT ${count}
    `;

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

  /**
   * 计算优先级分数
   * E级 = 100, D级 = 70, C级 = 40
   * 加上时间衰减因子（越久未复习分数越高）
   */
  private calculatePriority(
    masteryLevel: MasteryLevel,
    lastStudiedAt: Date,
  ): number {
    const baseScore =
      {
        [MasteryLevel.A]: 0,
        [MasteryLevel.B]: 10,
        [MasteryLevel.C]: 40,
        [MasteryLevel.D]: 70,
        [MasteryLevel.E]: 100,
      }[masteryLevel] || 0;

    // 计算距离今天的天数
    const daysSince = Math.floor(
      (Date.now() - lastStudiedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 时间衰减加成（每天+2分，最多+30分）
    const timeBonus = Math.min(daysSince * 2, 30);

    return baseScore + timeBonus;
  }
}
