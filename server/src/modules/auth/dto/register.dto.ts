import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度至少为 8 位' })
  password: string;

  @IsString({ message: '姓名必须是字符串' })
  @MinLength(2, { message: '姓名长度至少为 2 位' })
  name: string;

  @IsOptional()
  @IsEnum(Role, { message: '角色必须是 STUDENT 或 TEACHER' })
  role?: Role;
}
