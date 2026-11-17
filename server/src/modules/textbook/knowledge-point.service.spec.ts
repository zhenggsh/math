/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgePointService } from './knowledge-point.service';
import { TextbookService } from './textbook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportanceLevel } from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('KnowledgePointService', () => {
  let service: KnowledgePointService;
  let prisma: PrismaService;
  let textbookService: TextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgePointService,
        {
          provide: TextbookService,
          useValue: {
            appendChildKnowledgePointBlock: jest.fn(),
            removeKnowledgePointBlock: jest.fn(),
            readKnowledgePointContentBlock: jest.fn(),
            updateContentInFileByCode: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            knowledgePoint: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get(KnowledgePointService);
    prisma = module.get(PrismaService);
    textbookService = module.get(TextbookService);
  });

  it('should create a level-2 child under a level-1 parent', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'parent-1',
        code: '1',
        level1: '集合',
        level2: null,
        level3: null,
        textbookId: 'tb-1',
      })
      .mockResolvedValueOnce(null);

    (prisma.knowledgePoint.create as jest.Mock).mockResolvedValue({
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
    });

    const result = await service.create('tb-1', {
      parentId: 'parent-1',
      code: '1.1',
      name: '子知识点',
      importanceLevel: ImportanceLevel.A,
    });

    expect(result.code).toBe('1.1');
    expect(textbookService.appendChildKnowledgePointBlock).toHaveBeenCalledWith(
      'parent-1',
      '1.1',
      '子知识点',
    );
  });

  it('should create a level-3 child under a level-2 parent', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'parent-1',
        code: '1.1',
        level1: '集合',
        level2: '1.1',
        level3: null,
        textbookId: 'tb-1',
      })
      .mockResolvedValueOnce(null);

    (prisma.knowledgePoint.create as jest.Mock).mockResolvedValue({
      id: 'new-1',
      code: '1.1.1',
      level1: '集合',
      level2: '1.1',
      level3: '1.1.1',
      definition: null,
      characteristics: null,
      importanceLevel: ImportanceLevel.B,
      contentRef: null,
      textbookId: 'tb-1',
    });

    const result = await service.create('tb-1', {
      parentId: 'parent-1',
      code: '1.1.1',
      name: '三级知识点',
      importanceLevel: ImportanceLevel.B,
    });

    expect(result.code).toBe('1.1.1');
    expect(textbookService.appendChildKnowledgePointBlock).toHaveBeenCalledWith(
      'parent-1',
      '1.1.1',
      '三级知识点',
    );
  });

  it('should throw NotFoundException when parent does not exist', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.create('tb-1', {
        parentId: 'missing',
        code: '1.1',
        name: '子知识点',
        importanceLevel: ImportanceLevel.C,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when parent belongs to a different textbook', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'parent-1',
      code: '1',
      level1: '集合',
      level2: null,
      level3: null,
      textbookId: 'tb-2',
    });

    await expect(
      service.create('tb-1', {
        parentId: 'parent-1',
        code: '1.1',
        name: '子知识点',
        importanceLevel: ImportanceLevel.C,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when parent is a level-3 node', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'parent-1',
      code: '1.1.1',
      level1: '集合',
      level2: '1.1',
      level3: '1.1.1',
      textbookId: 'tb-1',
    });

    await expect(
      service.create('tb-1', {
        parentId: 'parent-1',
        code: '1.1.1.1',
        name: '子知识点',
        importanceLevel: ImportanceLevel.C,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException when code already exists', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'parent-1',
        code: '1',
        level1: '集合',
        level2: null,
        level3: null,
        textbookId: 'tb-1',
      })
      .mockResolvedValueOnce({
        id: 'existing-1',
        code: '1.1',
        textbookId: 'tb-1',
      });

    await expect(
      service.create('tb-1', {
        parentId: 'parent-1',
        code: '1.1',
        name: '子知识点',
        importanceLevel: ImportanceLevel.C,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw BadRequestException when child code does not start with parent code', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'parent-1',
      code: '1',
      level1: '集合',
      level2: null,
      level3: null,
      textbookId: 'tb-1',
    });

    await expect(
      service.create('tb-1', {
        parentId: 'parent-1',
        code: '2.1',
        name: '子知识点',
        importanceLevel: ImportanceLevel.C,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('update', () => {
    beforeEach(() => {
      (textbookService.readKnowledgePointContentBlock as jest.Mock).mockReset();
      (textbookService.updateContentInFileByCode as jest.Mock).mockReset();
    });

    it('should update DB and Markdown content block when block exists', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        name: 'old name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'old definition',
        characteristics: 'old characteristics',
        importanceLevel: ImportanceLevel.C,
        textbookId: 'tb-1',
      });

      (
        textbookService.readKnowledgePointContentBlock as jest.Mock
      ).mockResolvedValueOnce('old body');

      (prisma.knowledgePoint.update as jest.Mock).mockResolvedValue({
        id: 'kp-1',
        code: '1.1',
        name: 'new name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'new definition',
        characteristics: 'new characteristics',
        importanceLevel: ImportanceLevel.A,
        contentRef: null,
        textbookId: 'tb-1',
      });

      (
        textbookService.updateContentInFileByCode as jest.Mock
      ).mockResolvedValueOnce(true);

      const result = await service.update('tb-1', 'kp-1', {
        name: 'new name',
        definition: 'new definition',
        characteristics: 'new characteristics',
        importanceLevel: ImportanceLevel.A,
      });

      expect(result.name).toBe('new name');
      expect(result.definition).toBe('new definition');
      expect(result.characteristics).toBe('new characteristics');
      expect(result.importanceLevel).toBe(ImportanceLevel.A);
      expect(result.markdownUpdated).toBe(true);
      expect(textbookService.updateContentInFileByCode).toHaveBeenCalledWith(
        'kp-1',
        '1.1',
        '集合',
        '1.1',
        expect.stringContaining('### 1.1 new name'),
      );
    });

    it('should update code and recompute level fields and sync markdown', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        name: '集合运算',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: null,
        characteristics: null,
        importanceLevel: ImportanceLevel.C,
        textbookId: 'tb-1',
      });
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      (
        textbookService.readKnowledgePointContentBlock as jest.Mock
      ).mockResolvedValueOnce('');

      (prisma.knowledgePoint.update as jest.Mock).mockResolvedValue({
        id: 'kp-1',
        code: '2.1.1',
        name: '集合运算',
        level1: '2',
        level2: '2.1',
        level3: '2.1.1',
        definition: null,
        characteristics: null,
        importanceLevel: ImportanceLevel.C,
        contentRef: null,
        textbookId: 'tb-1',
      });

      (
        textbookService.updateContentInFileByCode as jest.Mock
      ).mockResolvedValueOnce(true);

      const result = await service.update('tb-1', 'kp-1', {
        code: '2.1.1',
      });

      expect(result.code).toBe('2.1.1');
      expect(result.level1).toBe('2');
      expect(result.level2).toBe('2.1');
      expect(result.level3).toBe('2.1.1');
      expect(result.markdownUpdated).toBe(true);
      expect(textbookService.updateContentInFileByCode).toHaveBeenCalledWith(
        'kp-1',
        '1.1',
        '集合',
        '1.1',
        expect.stringContaining('#### 知识点 2.1.1：集合运算'),
      );
    });

    it('should update DB but flag markdown as not updated when block is missing', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        name: 'old name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'old definition',
        characteristics: 'old characteristics',
        importanceLevel: ImportanceLevel.C,
        textbookId: 'tb-1',
      });

      (
        textbookService.readKnowledgePointContentBlock as jest.Mock
      ).mockResolvedValueOnce(null);

      (prisma.knowledgePoint.update as jest.Mock).mockResolvedValue({
        id: 'kp-1',
        code: '1.1',
        name: 'new name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'new definition',
        characteristics: 'new characteristics',
        importanceLevel: ImportanceLevel.A,
        contentRef: null,
        textbookId: 'tb-1',
      });

      const result = await service.update('tb-1', 'kp-1', {
        name: 'new name',
        definition: 'new definition',
        characteristics: 'new characteristics',
        importanceLevel: ImportanceLevel.A,
      });

      expect(result.markdownUpdated).toBe(false);
      expect(result.markdownMessage).toContain('未找到');
      expect(textbookService.updateContentInFileByCode).not.toHaveBeenCalled();
    });

    it('should rollback DB when markdown file write fails', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        name: 'old name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'old definition',
        characteristics: 'old characteristics',
        importanceLevel: ImportanceLevel.C,
        textbookId: 'tb-1',
      });

      (
        textbookService.readKnowledgePointContentBlock as jest.Mock
      ).mockResolvedValueOnce('old body');

      (prisma.knowledgePoint.update as jest.Mock).mockResolvedValue({
        id: 'kp-1',
        code: '1.1',
        name: 'new name',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: 'new definition',
        characteristics: 'new characteristics',
        importanceLevel: ImportanceLevel.A,
        contentRef: null,
        textbookId: 'tb-1',
      });

      (
        textbookService.updateContentInFileByCode as jest.Mock
      ).mockRejectedValueOnce(new Error('write failed'));

      await expect(
        service.update('tb-1', 'kp-1', {
          name: 'new name',
          definition: 'new definition',
          characteristics: 'new characteristics',
          importanceLevel: ImportanceLevel.A,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prisma.knowledgePoint.update).toHaveBeenCalledTimes(2);
      expect(prisma.knowledgePoint.update).toHaveBeenLastCalledWith({
        where: { id: 'kp-1' },
        data: {
          code: '1.1',
          name: 'old name',
          level1: '集合',
          level2: '1.1',
          level3: null,
          definition: 'old definition',
          characteristics: 'old characteristics',
          importanceLevel: ImportanceLevel.C,
        },
      });
    });

    it('should throw ConflictException when updating to an existing code', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        name: '集合运算',
        level1: '集合',
        level2: '1.1',
        level3: null,
        definition: null,
        characteristics: null,
        importanceLevel: ImportanceLevel.C,
        textbookId: 'tb-1',
      });
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-2',
        code: '2.1',
        textbookId: 'tb-1',
      });

      await expect(
        service.update('tb-1', 'kp-1', {
          code: '2.1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when knowledge point does not exist', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(
        service.update('tb-1', 'missing', {
          importanceLevel: ImportanceLevel.A,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when knowledge point belongs to a different textbook', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        textbookId: 'tb-2',
      });

      await expect(
        service.update('tb-1', 'kp-1', {
          importanceLevel: ImportanceLevel.A,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a leaf knowledge point and remove the markdown block', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-3',
        code: '1.1.1',
        level1: '集合',
        level2: '1.1',
        level3: '1.1.1',
        textbookId: 'tb-1',
      });
      (prisma.knowledgePoint.count as jest.Mock).mockResolvedValueOnce(0);
      (prisma.knowledgePoint.delete as jest.Mock).mockResolvedValueOnce({});

      const result = await service.delete('tb-1', 'kp-3');

      expect(result.code).toBe('1.1.1');
      expect(prisma.knowledgePoint.delete).toHaveBeenCalledWith({
        where: { id: 'kp-3' },
      });
      expect(textbookService.removeKnowledgePointBlock).toHaveBeenCalledWith(
        'kp-3',
      );
    });

    it('should throw BadRequestException when deleting a non-leaf node', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1',
        level1: '集合',
        level2: null,
        level3: null,
        textbookId: 'tb-1',
      });
      (prisma.knowledgePoint.count as jest.Mock).mockResolvedValueOnce(2);

      await expect(service.delete('tb-1', 'kp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when knowledge point belongs to a different textbook', async () => {
      (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'kp-1',
        code: '1.1',
        textbookId: 'tb-2',
      });

      await expect(service.delete('tb-1', 'kp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
