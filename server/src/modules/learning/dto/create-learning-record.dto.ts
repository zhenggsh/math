import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MasteryLevel } from '@prisma/client';

/**
 * 创建学习记录请求DTO
 */
export class CreateLearningRecordDto {
  @ApiProperty({
    description: '知识点ID',
    example: 'kp-123',
  })
  @IsString()
  knowledgePointId: string;

  @ApiProperty({
    description: '掌握程度 (A=优秀, B=良好, C=一般, D=较差, E=很差)',
    enum: MasteryLevel,
    example: 'B',
  })
  @IsEnum(MasteryLevel, {
    message: 'masteryLevel must be one of A, B, C, D, E',
  })
  masteryLevel: MasteryLevel;

  @ApiProperty({
    description: '学习时长（分钟）',
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes: number;

  @ApiPropertyOptional({
    description: '学习开始时间（可选，默认为当前时间）',
    example: '2024-03-20T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @ApiPropertyOptional({
    description: '学习备注（可选，最大长度500字符）',
    example: '今天学习了集合的基本概念，理解了并集和交集',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
