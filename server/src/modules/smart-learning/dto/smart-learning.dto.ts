import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ImportanceLevel } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WeakPointsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by textbook ID' })
  @IsOptional()
  @IsString()
  textbookId?: string;

  @ApiPropertyOptional({ description: 'Limit number of results', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ByImportanceQueryDto {
  @ApiPropertyOptional({
    description: 'Importance level filter',
    enum: ImportanceLevel,
  })
  @IsOptional()
  @IsEnum(ImportanceLevel)
  level?: ImportanceLevel;

  @ApiPropertyOptional({
    description: 'Exclude mastered points',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  excludeMastered?: boolean = true;

  @ApiPropertyOptional({ description: 'Limit number of results', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class RandomQueryDto {
  @ApiPropertyOptional({ description: 'Filter by textbook ID' })
  @IsOptional()
  @IsString()
  textbookId?: string;

  @ApiPropertyOptional({ description: 'Number of random points', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number = 10;
}
