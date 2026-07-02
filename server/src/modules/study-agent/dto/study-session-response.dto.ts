import { ApiProperty } from '@nestjs/swagger';
import { StudyMessageResponseDto } from './study-message-response.dto';

export class StudySessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  knowledgePointId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({
    type: [StudyMessageResponseDto],
    description: '会话消息列表',
  })
  messages: StudyMessageResponseDto[];

  @ApiProperty()
  createdAt: Date;
}
