import { ApiProperty } from '@nestjs/swagger';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

class KnowledgePointDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  level1: string;

  @ApiProperty({ nullable: true })
  level2: string | null;

  @ApiProperty({ nullable: true })
  level3: string | null;

  @ApiProperty({ enum: ImportanceLevel })
  importanceLevel: ImportanceLevel;

  @ApiProperty({ nullable: true })
  definition: string | null;
}

class LearningRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MasteryLevel })
  masteryLevel: MasteryLevel;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ nullable: true })
  notes: string | null;
}

export class WeakPointResponseDto {
  @ApiProperty({ type: KnowledgePointDto })
  knowledgePoint: KnowledgePointDto;

  @ApiProperty({ type: LearningRecordDto })
  learningRecord: LearningRecordDto;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  recommendationReason: string;
}

export class WeakPointsResponse {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [WeakPointResponseDto] })
  items: WeakPointResponseDto[];
}

export class ByImportanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  level1: string;

  @ApiProperty({ nullable: true })
  level2: string | null;

  @ApiProperty({ nullable: true })
  level3: string | null;

  @ApiProperty({ enum: ImportanceLevel })
  importanceLevel: ImportanceLevel;

  @ApiProperty({ nullable: true })
  definition: string | null;

  @ApiProperty()
  isMastered: boolean;

  @ApiProperty({ type: LearningRecordDto, nullable: true })
  learningRecord: LearningRecordDto | null;

  @ApiProperty()
  recommendationReason: string;
}

export class ByImportanceResponse {
  @ApiProperty({ enum: ImportanceLevel })
  level: ImportanceLevel;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: [ByImportanceResponseDto] })
  items: ByImportanceResponseDto[];
}
