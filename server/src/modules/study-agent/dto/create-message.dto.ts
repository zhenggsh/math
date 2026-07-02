import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: '消息内容',
    example: '什么是三角函数？',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
