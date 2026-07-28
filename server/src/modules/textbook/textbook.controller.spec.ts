import { Test, TestingModule } from '@nestjs/testing';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';

describe('TextbookController - expand', () => {
  let controller: TextbookController;
  let service: TextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbookController],
      providers: [
        {
          provide: TextbookService,
          useValue: {
            expandKnowledgePoints: jest.fn().mockResolvedValue({
              success: true,
              message: '成功新增 1 个知识点',
              data: { addedCodes: ['1.1.2'], count: 1 },
            }),
            validateExpansionFiles: jest.fn().mockResolvedValue({
              valid: true,
              errors: [],
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TextbookController>(TextbookController);
    service = module.get<TextbookService>(TextbookService);
  });

  it('should expand knowledge points', async () => {
    const frameworkFile = {
      originalname: 'expand.xlsx',
      buffer: Buffer.from('xlsx'),
    } as Express.Multer.File;
    const contentFile = {
      originalname: 'expand.md',
      buffer: Buffer.from('md'),
    } as Express.Multer.File;

    const result = await controller.expand('tb-1', {
      framework: [frameworkFile],
      content: [contentFile],
    });

    expect(result.success).toBe(true);
    expect(service.expandKnowledgePoints).toHaveBeenCalledWith(
      'tb-1',
      frameworkFile,
      contentFile,
    );
  });

  it('should accept .csv framework file for expansion', async () => {
    const frameworkFile = {
      originalname: 'expand.csv',
      buffer: Buffer.from('csv'),
    } as Express.Multer.File;
    const contentFile = {
      originalname: 'expand.md',
      buffer: Buffer.from('md'),
    } as Express.Multer.File;

    const result = await controller.expand('tb-1', {
      framework: [frameworkFile],
      content: [contentFile],
    });

    expect(result.success).toBe(true);
    expect(service.expandKnowledgePoints).toHaveBeenCalledWith(
      'tb-1',
      frameworkFile,
      contentFile,
    );
  });

  describe('validate', () => {
    it('should validate expansion files', async () => {
      const frameworkFile = {
        originalname: 'expand.xlsx',
        buffer: Buffer.from('xlsx'),
      } as Express.Multer.File;
      const contentFile = {
        originalname: 'expand.md',
        buffer: Buffer.from('md'),
      } as Express.Multer.File;

      const result = await controller.validate('tb-1', {
        framework: [frameworkFile],
        content: [contentFile],
      });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(service.validateExpansionFiles).toHaveBeenCalledWith(
        'tb-1',
        frameworkFile,
        contentFile,
      );
    });

    it('should throw BadRequestException when framework file is missing', async () => {
      await expect(
        controller.validate('tb-1', { framework: [], content: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when content file is missing', async () => {
      const frameworkFile = {
        originalname: 'expand.xlsx',
        buffer: Buffer.from('xlsx'),
      } as Express.Multer.File;

      await expect(
        controller.validate('tb-1', {
          framework: [frameworkFile],
          content: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when framework file is not .xlsx or .csv', async () => {
      const frameworkFile = {
        originalname: 'expand.txt',
        buffer: Buffer.from('txt'),
      } as Express.Multer.File;
      const contentFile = {
        originalname: 'expand.md',
        buffer: Buffer.from('md'),
      } as Express.Multer.File;

      await expect(
        controller.validate('tb-1', {
          framework: [frameworkFile],
          content: [contentFile],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept .csv framework file', async () => {
      const frameworkFile = {
        originalname: 'expand.csv',
        buffer: Buffer.from('csv'),
      } as Express.Multer.File;
      const contentFile = {
        originalname: 'expand.md',
        buffer: Buffer.from('md'),
      } as Express.Multer.File;

      const result = await controller.validate('tb-1', {
        framework: [frameworkFile],
        content: [contentFile],
      });

      expect(result.success).toBe(true);
      expect(service.validateExpansionFiles).toHaveBeenCalledWith(
        'tb-1',
        frameworkFile,
        contentFile,
      );
    });

    it('should throw BadRequestException when content file is not .md', async () => {
      const frameworkFile = {
        originalname: 'expand.xlsx',
        buffer: Buffer.from('xlsx'),
      } as Express.Multer.File;
      const contentFile = {
        originalname: 'expand.txt',
        buffer: Buffer.from('txt'),
      } as Express.Multer.File;

      await expect(
        controller.validate('tb-1', {
          framework: [frameworkFile],
          content: [contentFile],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when textbook not found', async () => {
      jest
        .spyOn(service, 'validateExpansionFiles')
        .mockRejectedValue(new NotFoundException('教材不存在: tb-1'));

      const frameworkFile = {
        originalname: 'expand.xlsx',
        buffer: Buffer.from('xlsx'),
      } as Express.Multer.File;
      const contentFile = {
        originalname: 'expand.md',
        buffer: Buffer.from('md'),
      } as Express.Multer.File;

      await expect(
        controller.validate('tb-1', {
          framework: [frameworkFile],
          content: [contentFile],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

describe('TextbookController - 文件预览端点权限控制', () => {
  let controller: TextbookController;
  let rolesGuard: RolesGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbookController],
      providers: [{ provide: TextbookService, useValue: {} }, RolesGuard],
    }).compile();

    controller = module.get<TextbookController>(TextbookController);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
  });

  const buildContext = (
    handler: unknown,
    role: 'STUDENT' | 'TEACHER' | 'ADMIN',
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => TextbookController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    }) as unknown as ExecutionContext;

  it('STUDENT 访问 framework-file 被 RolesGuard 拒绝（403）', () => {
    const context = buildContext(controller.getFrameworkFile, 'STUDENT');
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('STUDENT 访问 content-file 被 RolesGuard 拒绝（403）', () => {
    const context = buildContext(controller.getContentFile, 'STUDENT');
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('TEACHER 可以访问两个文件预览端点', () => {
    expect(
      rolesGuard.canActivate(
        buildContext(controller.getFrameworkFile, 'TEACHER'),
      ),
    ).toBe(true);
    expect(
      rolesGuard.canActivate(
        buildContext(controller.getContentFile, 'TEACHER'),
      ),
    ).toBe(true);
  });
});
