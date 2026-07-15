import { IsOptional, IsString, IsEnum, Length } from 'class-validator';
import { ImportanceLevel } from '@prisma/client';

export class UpdateKnowledgePointDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  definition?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  characteristics?: string;

  @IsOptional()
  @IsEnum(ImportanceLevel)
  importanceLevel?: ImportanceLevel;
}
