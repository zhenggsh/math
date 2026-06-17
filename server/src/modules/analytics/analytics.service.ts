import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, Role, Prisma } from '@prisma/client';
import { formatKnowledgePointName } from './analytics.utils';
import type {
  StudentOverviewDto,
  MasteryDistributionDto,
  LearningTrendDto,
  WeakPointsDto,
  ClassOverviewDto,
  KnowledgeHeatDto,
  StudentComparisonDto,
  KnowledgePointProgressDto,
  LearnedKnowledgePointsDto,
  LearnedKnowledgePointDto,
} from './interfaces/stats.interfaces';

interface RawLastTwoRecord {
  knowledge_point_id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  mastery_level: string;
  start_time: Date;
  rn: bigint;
}

/**
 * 数据分析服务
 * 实现学习数据的统计聚合逻辑
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取学生学习概览
   */
  async getStudentOverview(
    userId: string,
    textbookId?: string,
  ): Promise<StudentOverviewDto> {
    this.logger.log(
      `Getting student overview for user: ${userId}, textbook: ${textbookId || 'all'}`,
    );

    const recordWhere: Prisma.LearningRecordWhereInput = { userId };
    if (textbookId) {
      recordWhere.knowledgePoint = { textbookId };
    }

    const [totalResult, uniqueKpResult] = await Promise.all([
      this.prisma.learningRecord.aggregate({
        where: recordWhere,
        _count: { id: true },
        _sum: { durationMinutes: true },
      }),
      this.prisma.learningRecord.groupBy({
        by: ['knowledgePointId'],
        where: recordWhere,
        _count: { knowledgePointId: true },
      }),
    ]);

    return {
      totalLearningCount: totalResult._count.id || 0,
      totalDurationMinutes: totalResult._sum.durationMinutes || 0,
      uniqueKnowledgePoints: uniqueKpResult.length,
    };
  }

  /**
   * 获取掌握程度分布
   */
  async getMasteryDistribution(
    userId: string,
    textbookId?: string,
  ): Promise<MasteryDistributionDto> {
    this.logger.log(
      `Getting mastery distribution for user: ${userId}, textbook: ${textbookId || 'all'}`,
    );

    const where: Prisma.LearningRecordWhereInput = { userId };
    if (textbookId) {
      where.knowledgePoint = { textbookId };
    }

    const latestRecords = await this.prisma.learningRecord.findMany({
      where,
      distinct: ['knowledgePointId'],
      orderBy: { startTime: 'desc' },
      select: { masteryLevel: true },
    });

    const levelCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const record of latestRecords) {
      levelCounts[record.masteryLevel]++;
    }

    const total = latestRecords.length;
    const levels: MasteryLevel[] = ['A', 'B', 'C', 'D', 'E'];

    return {
      distribution: levels.map((level) => {
        const count = levelCounts[level] || 0;
        return {
          level,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        };
      }),
    };
  }

  /**
   * 获取学习趋势
   */
  async getLearningTrend(
    userId: string,
    days: number,
    textbookId?: string,
  ): Promise<LearningTrendDto> {
    this.logger.log(
      `Getting learning trend for user: ${userId}, days: ${days}, textbook: ${textbookId || 'all'}`,
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const where: Prisma.LearningRecordWhereInput = {
      userId,
      startTime: { gte: startDate },
    };
    if (textbookId) {
      where.knowledgePoint = { textbookId };
    }

    const records = await this.prisma.learningRecord.findMany({
      where,
      select: {
        durationMinutes: true,
        startTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // 按日期分组聚合
    const trendMap = new Map<
      string,
      { durationMinutes: number; count: number }
    >();

    for (const record of records) {
      const date = record.startTime.toISOString().split('T')[0];
      const current = trendMap.get(date) || { durationMinutes: 0, count: 0 };
      trendMap.set(date, {
        durationMinutes: current.durationMinutes + record.durationMinutes,
        count: current.count + 1,
      });
    }

    // 填充没有数据的日期
    const trend: LearningTrendDto['trend'] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const data = trendMap.get(dateStr) || { durationMinutes: 0, count: 0 };
      trend.push({ date: dateStr, ...data });
    }

    return { trend };
  }

  /**
   * 获取薄弱知识点
   */
  async getWeakPoints(
    userId: string,
    limit: number,
    textbookId?: string,
  ): Promise<WeakPointsDto> {
    this.logger.log(
      `Getting weak points for user: ${userId}, limit: ${limit}, textbook: ${textbookId || 'all'}`,
    );

    const where: Prisma.LearningRecordWhereInput = {
      userId,
      masteryLevel: { in: [MasteryLevel.D, MasteryLevel.E] },
    };
    if (textbookId) {
      where.knowledgePoint = { textbookId };
    }

    const latestRecords = await this.prisma.learningRecord.findMany({
      where,
      distinct: ['knowledgePointId'],
      orderBy: { startTime: 'desc' },
      take: limit,
      include: {
        knowledgePoint: {
          select: {
            id: true,
            code: true,
            level1: true,
            level2: true,
            level3: true,
            importanceLevel: true,
          },
        },
      },
    });

    const weakPoints = latestRecords.map((record) => ({
      knowledgePointId: record.knowledgePoint.id,
      code: record.knowledgePoint.code,
      name: formatKnowledgePointName(
        record.knowledgePoint.level1,
        record.knowledgePoint.level2,
        record.knowledgePoint.level3,
      ),
      importanceLevel: record.knowledgePoint.importanceLevel,
      lastMasteryLevel: record.masteryLevel as 'D' | 'E',
      lastLearningDate: record.startTime.toISOString(),
    }));

    // 按重要性级别排序 (A > B > C)
    const importanceOrder = { A: 0, B: 1, C: 2 };
    weakPoints.sort(
      (a, b) =>
        importanceOrder[a.importanceLevel] - importanceOrder[b.importanceLevel],
    );

    return { weakPoints };
  }

  /**
   * 获取已学知识点列表（包含所有掌握度级别）
   */
  async getLearnedKnowledgePoints(
    userId: string,
    textbookId?: string,
  ): Promise<LearnedKnowledgePointsDto> {
    this.logger.log(`Getting learned knowledge points for user: ${userId}, textbook: ${textbookId || 'all'}`);

    const textbookFilter = textbookId ? 'AND kp."textbook_id" = $2' : '';
    const params: (string | number)[] = [userId];
    if (textbookId) params.push(textbookId);

    const query = `
      WITH ranked AS (
        SELECT
          lr."knowledge_point_id",
          kp.code,
          kp.level1,
          kp.level2,
          kp.level3,
          lr.mastery_level,
          lr.start_time,
          ROW_NUMBER() OVER (
            PARTITION BY lr."knowledge_point_id"
            ORDER BY lr.start_time DESC
          ) AS rn
        FROM learning_records lr
        JOIN knowledge_points kp ON kp.id = lr."knowledge_point_id"
        WHERE lr.user_id = $1
          ${textbookFilter}
      )
      SELECT *
      FROM ranked
      WHERE rn <= 2
      ORDER BY "knowledge_point_id", rn ASC
    `;

    const rawRows = await this.prisma.$queryRawUnsafe<RawLastTwoRecord[]>(query, ...params);

    const grouped = new Map<string, RawLastTwoRecord[]>();
    for (const row of rawRows) {
      const list = grouped.get(row.knowledge_point_id) || [];
      list.push(row);
      grouped.set(row.knowledge_point_id, list);
    }

    const learnedPoints: LearnedKnowledgePointDto[] = [];
    for (const [, records] of grouped) {
      if (records.length === 0) continue;
      const latest = records[records.length - 1];
      const previous = records.length > 1 ? records[records.length - 2] : latest;
      learnedPoints.push({
        knowledgePointId: latest.knowledge_point_id,
        code: latest.code,
        name: formatKnowledgePointName(latest.level1, latest.level2, latest.level3),
        lastMasteryLevel: latest.mastery_level as 'A' | 'B' | 'C' | 'D' | 'E',
        lastLearningDate: latest.start_time.toISOString(),
        lastTwoMasteryLevels: [previous.mastery_level, latest.mastery_level],
      });
    }

    const levelOrder = { E: 0, D: 1, C: 2, B: 3, A: 4 };
    learnedPoints.sort(
      (a, b) => levelOrder[a.lastMasteryLevel] - levelOrder[b.lastMasteryLevel],
    );

    return { learnedKnowledgePoints: learnedPoints };
  }

  /**
   * 获取知识点掌握进度
   */
  async getKnowledgePointProgress(
    userId: string,
    knowledgePointId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<KnowledgePointProgressDto> {
    this.logger.log(
      `Getting knowledge point progress for user: ${userId}, knowledgePoint: ${knowledgePointId}`,
    );

    const where: Record<string, unknown> = {
      userId,
      knowledgePointId,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startTime as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const records = await this.prisma.learningRecord.findMany({
      where,
      include: {
        knowledgePoint: {
          select: {
            id: true,
            code: true,
            level1: true,
            level2: true,
            level3: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (records.length === 0) {
      return {
        knowledgePointId,
        code: '',
        title: '',
        level1: '',
        level2: undefined,
        level3: undefined,
        progressRecords: [],
      };
    }

    const knowledgePoint = records[0].knowledgePoint;

    return {
      knowledgePointId: knowledgePoint.id,
      code: knowledgePoint.code,
      title: [
        knowledgePoint.level1,
        knowledgePoint.level2,
        knowledgePoint.level3,
      ]
        .filter(Boolean)
        .join(' > '),
      level1: knowledgePoint.level1,
      level2: knowledgePoint.level2 ?? undefined,
      level3: knowledgePoint.level3 ?? undefined,
      progressRecords: records.map((record) => ({
        date: record.startTime.toISOString().split('T')[0],
        masteryLevel: record.masteryLevel,
        durationMinutes: record.durationMinutes,
        notes: record.notes ?? undefined,
      })),
    };
  }

  /**
   * 获取班级概览（教师）
   */
  async getClassOverview(classId?: string): Promise<ClassOverviewDto> {
    this.logger.log(`Getting class overview for class: ${classId || 'all'}`);

    // 简化实现：统计所有活跃学生
    const [studentStats, learningStats] = await Promise.all([
      this.prisma.user.count({
        where: { role: Role.STUDENT },
      }),
      this.prisma.learningRecord.aggregate({
        _count: { id: true },
        _sum: { durationMinutes: true },
      }),
    ]);

    const activeStudents = await this.prisma.learningRecord.groupBy({
      by: ['userId'],
      _count: { userId: true },
    });

    const totalStudents = studentStats || 1; // 避免除以0
    const activeStudentCount = activeStudents.length;

    return {
      studentCount: totalStudents,
      activeStudentCount,
      avgLearningCount: Math.round(
        (learningStats._count.id || 0) / totalStudents,
      ),
      avgDurationMinutes: Math.round(
        (learningStats._sum.durationMinutes || 0) / totalStudents,
      ),
    };
  }

  /**
   * 获取知识点热度（教师）
   */
  async getKnowledgeHeat(limit: number): Promise<KnowledgeHeatDto> {
    this.logger.log(`Getting knowledge heat, limit: ${limit}`);

    const heatList = await this.prisma.learningRecord.groupBy({
      by: ['knowledgePointId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const knowledgePointIds = heatList.map((h) => h.knowledgePointId);

    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: { id: { in: knowledgePointIds } },
      select: {
        id: true,
        code: true,
        level1: true,
        level2: true,
        level3: true,
      },
    });

    const kpMap = new Map(knowledgePoints.map((kp) => [kp.id, kp]));

    // 统计每个知识点的独立学生数
    const uniqueStudentCounts = await Promise.all(
      knowledgePointIds.map(async (kpId) => {
        const students = await this.prisma.learningRecord.groupBy({
          by: ['userId'],
          where: { knowledgePointId: kpId },
        });
        return { kpId, count: students.length };
      }),
    );

    const studentCountMap = new Map(
      uniqueStudentCounts.map((s) => [s.kpId, s.count]),
    );

    return {
      heatList: heatList.map((item) => {
        const kp = kpMap.get(item.knowledgePointId);
        return {
          knowledgePointId: item.knowledgePointId,
          code: kp?.code || '',
          name: [kp?.level1, kp?.level2, kp?.level3]
            .filter(Boolean)
            .join(' > '),
          learnCount: item._count.id,
          uniqueStudentCount: studentCountMap.get(item.knowledgePointId) || 0,
        };
      }),
    };
  }

  /**
   * 获取学生列表（教师）
   */
  async getStudents(): Promise<Array<{ id: string; name: string }>> {
    this.logger.log('Getting student list');

    const students = await this.prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return students;
  }

  /**
   * 获取学生对比（教师）
   */
  async getStudentComparison(
    studentIds: string[],
  ): Promise<StudentComparisonDto> {
    this.logger.log(`Getting student comparison for: ${studentIds.join(', ')}`);

    const students = await Promise.all(
      studentIds.map(async (id) => {
        const [user, records] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true },
          }),
          this.prisma.learningRecord.findMany({
            where: { userId: id },
            select: {
              durationMinutes: true,
              masteryLevel: true,
            },
          }),
        ]);

        if (!user) return null;

        const totalDuration = records.reduce(
          (sum, r) => sum + r.durationMinutes,
          0,
        );
        const masteryStats: Record<string, number> = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
          E: 0,
        };
        records.forEach((r) => {
          masteryStats[r.masteryLevel] =
            (masteryStats[r.masteryLevel] || 0) + 1;
        });

        return {
          id: user.id,
          name: user.name,
          totalDuration,
          masteryStats,
        };
      }),
    );

    return {
      students: students.filter(Boolean) as StudentComparisonDto['students'],
    };
  }
}
