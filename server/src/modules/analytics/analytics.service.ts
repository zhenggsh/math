import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MasteryLevel, Role } from '@prisma/client';
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
} from './interfaces/stats.interfaces';

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
  async getStudentOverview(userId: string): Promise<StudentOverviewDto> {
    this.logger.log(`Getting student overview for user: ${userId}`);

    const [totalResult, uniqueKpResult] = await Promise.all([
      this.prisma.learningRecord.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { durationMinutes: true },
      }),
      this.prisma.learningRecord.groupBy({
        by: ['knowledgePointId'],
        where: { userId },
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
  ): Promise<MasteryDistributionDto> {
    this.logger.log(`Getting mastery distribution for user: ${userId}`);

    const distribution = await this.prisma.learningRecord.groupBy({
      by: ['masteryLevel'],
      where: { userId },
      _count: { id: true },
    });

    const total = distribution.reduce((sum, d) => sum + d._count.id, 0);

    const levels: MasteryLevel[] = ['A', 'B', 'C', 'D', 'E'];

    return {
      distribution: levels.map((level) => {
        const item = distribution.find((d) => d.masteryLevel === level);
        const count = item?._count.id || 0;
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
  ): Promise<LearningTrendDto> {
    this.logger.log(
      `Getting learning trend for user: ${userId}, days: ${days}`,
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        durationMinutes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按日期分组聚合
    const trendMap = new Map<
      string,
      { durationMinutes: number; count: number }
    >();

    for (const record of records) {
      const date = record.createdAt.toISOString().split('T')[0];
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
  async getWeakPoints(userId: string, limit: number): Promise<WeakPointsDto> {
    this.logger.log(`Getting weak points for user: ${userId}, limit: ${limit}`);

    // 获取用户最新的每个知识点的学习记录
    const latestRecords = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        masteryLevel: { in: [MasteryLevel.D, MasteryLevel.E] },
      },
      distinct: ['knowledgePointId'],
      orderBy: { createdAt: 'desc' },
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
      name: [
        record.knowledgePoint.level1,
        record.knowledgePoint.level2,
        record.knowledgePoint.level3,
      ]
        .filter(Boolean)
        .join(' > '),
      importanceLevel: record.knowledgePoint.importanceLevel,
      lastMasteryLevel: record.masteryLevel as 'D' | 'E',
      lastLearningDate: record.createdAt.toISOString(),
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
  async getLearnedKnowledgePoints(userId: string): Promise<LearnedKnowledgePointsDto> {
    this.logger.log(`Getting learned knowledge points for user: ${userId}`);

    // 获取用户每个知识点的最新学习记录
    const latestRecords = await this.prisma.learningRecord.findMany({
      where: { userId },
      distinct: ['knowledgePointId'],
      orderBy: { createdAt: 'desc' },
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
    });

    const learnedPoints = latestRecords.map((record) => ({
      knowledgePointId: record.knowledgePoint.id,
      code: record.knowledgePoint.code,
      name: [record.knowledgePoint.level1, record.knowledgePoint.level2, record.knowledgePoint.level3]
        .filter(Boolean)
        .join(' > '),
      lastMasteryLevel: record.masteryLevel as 'A' | 'B' | 'C' | 'D' | 'E',
      lastLearningDate: record.createdAt.toISOString(),
    }));

    // 按掌握度从低到高排序 (E > D > C > B > A)
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
