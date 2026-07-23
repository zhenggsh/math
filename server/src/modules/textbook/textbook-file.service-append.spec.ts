import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookFileService } from './textbook-file.service';
import { TextbookParserService } from './textbook-parser.service';
import { ConfigService } from '@nestjs/config';

describe('TextbookFileService - appendXlsxRows', () => {
  let service: TextbookFileService;
  let uploadDir: string;

  beforeEach(async () => {
    // 使用临时目录作为上传目录，避免污染真实 iksm 目录
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'append-xlsx-'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextbookFileService,
        TextbookParserService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => uploadDir) },
        },
      ],
    }).compile();
    service = module.get<TextbookFileService>(TextbookFileService);
  });

  afterEach(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
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

  describe('appendXlsxRows 多 sheet 与列映射', () => {
    let tmpDir: string;
    let fileName: string;

    const buildCoverFirstWorkbook = () => {
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.aoa_to_sheet([['高中数学必修一 知识点框架'], ['知识点总数', '1']]),
        '封面',
      );
      xlsx.utils.book_append_sheet(
        wb,
        xlsx.utils.aoa_to_sheet([
          ['一级知识点', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', '知识点编号'],
          ['集合', '集合的概念', '集合的含义', '研究对象的总体', '确定性', 'A', '1.1.1'],
        ]),
        '知识点框架',
      );
      fileName = 'append-multi.xlsx';
      xlsx.writeFile(wb, path.join(tmpDir, fileName));
    };

    beforeEach(() => {
      // service 的 uploadDir 已指向外层创建的临时目录
      tmpDir = uploadDir;
      buildCoverFirstWorkbook();
    });

    it('追加行写入框架 sheet 而非封面，且按表头名对齐列', () => {
      service.appendXlsxRows(
        fileName,
        ['知识点编号', '一级知识点', '二级知识点', '三级知识点', '定义', '特性', '重要性级别'],
        [['1.1.2', '集合', '集合的概念', '集合的表示', '列举法', '互异性', 'B']],
      );

      const wb = xlsx.readFile(path.join(tmpDir, fileName));
      // 封面不被修改
      const cover = xlsx.utils.sheet_to_json<string[]>(wb.Sheets['封面'], { header: 1 });
      expect(cover).toHaveLength(2);
      // 框架 sheet 新增行且编号在最后一列
      const fw = xlsx.utils.sheet_to_json<string[]>(wb.Sheets['知识点框架'], { header: 1 });
      expect(fw).toHaveLength(3);
      expect(fw[2][6]).toBe('1.1.2'); // 知识点编号列
      expect(fw[2][0]).toBe('集合'); // 一级知识点列
      expect(fw[2][5]).toBe('B'); // 重要性级别列
    });

    it('传入的表头在目标 sheet 不存在时抛出 BadRequestException', () => {
      expect(() =>
        service.appendXlsxRows(fileName, ['不存在的列'], [['x']]),
      ).toThrow(BadRequestException);
    });
  });
});
