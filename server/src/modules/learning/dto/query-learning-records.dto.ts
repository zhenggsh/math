import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 查询学习记录请求DTO
 */
export class QueryLearningRecordsDto {
  @ApiPropertyOptional({
    description: '知识点ID（可选，用于筛选特定知识点的记录）',
    example: 'kp-123',
  })
  @IsOptional()
  @IsString()
  knowledgePointId?: string;

  @ApiPropertyOptional({
    description: '页码（可选，默认为1）',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量（可选，默认为20，最大100）',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
