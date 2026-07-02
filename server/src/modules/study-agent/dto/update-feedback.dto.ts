import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateFeedbackDto {
  @ApiPropertyOptional({
    description: '反馈类型',
    enum: ['positive', 'negative'],
    example: 'positive',
  })
  @IsOptional()
  @IsIn(['positive', 'negative'])
  feedback?: 'positive' | 'negative';
}
