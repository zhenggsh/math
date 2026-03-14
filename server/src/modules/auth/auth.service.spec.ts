import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import { Role } from '@prisma/client'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

describe('AuthService', () => {
  let service: AuthService

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  }

  const mockJwtService = {
    signAsync: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        }
      ]
    }).compile()

    service = module.get<AuthService>(AuthService)

    jest.clearAllMocks()
  })

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: Role.STUDENT
    }

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)
      mockPrismaService.user.create.mockResolvedValue({
        id: '1',
        email: registerDto.email,
        name: registerDto.name,
        role: registerDto.role
      })
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token')

      const result = await service.register(registerDto)

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('user')
      expect(result.user.email).toBe(registerDto.email)
      expect(mockPrismaService.user.create).toHaveBeenCalled()
    })

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: registerDto.email
      })

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
    })
  })

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12)
      
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        name: 'Test User',
        role: Role.STUDENT,
        passwordHash: hashedPassword
      })
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token')

      const result = await service.login(loginDto)

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('user')
      expect(result.user.email).toBe(loginDto.email)
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        name: 'Test User',
        role: Role.STUDENT,
        passwordHash: await bcrypt.hash('different-password', 12)
      })

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('validateUser', () => {
    it('should return user without passwordHash', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.STUDENT
      }

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.validateUser('1')

      expect(result).toEqual(mockUser)
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      })
    })
  })
})
