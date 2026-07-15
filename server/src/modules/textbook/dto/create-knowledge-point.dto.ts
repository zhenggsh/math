import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  Length,
} from 'class-validator';
import { ImportanceLevel } from '@prisma/client';

export class CreateKnowledgePointDto {
  @IsNotEmpty()
  @IsString()
  parentId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  code: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  definition?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  characteristics?: string;

  @IsNotEmpty()
  @IsEnum(ImportanceLevel)
  importanceLevel: ImportanceLevel;
}
