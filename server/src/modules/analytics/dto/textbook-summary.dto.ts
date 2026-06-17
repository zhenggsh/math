import { ApiProperty } from '@nestjs/swagger';

export class MasteryDistributionSummaryItemDto {
  @ApiProperty({ enum: ['A', 'B', 'C', 'D', 'E'] })
  level: 'A' | 'B' | 'C' | 'D' | 'E';

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class ImportanceDistributionSummaryItemDto {
  @ApiProperty({ enum: ['A', 'B', 'C'] })
  level: 'A' | 'B' | 'C';

  @ApiProperty()
  count: number;
}

export class TextbookSummaryResponseDto {
  @ApiProperty()
  textbookId: string;

  @ApiProperty()
  textbookName: string;

  @ApiProperty()
  totalKnowledgePoints: number;

  @ApiProperty()
  learnedKnowledgePoints: number;

  @ApiProperty()
  unlearnedKnowledgePoints: number;

  @ApiProperty({ type: [MasteryDistributionSummaryItemDto] })
  masteryDistribution: MasteryDistributionSummaryItemDto[];

  @ApiProperty({ type: [ImportanceDistributionSummaryItemDto] })
  importanceDistribution: ImportanceDistributionSummaryItemDto[];
}
