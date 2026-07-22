/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookService } from './textbook.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RawKnowledgePoint, ParseResult } from './types/textbook.types';
import * as fs from 'fs';

jest.mock('fs');

describe('TextbookService', () => {
  let service: TextbookService;
  let prismaService: PrismaService;
  let fileService: TextbookFileService;
  let parserService: TextbookParserService;

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
    explicitCodes: ['1.1.1', '1.1.2'],
    rawRecords: [
      { code: '1.1.1', level1: '集合与常用逻辑用语' },
      { code: '1.1.2', level1: '集合与常用逻辑用语' },
    ],
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
              count: jest.fn().mockResolvedValue(0),
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
            $transaction: jest.fn((callback) =>
              callback({
                $executeRawUnsafe: jest.fn(),
                textbook: {
                  create: jest.fn().mockResolvedValue({ id: 'textbook-1' }),
                  update: jest.fn(),
                },
                knowledgePoint: {
                  createMany: jest.fn(),
                  deleteMany: jest.fn(),
                  findMany: jest.fn(),
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
            validateRequiredColumns: jest
              .fn()
              .mockReturnValue({ valid: true, errors: [] }),
            validateExplicitRecords: jest.fn().mockReturnValue([]),
            extractMdCodes: jest.fn().mockReturnValue([]),
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
            appendXlsxRows: jest.fn(),
            appendCsvRows: jest.fn(),
            saveTempFile: jest.fn().mockResolvedValue('/tmp/expand.xlsx'),
            deleteTempFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TextbookService>(TextbookService);
    prismaService = module.get<PrismaService>(PrismaService);
    fileService = module.get<TextbookFileService>(TextbookFileService);
    parserService = module.get<TextbookParserService>(TextbookParserService);
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

  describe('removeKnowledgePointBlock', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should remove the content block and rewrite the file', async () => {
      const fileContent = [
        '## 1 集合',
        '',
        '一级内容',
        '',
        '### 1.1 集合的概念',
        '',
        '二级内容',
        '',
        '#### 知识点 1.1.1：集合的含义',
        '',
        '三级内容',
        '',
      ].join('\n');

      jest.spyOn(prismaService.knowledgePoint, 'findUnique').mockResolvedValue({
        id: 'kp-1',
        code: '1.1.1',
        level1: '集合',
        level2: '1.1',
        level3: '1.1.1',
        textbookId: 'tb-1',
      } as any);
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(fileService, 'getFilePath').mockReturnValue('/iksm/math01.md');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);
      const writeFileSyncSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockImplementation(() => undefined);

      await service.removeKnowledgePointBlock('kp-1');

      const written = writeFileSyncSpy.mock.calls[0][1] as string;
      expect(written).not.toContain('#### 知识点 1.1.1');
      expect(written).not.toContain('三级内容');
      expect(written).toContain('## 1 集合');
      expect(written).toContain('### 1.1 集合的概念');
    });

    it('should return early when content block is not found', async () => {
      const fileContent = ['## 1 集合', '', '一级内容'].join('\n');

      jest.spyOn(prismaService.knowledgePoint, 'findUnique').mockResolvedValue({
        id: 'kp-1',
        code: '1.1.1',
        level1: '集合',
        level2: '1.1',
        level3: '1.1.1',
        textbookId: 'tb-1',
      } as any);
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(fileService, 'getFilePath').mockReturnValue('/iksm/math01.md');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);
      const writeFileSyncSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockImplementation(() => undefined);

      await service.removeKnowledgePointBlock('kp-1');

      expect(writeFileSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('appendMdContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should insert level-3 content under its parent level-2 block', () => {
      const fileContent = [
        '## 1 集合',
        '',
        '一级内容',
        '',
        '### 1.1 集合的概念',
        '',
        '二级内容',
        '',
        '#### 知识点 1.1.1：集合的含义',
        '',
        '旧三级内容',
        '',
      ].join('\n');

      const newBlocks = [
        {
          code: '1.1.2',
          level1: '1',
          level2: '1.1',
          level3: '1.1.2',
          name: '元素与集合的关系',
          content: '元素可以属于或不属于集合。',
        },
      ];

      const result = (service as any).appendMdContent(fileContent, newBlocks);
      expect(result).toContain('#### 知识点 1.1.2：元素与集合的关系');
      expect(result.indexOf('#### 知识点 1.1.2')).toBeGreaterThan(
        result.indexOf('### 1.1 集合的概念'),
      );
      expect(result).toContain('#### 知识点 1.1.1：集合的含义');
    });

    it('should append to end when parent not found', () => {
      const fileContent = '## 1 集合\n\n一级内容\n';
      const newBlocks = [
        {
          code: '2.1.1',
          level1: '2',
          level2: '2.1',
          level3: '2.1.1',
          name: '新知识点',
          content: '新内容',
        },
      ];

      const result = (service as any).appendMdContent(fileContent, newBlocks);
      expect(result.endsWith('#### 知识点 2.1.1：新知识点\n\n新内容\n')).toBe(
        true,
      );
    });
  });

  describe('expandKnowledgePoints', () => {
    const mockFrameworkFile = {
      originalname: 'expand.xlsx',
      buffer: Buffer.from('xlsx-binary'),
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    const mockContentFile = {
      originalname: 'expand.md',
      buffer: Buffer.from('md-content'),
      mimetype: 'text/markdown',
    } as Express.Multer.File;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw BadRequestException when xlsx parse fails', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: false,
        error: 'parse error',
      });

      await expect(
        service.expandKnowledgePoints(
          'tb-1',
          mockFrameworkFile,
          mockContentFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when a concurrent insert conflicts in transaction', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      // prepare 阶段无冲突（DB 只有父编号 1.1），事务内模拟并发插入 1.1.1
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({
            $executeRawUnsafe: jest.fn(),
            textbook: { update: jest.fn() },
            knowledgePoint: {
              findMany: jest.fn().mockResolvedValue([{ code: '1.1.1' }] as any),
              createMany: jest.fn(),
            },
          });
        });

      await expect(
        service.expandKnowledgePoints(
          'tb-1',
          mockFrameworkFile,
          mockContentFile,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when code already exists in database', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      // DB 中已存在 1.1.1 → prepare 阶段校验失败
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }, { code: '1.1.1' }] as any);

      await expect(
        service.expandKnowledgePoints(
          'tb-1',
          mockFrameworkFile,
          mockContentFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully expand knowledge points', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [
          {
            code: '1.1.2',
            name: '元素与集合的关系',
            level1: '集合与常用逻辑用语',
            level2: '集合的概念与表示',
            level3: '元素与集合的关系',
            definition: '元素属于集合',
            characteristics: '确定性',
            importanceLevel: 'B',
          },
        ],
        explicitCodes: ['1.1.2'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }, { code: '1.1.1' }] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({
            $executeRawUnsafe: jest.fn(),
            textbook: { update: jest.fn() },
            knowledgePoint: {
              findMany: jest.fn().mockResolvedValue([{ code: '1.1.1' }] as any),
              createMany: jest.fn(),
            },
          });
        });

      const readFileSyncSpy = jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue('# 现有内容');
      const writeFileSyncSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockImplementation(() => undefined);

      const result = await service.expandKnowledgePoints(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from(
            '#### 知识点 1.1.2：元素与集合的关系\n\n属于关系',
          ),
        },
      );

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(1);
      expect(result.data?.addedCodes).toContain('1.1.2');
      expect(readFileSyncSpy).toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalled();

      const written = writeFileSyncSpy.mock.calls[0][1] as string;
      expect(written).toContain('#### 知识点 1.1.2：元素与集合的关系');
      expect(written).toContain('属于关系');
      expect(written).not.toContain('[待输入]');
    });

    it('should extract md content without colon or 知识点 keyword', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [
          {
            code: '1.1.2',
            name: '元素与集合的关系',
            level1: '集合与常用逻辑用语',
            level2: '集合的概念与表示',
            level3: '元素与集合的关系',
            definition: '元素属于集合',
            characteristics: '确定性',
            importanceLevel: 'B',
          },
        ],
        explicitCodes: ['1.1.2'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }, { code: '1.1.1' }] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({
            $executeRawUnsafe: jest.fn(),
            textbook: { update: jest.fn() },
            knowledgePoint: {
              findMany: jest.fn().mockResolvedValue([{ code: '1.1.1' }] as any),
              createMany: jest.fn(),
            },
          });
        });

      jest.spyOn(fs, 'readFileSync').mockReturnValue('# 现有内容');
      const writeFileSyncSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockImplementation(() => undefined);

      const result = await service.expandKnowledgePoints(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from('#### 1.1.2 元素与集合的关系\n\n属于关系'),
        },
      );

      expect(result.success).toBe(true);
      const written = writeFileSyncSpy.mock.calls[0][1] as string;
      expect(written).toContain('属于关系');
      expect(written).not.toContain('[待输入]');
    });

    it('should strip UTF-8 BOM when extracting md content', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [
          {
            code: '1.1.2',
            name: '元素与集合的关系',
            level1: '集合与常用逻辑用语',
            level2: '集合的概念与表示',
            level3: '元素与集合的关系',
            definition: '元素属于集合',
            characteristics: '确定性',
            importanceLevel: 'B',
          },
        ],
        explicitCodes: ['1.1.2'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }, { code: '1.1.1' }] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({
            $executeRawUnsafe: jest.fn(),
            textbook: { update: jest.fn() },
            knowledgePoint: {
              findMany: jest.fn().mockResolvedValue([{ code: '1.1.1' }] as any),
              createMany: jest.fn(),
            },
          });
        });

      jest.spyOn(fs, 'readFileSync').mockReturnValue('# 现有内容');
      const writeFileSyncSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockImplementation(() => undefined);

      const bom = '﻿';
      const result = await service.expandKnowledgePoints(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from(
            `${bom}#### 知识点 1.1.2：元素与集合的关系\n\n属于关系`,
          ),
        },
      );

      expect(result.success).toBe(true);
      const written = writeFileSyncSpy.mock.calls[0][1] as string;
      expect(written).toContain('属于关系');
      expect(written).not.toContain('[待输入]');
    });

    it('should skip existing auto-generated parent codes', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [
          {
            code: '2',
            name: '第二章',
            level1: '第二章',
            importanceLevel: 'A',
          },
          {
            code: '2.4',
            name: '三角函数',
            level1: '第二章',
            level2: '三角函数',
            importanceLevel: 'A',
          },
          {
            code: '2.4.1',
            name: '任意角',
            level1: '第二章',
            level2: '三角函数',
            level3: '任意角',
            importanceLevel: 'A',
          },
        ],
        explicitCodes: ['2.4', '2.4.1'],
        rawRecords: [],
      });
      // DB 中已有骨架 parent「2」；2.4 / 2.4.1 为本次上传的 explicit 编号
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '2' }] as any);

      const createManyMock = jest.fn();
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return await callback({
            $executeRawUnsafe: jest.fn(),
            textbook: { update: jest.fn() },
            knowledgePoint: {
              findMany: jest.fn().mockResolvedValue([{ code: '2' }] as any),
              createMany: createManyMock,
            },
          });
        });

      jest.spyOn(fs, 'readFileSync').mockReturnValue('## 2 第二章\n\n内容\n');
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

      const result = await service.expandKnowledgePoints(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from('#### 知识点 2.4.1：任意角\n\n任意角内容'),
        },
      );

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);
      expect(result.data?.addedCodes).toContain('2.4');
      expect(result.data?.addedCodes).toContain('2.4.1');
      expect(result.data?.addedCodes).not.toContain('2');
      expect(createManyMock).toHaveBeenCalled();
      const createdData = createManyMock.mock.calls[0][0].data as Array<{
        code: string;
      }>;
      expect(createdData.map((p) => p.code)).toEqual(['2.4', '2.4.1']);
    });
  });

  describe('validateExpansionFiles', () => {
    const mockFrameworkFile = {
      originalname: 'expand.xlsx',
      buffer: Buffer.from('xlsx-binary'),
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    const mockContentFile = {
      originalname: 'expand.md',
      buffer: Buffer.from('md-content'),
      mimetype: 'text/markdown',
    } as Express.Multer.File;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return valid report when all checks pass', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      // 上级编号 1.1 已存在，且无编号冲突
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
      // 逐项校验：9 项全部通过
      expect(report.checks).toHaveLength(9);
      expect(report.checks.every((c) => c.passed)).toBe(true);
      expect(report.checks.map((c) => c.key)).toEqual([
        'parse',
        'columns',
        'code-format',
        'duplicates',
        'db-conflicts',
        'parents',
        'md-empty',
        'md-codes',
        'md-headings',
      ]);
    });

    it('should return invalid report when xlsx parse fails', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: false,
        error: 'parse error',
      });

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      expect(report.errors[0].type).toBe('xlsx');
      expect(report.errors[0].message).toContain('parse error');
    });

    it('should return invalid report when required columns are missing', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest.spyOn(parserService, 'validateRequiredColumns').mockReturnValue({
        valid: false,
        errors: ['缺少必填列: 知识点编号 / 编号 / code'],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'xlsx',
            message: '缺少必填列: 知识点编号 / 编号 / code',
          }),
        ]),
      );
      // 逐项校验：columns 不通过，其余通过
      const columnsCheck = report.checks.find((c) => c.key === 'columns');
      expect(columnsCheck?.passed).toBe(false);
      expect(
        report.checks.filter((c) => c.key !== 'columns').every((c) => c.passed),
      ).toBe(true);
    });

    it('should return invalid report when explicit records are invalid', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      jest.spyOn(parserService, 'validateExplicitRecords').mockReturnValue([
        {
          type: 'xlsx',
          location: { file: 'xlsx', row: 1 },
          message: '第 1 行缺少知识点编号',
        },
      ]);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'xlsx',
            message: '第 1 行缺少知识点编号',
          }),
        ]),
      );
    });

    it('should return invalid report when knowledge point validation fails', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      jest.spyOn(parserService, 'validateKnowledgePoints').mockReturnValue({
        valid: false,
        errors: ['知识点编号 "1.1.1" 重复 (行: 1, 2)'],
      });

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'xlsx',
            message: '知识点编号 "1.1.1" 重复 (行: 1, 2)',
          }),
        ]),
      );
    });

    it('should return invalid report when md contains code not in xlsx', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      jest.spyOn(parserService, 'extractMdCodes').mockReturnValue(['1.1.2']);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      expect(report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'md',
            message: 'md 中的知识点编号 1.1.2 在框架文件中不存在',
          }),
        ]),
      );
    });

    it('should return invalid report when code conflicts with database', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }, { code: '1.1.1' }] as any);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      const check = report.checks.find((c) => c.key === 'db-conflicts');
      expect(check?.passed).toBe(false);
      expect(check?.errors[0].message).toContain('1.1.1');
    });

    it('should return invalid report when parent code does not exist in database', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '9.9.9', level1: '新章节', importanceLevel: 'A' }],
        explicitCodes: ['9.9.9'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        mockContentFile,
      );

      expect(report.valid).toBe(false);
      const check = report.checks.find((c) => c.key === 'parents');
      expect(check?.passed).toBe(false);
      expect(check?.errors[0].message).toContain('9.9');
    });

    it('should return invalid report when md file is empty', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);

      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from('   \n  '),
        },
      );

      expect(report.valid).toBe(false);
      const check = report.checks.find((c) => c.key === 'md-empty');
      expect(check?.passed).toBe(false);
    });

    it('should return invalid report when md heading level is wrong', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      // 三级编号 1.1.1 使用了 ### 标题（应为 ####）
      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from('### 1.1.1 集合的含义\n\n内容'),
        },
      );

      expect(report.valid).toBe(false);
      const check = report.checks.find((c) => c.key === 'md-headings');
      expect(check?.passed).toBe(false);
      expect(check?.errors[0].location.row).toBe(1);
    });

    it('should return invalid report when level-3 code uses ## heading', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
        explicitCodes: ['1.1.1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([{ code: '1.1' }] as any);
      // 三级编号 1.1.1 使用了 ## 标题（应为 ####）
      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from('## 1.1.1 集合的含义\n\n内容'),
        },
      );

      expect(report.valid).toBe(false);
      const check = report.checks.find((c) => c.key === 'md-headings');
      expect(check?.passed).toBe(false);
      expect(check?.errors[0].location.row).toBe(1);
      expect(check?.errors[0].message).toContain('####');
    });

    it('should accept ## heading for level-1 code', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue({
        id: 'tb-1',
        frameworkPath: 'math01.xlsx',
        contentPath: 'math01.md',
      } as any);
      jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
        success: true,
        data: [
          { code: '1.1.1', level1: '集合', importanceLevel: 'A' },
          { code: '1.1', level1: '集合', importanceLevel: 'A' },
          { code: '1', level1: '集合', importanceLevel: 'A' },
        ],
        explicitCodes: ['1.1.1', '1.1', '1'],
        rawRecords: [],
      });
      jest
        .spyOn(prismaService.knowledgePoint, 'findMany')
        .mockResolvedValue([]);
      jest
        .spyOn(parserService, 'extractMdCodes')
        .mockReturnValue(['1', '1.1', '1.1.1']);
      // 一级 ##、二级 ###、三级 #### 均正确
      const report = await service.validateExpansionFiles(
        'tb-1',
        mockFrameworkFile,
        {
          ...mockContentFile,
          buffer: Buffer.from(
            '## 1 集合\n\n### 1.1 集合的概念\n\n#### 1.1.1 集合的含义\n\n内容',
          ),
        },
      );

      const check = report.checks.find((c) => c.key === 'md-headings');
      expect(check?.passed).toBe(true);
    });

    it('should throw NotFoundException when textbook does not exist', async () => {
      jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null);

      await expect(
        service.validateExpansionFiles(
          'non-existent',
          mockFrameworkFile,
          mockContentFile,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
