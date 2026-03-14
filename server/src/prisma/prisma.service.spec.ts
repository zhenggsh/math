import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    // 测试数据库连接
    const result = await service.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should have user model', () => {
    expect(service.user).toBeDefined();
  });

  it('should have textbook model', () => {
    expect(service.textbook).toBeDefined();
  });

  it('should have knowledgePoint model', () => {
    expect(service.knowledgePoint).toBeDefined();
  });

  it('should have learningRecord model', () => {
    expect(service.learningRecord).toBeDefined();
  });
});
