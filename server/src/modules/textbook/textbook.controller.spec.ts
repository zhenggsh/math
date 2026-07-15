import { Test, TestingModule } from '@nestjs/testing';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
});
