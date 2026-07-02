import { ApiProperty } from '@nestjs/swagger';

export class StudyMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty({
    enum: ['user', 'agent'],
    description: '消息角色',
    example: 'agent',
  })
  role: 'user' | 'agent';

  @ApiProperty()
  content: string;

  @ApiProperty({
    type: [String],
    description: '追问问题列表',
  })
  followUps: string[];

  @ApiProperty({
    enum: ['positive', 'negative'],
    nullable: true,
    description: '反馈类型',
    example: 'positive',
  })
  feedback: 'positive' | 'negative' | null;

  @ApiProperty()
  createdAt: Date;
}
