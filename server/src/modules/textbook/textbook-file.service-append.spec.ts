import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookFileService } from './textbook-file.service';
import { ConfigService } from '@nestjs/config';

describe('TextbookFileService - appendXlsxRows', () => {
  let service: TextbookFileService;
  let uploadDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextbookFileService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();
    service = module.get<TextbookFileService>(TextbookFileService);
    uploadDir = service.getUploadDir();
  });

  afterEach(() => {
    // 清理测试文件
    try {
      for (const name of ['test-append.xlsx', 'test-append.csv']) {
        const filePath = path.join(uploadDir, name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // ignore
    }
  });

  it('should append rows to an existing xlsx file', () => {
    const fileName = 'test-append.xlsx';
    const filePath = path.join(uploadDir, fileName);
    const headers = [
      '知识点编号',
      '一级知识点',
      '二级知识点',
      '三级知识点',
      '定义',
      '重要性级别',
    ];
    const initialRows = [
      ['1.1.1', '集合', '集合的概念', '集合的含义', '研究对象总体', 'A'],
    ];
    const newRows = [
      ['1.1.2', '集合', '集合的概念', '元素与集合的关系', '元素属于集合', 'B'],
    ];

    // Create initial workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([headers, ...initialRows]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, filePath);

    service.appendXlsxRows(fileName, headers, newRows);

    const resultWb = xlsx.readFile(filePath);
    const resultWs = resultWb.Sheets[resultWb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json<string[]>(resultWs, { header: 1 });
    expect(data).toHaveLength(3); // header + 2 rows
    expect(data[2]).toEqual(newRows[0]);
  });

  it('should append rows to an existing csv file as UTF-8 text', () => {
    const fileName = 'test-append.csv';
    const filePath = path.join(uploadDir, fileName);
    const initial =
      '知识点编号,一级知识点,二级知识点,三级知识点,定义,重要性级别\n' +
      '1.1.1,集合,集合的概念,集合的含义,研究对象总体,A\n';
    fs.writeFileSync(filePath, initial, 'utf-8');

    const newRows = [
      ['1.1.2', '集合', '集合的概念', '元素与集合的关系', '元素属于集合', 'B'],
    ];

    service.appendCsvRows(fileName, newRows);

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[0]).toContain('知识点编号'); // 原有 UTF-8 中文不损坏
    expect(lines[1]).toContain('集合');
    expect(lines[2]).toBe(
      '1.1.2,集合,集合的概念,元素与集合的关系,元素属于集合,B',
    );
  });

  it('should escape csv cells containing commas, quotes and newlines', () => {
    const fileName = 'test-append.csv';
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, 'a,b\n1,2', 'utf-8'); // 末尾无换行

    service.appendCsvRows(fileName, [['x,y', 'say "hi"']]);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('a,b\n1,2\n"x,y","say ""hi"""\n');
  });

  it('should do nothing when appending zero rows to csv', () => {
    const fileName = 'test-append.csv';
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, 'a,b\n', 'utf-8');

    service.appendCsvRows(fileName, []);

    expect(fs.readFileSync(filePath, 'utf-8')).toBe('a,b\n');
  });
});
