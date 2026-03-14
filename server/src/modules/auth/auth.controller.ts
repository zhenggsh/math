import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common'
import { AuthService, AuthResponse } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { Roles } from './decorators/roles.decorator'
import { RolesGuard } from './guards/roles.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { Role } from '@prisma/client'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto)
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto)
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: unknown): unknown {
    return user
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly(): { message: string } {
    return { message: '只有管理员可以访问' }
  }
}
