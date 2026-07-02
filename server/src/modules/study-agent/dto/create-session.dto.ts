import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: '知识点ID',
    example: 'kp-123',
  })
  @IsString()
  knowledgePointId: string;

  @ApiProperty({
    description: '知识点标题',
    example: '三角函数的基本概念',
  })
  @IsString()
  knowledgePointTitle: string;
}
