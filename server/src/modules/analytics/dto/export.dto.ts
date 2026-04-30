import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 数据导出请求 DTO
 */
export class ExportDataDto {
  @ApiPropertyOptional({
    description: '班级ID',
    example: 'class-001',
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({
    description: '开始日期',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '导出格式',
    enum: ['xlsx', 'csv'],
    default: 'xlsx',
  })
  @IsOptional()
  @IsEnum(['xlsx', 'csv'] as const)
  format: 'xlsx' | 'csv' = 'xlsx';
}
