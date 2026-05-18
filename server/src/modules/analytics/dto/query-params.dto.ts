import { IsOptional, IsInt, IsString, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 学习趋势查询参数
 */
export class LearningTrendQueryDto {
  @ApiPropertyOptional({
    description: '查询天数（默认30天）',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

/**
 * 薄弱知识点查询参数
 */
export class WeakPointsQueryDto {
  @ApiPropertyOptional({
    description: '返回数量限制（默认10）',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

/**
 * 班级概览查询参数
 */
export class ClassOverviewQueryDto {
  @ApiPropertyOptional({
    description: '班级ID（可选，不传则统计全部）',
    example: 'class-001',
  })
  @IsOptional()
  @IsString()
  classId?: string;
}

/**
 * 知识点热度查询参数
 */
export class KnowledgeHeatQueryDto {
  @ApiPropertyOptional({
    description: '返回数量限制（默认20）',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * 知识点掌握进度查询参数
 */
export class KnowledgePointProgressQueryDto {
  @ApiProperty({ description: '知识点ID', example: 'kp-123' })
  @IsString()
  @IsNotEmpty()
  knowledgePointId: string;

  @ApiPropertyOptional({ description: '开始日期（可选）', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（可选）', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

/**
 * 学生对比查询参数
 */
export class StudentComparisonQueryDto {
  @ApiPropertyOptional({
    description: '学生ID列表（逗号分隔）',
    example: 'user-1,user-2,user-3',
  })
  @IsOptional()
  @IsString()
  studentIds?: string;
}
