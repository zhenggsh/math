import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgePointController } from './knowledge-point.controller';
import { KnowledgePointService } from './knowledge-point.service';
import { ImportanceLevel } from '@prisma/client';

describe('KnowledgePointController', () => {
  let controller: KnowledgePointController;
  let service: KnowledgePointService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgePointController],
      providers: [
        {
          provide: KnowledgePointService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(KnowledgePointController);
    service = module.get(KnowledgePointService);
  });

  it('should return success response for create', async () => {
    const mockPoint = {
      id: 'new-1',
      code: '1.1',
      level1: '集合',
      level2: '1.1',
      level3: null,
      definition: null,
      characteristics: null,
      importanceLevel: ImportanceLevel.A,
      contentRef: null,
      textbookId: 'tb-1',
    };
    (service.create as jest.Mock).mockResolvedValue(mockPoint);

    const result = await controller.create('tb-1', {
      parentId: 'parent-1',
      code: '1.1',
      name: '子知识点',
      importanceLevel: ImportanceLevel.A,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPoint);
  });

  it('should return success response for update', async () => {
    const mockPoint = {
      id: 'kp-1',
      code: '1.1',
      name: 'updated name',
      level1: '集合',
      level2: '1.1',
      level3: null,
      definition: 'updated definition',
      characteristics: 'updated characteristics',
      importanceLevel: ImportanceLevel.B,
      contentRef: null,
      textbookId: 'tb-1',
    };
    (service.update as jest.Mock).mockResolvedValue(mockPoint);

    const result = await controller.update('tb-1', 'kp-1', {
      name: 'updated name',
      definition: 'updated definition',
      characteristics: 'updated characteristics',
      importanceLevel: ImportanceLevel.B,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPoint);
    expect(service.update).toHaveBeenCalledWith('tb-1', 'kp-1', {
      name: 'updated name',
      definition: 'updated definition',
      characteristics: 'updated characteristics',
      importanceLevel: ImportanceLevel.B,
    });
  });

  it('should return success response for delete', async () => {
    (service.delete as jest.Mock).mockResolvedValue({
      id: 'kp-1',
      code: '1.1',
    });

    const result = await controller.delete('tb-1', 'kp-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'kp-1', code: '1.1' });
    expect(service.delete).toHaveBeenCalledWith('tb-1', 'kp-1');
  });
});
