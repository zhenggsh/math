/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookParserService } from './textbook-parser.service';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

jest.mock('fs');
jest.mock('xlsx');

describe('TextbookParserService', () => {
  let service: TextbookParserService;
  const mockedXlsx = xlsx as jest.Mocked<typeof xlsx>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextbookParserService],
    }).compile();

    service = module.get<TextbookParserService>(TextbookParserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseFrameworkFile', () => {
    it('should return error when file does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = service.parseFrameworkFile(
        '/nonexistent/file.xlsx',
        'xlsx',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for unsupported file type', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = service.parseFrameworkFile('/test/file.txt', 'txt' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle parse errors gracefully', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = service.parseFrameworkFile('/test/file.csv', 'csv');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip non-compliant sheet and use compliant one', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      mockedXlsx.readFile.mockReturnValue({
        SheetNames: ['封面', '知识点框架'],
        Sheets: {
          封面: {},
          知识点框架: {},
        },
      } as any);

      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce([
          ['标题', '统计'],
          ['知识点总数', '72个'],
        ])
        .mockReturnValueOnce([
          [
            '一级知识点',
            '二级知识点',
            '三级知识点',
            '定义',
            '特性',
            '重要性级别',
            '知识点编号',
          ],
          [
            '一、集合与函数概念',
            '1.1 集合',
            '1.1.1 集合的含义与表示',
            '把研究对象统称为元素...',
            '元素用小写字母表示...',
            'A',
            '1.1.1-1',
          ],
        ]);

      const result = service.parseFrameworkFile('/test/math01.xlsx', 'xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].code).toBe('1.1.1-1');
      expect(result.data?.[0].level1).toBe('一、集合与函数概念');
    });

    it('should return empty array when all sheets are non-compliant', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      mockedXlsx.readFile.mockReturnValue({
        SheetNames: ['封面', '目录'],
        Sheets: {
          封面: {},
          目录: {},
        },
      } as any);

      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce([
          ['标题', '统计'],
          ['知识点总数', '72个'],
        ])
        .mockReturnValueOnce([
          ['章节', '页码'],
          ['第一章', '1'],
        ]);

      const result = service.parseFrameworkFile('/test/math01.xlsx', 'xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should use first compliant sheet when there are multiple compliant sheets', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      mockedXlsx.readFile.mockReturnValue({
        SheetNames: ['知识点框架1', '知识点框架2'],
        Sheets: {
          知识点框架1: {},
          知识点框架2: {},
        },
      } as any);

      (mockedXlsx.utils.sheet_to_json as jest.Mock)
        .mockReturnValueOnce([
          ['一级知识点', '二级知识点', '知识点编号'],
          ['第一章', '1.1 节', '1.1.1'],
        ])
        .mockReturnValueOnce([
          ['一级知识点', '二级知识点', '知识点编号'],
          ['第二章', '2.1 节', '2.1.1'],
        ]);

      const result = service.parseFrameworkFile('/test/math01.xlsx', 'xlsx');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].code).toBe('1.1.1');
    });
  });

  describe('validateKnowledgePoints', () => {
    it('should return valid for correct data', () => {
      const points = [
        {
          code: '1.1.1',
          level1: 'Chapter 1',
          level2: 'Section 1',
          level3: 'Point 1',
          importanceLevel: 'A' as const,
        },
        {
          code: '1.1.2',
          level1: 'Chapter 1',
          level2: 'Section 1',
          level3: 'Point 2',
          importanceLevel: 'B' as const,
        },
      ];

      const result = service.validateKnowledgePoints(points);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing code', () => {
      const points = [
        {
          code: '',
          level1: 'Chapter 1',
          importanceLevel: 'A' as const,
        },
      ];

      const result = service.validateKnowledgePoints(points);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing level1', () => {
      const points = [
        {
          code: '1.1.1',
          level1: '',
          importanceLevel: 'A' as const,
        },
      ];

      const result = service.validateKnowledgePoints(points);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate codes', () => {
      const points = [
        {
          code: '1.1.1',
          level1: 'Chapter 1',
          importanceLevel: 'A' as const,
        },
        {
          code: '1.1.1',
          level1: 'Chapter 2',
          importanceLevel: 'B' as const,
        },
      ];

      const result = service.validateKnowledgePoints(points);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
