import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeContentService } from './knowledge-content.service';
import { readFile } from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises', () => {
  const actualFs =
    jest.requireActual<typeof import('fs/promises')>('fs/promises');
  return {
    ...actualFs,
    readFile: jest.fn(),
  };
});

const readFileMock = readFile as jest.MockedFunction<typeof readFile>;

const sampleContent = `# Title

## 知识点 1.1.1：移动通信的起源与发展

Some content here.

### Sub section

More details.

---

## 知识点 1.1.2：Next section

Should not include.
`;

const DEFAULT_CWD = 'C:\\repo-root';

describe('KnowledgeContentService', () => {
  let service: KnowledgeContentService;

  beforeEach(async () => {
    jest.spyOn(process, 'cwd').mockReturnValue(DEFAULT_CWD);
    readFileMock.mockImplementation((filePath: string | Buffer | URL) => {
      if (typeof filePath === 'string' && filePath.endsWith('knowledge.md')) {
        return Promise.resolve(sampleContent);
      }
      return Promise.reject(new Error('ENOENT'));
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeContentService],
    }).compile();

    service = module.get<KnowledgeContentService>(KnowledgeContentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract section by code', async () => {
    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'unused',
    );

    expect(result).toContain('1.1.1');
    expect(result).toContain('Some content here');
    expect(result).toContain('More details');
    expect(result).not.toContain('Next section');
  });

  it('should extract section by title', async () => {
    const result = await service.getSummary(
      undefined,
      'knowledge.md',
      'no-match',
      '移动通信的起源与发展',
    );

    expect(result).toContain('1.1.1');
    expect(result).toContain('Some content here');
    expect(result).not.toContain('Next section');
  });

  it('should prefer contentRef over textbookContentPath', async () => {
    const contentRefPath = 'preferred.md';
    const fallbackPath = 'fallback.md';

    readFileMock.mockImplementation((filePath: string | Buffer | URL) => {
      if (typeof filePath === 'string' && filePath.endsWith('preferred.md')) {
        return Promise.resolve(sampleContent);
      }
      if (typeof filePath === 'string' && filePath.endsWith('fallback.md')) {
        return Promise.resolve('# Fallback\n');
      }
      return Promise.reject(new Error('ENOENT'));
    });

    const result = await service.getSummary(
      contentRefPath,
      fallbackPath,
      '1.1.1',
      'unused',
    );

    expect(readFileMock).toHaveBeenCalledWith(
      path.resolve(DEFAULT_CWD, contentRefPath),
      'utf-8',
    );
    expect(result).toContain('移动通信的起源与发展');
  });

  it('should resolve relative paths against process.cwd()', async () => {
    readFileMock.mockImplementation((filePath: string | Buffer | URL) => {
      if (typeof filePath === 'string' && filePath.endsWith('relative.md')) {
        return Promise.resolve(sampleContent);
      }
      return Promise.reject(new Error('ENOENT'));
    });

    await service.getSummary('relative.md', undefined, '1.1.1', 'unused');

    expect(readFileMock).toHaveBeenCalledWith(
      path.resolve(DEFAULT_CWD, 'relative.md'),
      'utf-8',
    );
  });

  it('should return empty string when neither path is provided', async () => {
    const result = await service.getSummary(
      undefined,
      undefined,
      '1.1.1',
      'title',
    );

    expect(result).toBe('');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('should return empty string when path escapes the base directory', async () => {
    const result = await service.getSummary(
      '../outside.md',
      undefined,
      '1.1.1',
      'title',
    );

    expect(result).toBe('');
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('should fall back to file start when section is not found', async () => {
    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '9.9.9',
      'No such title',
    );

    expect(result).toContain('# Title');
    expect(result).toContain('1.1.1');
  });

  it('should return empty string when file cannot be read', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    const result = await service.getSummary(
      'missing.md',
      undefined,
      '1.1.1',
      'title',
    );

    expect(result).toBe('');
  });

  it('should not extract a section when the code is a prefix of another code', async () => {
    const content = `# Title

## 知识点 1.1.1：First

First content.

## 知识点 1.1.2：Second

Second content.
`;
    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1',
      'unused',
    );

    expect(result).toContain('First content');
    expect(result).toContain('Second content');
    expect(result.startsWith('# Title')).toBe(true);
  });

  it('should truncate at a paragraph boundary near the limit', async () => {
    const longParagraph = 'word '.repeat(500); // ~2500 chars
    const section = `## 知识点 1.1.1：Long\n\n${longParagraph}\n\nAnother paragraph.\n`;
    const content = section + '\n## 知识点 1.1.2：Next\n\nMore.\n';

    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'Long',
    );

    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result.startsWith('## 知识点 1.1.1：Long')).toBe(true);
    expect(result).not.toContain('Another paragraph');
  });

  it('should truncate at a formula boundary near the limit', async () => {
    const longSentence = 'a'.repeat(1600);
    const formula = '$$E = mc^2$$';
    const extra = 'more text after the formula that exceeds the limit. '.repeat(
      50,
    );
    const section = `## 知识点 1.1.1：Long\n\n${longSentence} before formula ${formula} ${extra}`;
    const content = section + '\n\n## 知识点 1.1.2：Next\n\nMore.\n';

    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'Long',
    );

    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result.startsWith('## 知识点 1.1.1：Long')).toBe(true);
    const formulaStart = result.indexOf('$$');
    if (formulaStart >= 0) {
      expect(result.slice(formulaStart, formulaStart + formula.length)).toBe(
        formula,
      );
    }
  });

  it('should exclude a formula when the limit cuts through the closing delimiter', async () => {
    const longSentence = 'a'.repeat(1850);
    const formulaContent = 'x '.repeat(55);
    const formula = `$$${formulaContent}$$`;
    const section = `## 知识点 1.1.1：Formula\n\n${longSentence} before formula ${formula}`;
    const content = section + '\n\n## 知识点 1.1.2：Next\n\nMore.\n';

    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'Formula',
    );

    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result.startsWith('## 知识点 1.1.1：Formula')).toBe(true);
    expect(result).not.toContain('$$');
    expect(result.endsWith(' before formula ')).toBe(true);
  });

  it('should exclude a $...$ formula when the limit cuts through its content', async () => {
    const longSentence = 'a'.repeat(1850);
    const formulaContent = 'x '.repeat(60);
    const formula = `$${formulaContent}$`;
    const section = `## 知识点 1.1.1：Formula\n\n${longSentence} before formula ${formula}`;
    const content = section + '\n\n## 知识点 1.1.2：Next\n\nMore.\n';

    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'Formula',
    );

    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result.startsWith('## 知识点 1.1.1：Formula')).toBe(true);
    expect(result).not.toContain('$');
    expect(result.endsWith(' before formula ')).toBe(true);
  });

  it('should truncate at the opening delimiter when the limit cuts through it', async () => {
    const heading = '## 知识点 1.1.1：Open\n\n';
    const prefixLength = 1998 - heading.length;
    const prefix = 'a'.repeat(prefixLength) + ' ';
    const section = `${heading}${prefix}$$formula$$`;
    const content = section + '\n\n## 知识点 1.1.2：Next\n\nMore.\n';

    readFileMock.mockResolvedValue(content);

    const result = await service.getSummary(
      'knowledge.md',
      undefined,
      '1.1.1',
      'Open',
    );

    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result.startsWith('## 知识点 1.1.1：Open')).toBe(true);
    expect(result).not.toContain('$$');
    expect(result).not.toContain('$');
  });
});
