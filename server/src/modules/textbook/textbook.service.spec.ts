/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookService } from './textbook.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RawKnowledgePoint, ParseResult } from './types/textbook.types';

describe('TextbookService', () => {
  let service: TextbookService;
  let prismaService: PrismaService;
  let parserService: TextbookParserService;
  let fileService: TextbookFileService;

  // Mock data
  const mockRawKnowledgePoints: RawKnowledgePoint[] = [
    {
      code: '1.1.1',
      level1: '集合与常用逻辑用语',
      level2: '集合的概念与表示',
      level3: '集合的含义',
      definition: '研究对象的总体',
      characteristics: '确定性、互异性、无序性',
      importanceLevel: 'A',
    },
    {
      code: '1.1.2',
      level1: '集合与常用逻辑用语',
      level2: '集合的概念与表示',
      level3: '元素与集合的关系',
      importanceLevel: 'B',
    },
  ];

  const mockParseResult: ParseResult = {
    success: true,
    data: mockRawKnowledgePoints,
  };

  const mockFilePair = {
    frameworkPath: 'math01.xlsx',
    frameworkType: 'xlsx' as const,
    contentPath: 'math01.md',
    lastModifiedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextbookService,
        {
          provide: PrismaService,
          useValue: {
            textbook: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            knowledgePoint: {
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn((callback) =>
              callback({
                textbook: {
                  create: jest.fn().mockResolvedValue({ id: 'textbook-1' }),
                  update: jest.fn(),
                },
                knowledgePoint: {
                  createMany: jest.fn(),
                  deleteMany: jest.fn(),
                },
              }),
            ),
          },
        },
        {
          provide: TextbookParserService,
          useValue: {
            parseFrameworkFile: jest.fn().mockReturnValue(mockParseResult),
            validateKnowledgePoints: jest
              .fn()
              .mockReturnValue({ valid: true, errors: [] }),
          },
        },
        {
          provide: TextbookFileService,
          useValue: {
            scanTextbookFiles: jest
              .fn()
              .mockReturnValue(new Map([['math01', mockFilePair]])),
            getFilePath: jest.fn().mockReturnValue('/iksm/math01.xlsx'),
            deleteFile: jest.fn(),
            getFileType: jest.fn().mockReturnValue('xlsx'),
            saveFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TextbookService>(TextbookService);
    prismaService = module.get<PrismaService>(PrismaService);
    parserService = module.get<TextbookParserService>(TextbookParserService);
    fileService = module.get<TextbookFileService>(TextbookFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncAllTextbooks', () => {
    it('should add new textbooks when not in database', async () => {
      jest.spyOn(prismaService.textbook, 'findMany').mockResolvedValue([]);

      const result = await service.syncAllTextbooks();

      expect(result.added).toContain('math01');
      expect(fileService.scanTextbookFiles).toHaveBeenCalled();
    });

    it('should update textbooks when file is newer', async () => {
      const oldDate = new Date('2024-01-01');
      jest.spyOn(prismaService.textbook, 'findMany').mockResolvedValue([
        {
          id: 'textbook-1',
          fileName: 'math01',
          lastModifiedAt: oldDate,
        } as any,
      ]);

      const result = await service.syncAllTextbooks();

      expect(result.updated).toContain('math01');
    });

    it('should remove textbooks not in file system', async () => {
      jest.spyOn(prismaService.textbook, 'findMany').mockResolvedValue([
        {
          id: 'textbook-2',
          fileName: 'old-math',
          lastModifiedAt: new Date(),
        } as any,
      ]);

      const result = await service.syncAllTextbooks();

      expect(result.removed).toContain('old-math');
    });
  });

  describe('findAll', () => {
    it('should return all textbooks with counts', async () => {
      const mockTextbooks = [
        {
          id: 'textbook-1',
          name: 'Math 01',
          fileName: 'math01',
          frameworkType: 'xlsx',
          contentPath: 'math01.md',
          lastModifiedAt: new Date(),
          createdAt: new Date(),
          _count: { knowledgePoints: 10 },
        },
      ];

      jest
        .spyOn(prismaService.textbook, 'findMany')
        .mockResolvedValue(mockTextbooks as any);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].knowledgePointCount).toBe(10);
      expect(result[0].hasContent).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return textbook details', async () => {
      const mockTextbook = {
        id: 'textbook-1',
        name: 'Math 01',
        fileName: 'math01',
        frameworkType: 'xlsx',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
        lastModifiedAt: new Date(),
        createdAt: new Date(),
        _count: { knowledgePoints: 10 },
      };

      jest
        .spyOn(prismaService.textbook, 'findUnique')
        .mockResolvedValue(mockTextbook as any);

      const result = await service.findOne('textbook-1');

      expect(result.id).toBe('textbook-1');
      expect(result.knowledgePointCount).toBe(10);
    });

    it('should throw NotFoundException when textbook not found', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshTextbook', () => {
    it('should refresh existing textbook', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'textbook-1',
        fileName: 'math01',
      } as any);

      await service.refreshTextbook('textbook-1');

      expect(prismaService.textbook.findUnique).toHaveBeenCalledWith({
        where: { id: 'textbook-1' },
      });
    });

    it('should throw NotFoundException when textbook not found', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await expect(service.refreshTextbook('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete textbook and files', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'textbook-1',
        fileName: 'math01',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(prismaService.textbook, 'delete').mockResolvedValue({} as any);

      await service.remove('textbook-1');

      expect(fileService.deleteFile).toHaveBeenCalledWith('math01.xlsx');
      expect(fileService.deleteFile).toHaveBeenCalledWith('math01.md');
      expect(prismaService.textbook.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when textbook not found', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('handleFileUpload', () => {
    const mockFrameworkFile = {
      originalname: 'math02.xlsx',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('should throw ConflictException when textbook exists', async () => {
      jest
        .spyOn(prismaService.textbook, 'findUnique')
        .mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.handleFileUpload('math02', mockFrameworkFile),
      ).rejects.toThrow(ConflictException);
    });

    it('should upload new textbook successfully', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await service.handleFileUpload('math02', mockFrameworkFile);

      expect(fileService.saveFile).toHaveBeenCalledWith(
        'math02.xlsx',
        expect.any(Buffer),
      );
    });
  });
});
