import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLearningRecordDto } from './dto/create-learning-record.dto';
import { QueryLearningRecordsDto } from './dto/query-learning-records.dto';
import { LearningRecordResponseDto } from './dto/learning-record-response.dto';

/**
 * 学习记录服务
 * 处理学习记录的创建和查询业务逻辑
 */
@Injectable()
export class LearningRecordService {
  private readonly logger = new Logger(LearningRecordService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建学习记录
   * @param userId 用户ID
   * @param dto 创建学习记录DTO
   * @returns 创建的学习记录
   */
  async create(
    userId: string,
    dto: CreateLearningRecordDto,
  ): Promise<LearningRecordResponseDto> {
    this.logger.log(
      `Creating learning record for user: ${userId}, knowledgePoint: ${dto.knowledgePointId}`,
    );

    // 验证知识点是否存在
    const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
      where: { id: dto.knowledgePointId },
    });

    if (!knowledgePoint) {
      throw new NotFoundException(
        `Knowledge point with ID ${dto.knowledgePointId} not found`,
      );
    }

    // 创建学习记录
    const record = await this.prisma.learningRecord.create({
      data: {
        userId,
        knowledgePointId: dto.knowledgePointId,
        startTime: dto.startTime || new Date(),
        durationMinutes: dto.durationMinutes,
        masteryLevel: dto.masteryLevel,
        notes: dto.notes,
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
          },
        },
      },
    });

    this.logger.log(`Learning record created: ${record.id}`);
    return this.mapToResponseDto(record);
  }

  /**
   * 查询用户的学习记录列表
   * @param userId 用户ID
   * @param query 查询参数
   * @returns 分页的学习记录列表
   */
  async findAll(
    userId: string,
    query: QueryLearningRecordsDto,
  ): Promise<{
    items: LearningRecordResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { knowledgePointId, page = 1, limit = 20 } = query;

    this.logger.log(
      `Finding learning records for user: ${userId}, page: ${page}, limit: ${limit}`,
    );

    const where = {
      userId,
      ...(knowledgePointId && { knowledgePointId }),
    };

    const [records, total] = await Promise.all([
      this.prisma.learningRecord.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningRecord.count({ where }),
    ]);

    return {
      items: records.map((record) => this.mapToResponseDto(record)),
      total,
      page,
      limit,
    };
  }

  /**
   * 查询特定知识点的学习记录
   * @param userId 用户ID
   * @param knowledgePointId 知识点ID
   * @returns 该知识点的学习记录列表
   */
  async findByKnowledgePoint(
    userId: string,
    knowledgePointId: string,
  ): Promise<LearningRecordResponseDto[]> {
    this.logger.log(
      `Finding learning records for user: ${userId}, knowledgePoint: ${knowledgePointId}`,
    );

    // 验证知识点是否存在
    const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
      where: { id: knowledgePointId },
    });

    if (!knowledgePoint) {
      throw new NotFoundException(
        `Knowledge point with ID ${knowledgePointId} not found`,
      );
    }

    const records = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        knowledgePointId,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.mapToResponseDto(record));
  }

  /**
   * 将 Prisma 学习记录映射为响应DTO
   */
  private mapToResponseDto(record: unknown): LearningRecordResponseDto {
    const r = record as {
      id: string;
      userId: string;
      knowledgePointId: string;
      startTime: Date;
      durationMinutes: number;
      masteryLevel: MasteryLevel;
      notes: string | null;
      createdAt: Date;
      knowledgePoint: {
        id: string;
        code: string;
        level1: string;
        level2: string | null;
        level3: string | null;
        importanceLevel: ImportanceLevel;
      };
    };

    return {
      id: r.id,
      userId: r.userId,
      knowledgePointId: r.knowledgePointId,
      startTime: r.startTime,
      durationMinutes: r.durationMinutes,
      masteryLevel: r.masteryLevel,
      notes: r.notes,
      createdAt: r.createdAt,
      knowledgePoint: r.knowledgePoint,
    };
  }
}
