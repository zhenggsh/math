import { ApiProperty } from '@nestjs/swagger';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

/**
 * 关联的知识点信息DTO
 */
export class KnowledgePointInfoDto {
  @ApiProperty({ description: '知识点ID' })
  id: string;

  @ApiProperty({ description: '知识点编号', example: '1.1.1' })
  code: string;

  @ApiProperty({ description: '一级知识点', example: '集合与常用逻辑用语' })
  level1: string;

  @ApiProperty({
    description: '二级知识点',
    example: '集合的概念与表示',
    nullable: true,
  })
  level2: string | null;

  @ApiProperty({ description: '三级知识点', example: '集合的含义', nullable: true })
  level3: string | null;

  @ApiProperty({ description: '重要性级别', enum: ImportanceLevel })
  importanceLevel: ImportanceLevel;
}

/**
 * 学习记录响应DTO
 */
export class LearningRecordResponseDto {
  @ApiProperty({ description: '学习记录ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '知识点ID' })
  knowledgePointId: string;

  @ApiProperty({ description: '学习开始时间' })
  startTime: Date;

  @ApiProperty({ description: '学习时长（分钟）' })
  durationMinutes: number;

  @ApiProperty({ description: '掌握程度', enum: MasteryLevel })
  masteryLevel: MasteryLevel;

  @ApiProperty({ description: '学习备注', nullable: true })
  notes: string | null;

  @ApiProperty({ description: '记录创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '关联的知识点信息', type: KnowledgePointInfoDto })
  knowledgePoint: KnowledgePointInfoDto;
}

/**
 * 分页学习记录响应DTO
 */
export class PaginatedLearningRecordsResponseDto {
  @ApiProperty({ description: '学习记录列表', type: [LearningRecordResponseDto] })
  items: LearningRecordResponseDto[];

  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}
