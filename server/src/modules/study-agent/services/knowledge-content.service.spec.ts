import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeContentService } from './knowledge-content.service';
import * as fs from 'fs';
import { resolve } from 'path';

jest.mock('fs', () => {
  const actualFs = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn(),
  };
});

const readFileSyncMock = fs.readFileSync as jest.Mock;

const sampleContent = `# Title\n\n## 知识点 1.1.1：移动通信的起源与发展\n\nSome content here.\n\n### Sub section\n\nMore details.\n\n---\n\n## 知识点 1.1.2：Next section\n\nShould not include.\n`;

describe('KnowledgeContentService', () => {
  let service: KnowledgeContentService;

  beforeEach(async () => {
    readFileSyncMock.mockImplementation(
      (filePath: fs.PathOrFileDescriptor, options: BufferEncoding) => {
        if (typeof filePath === 'string' && filePath.endsWith('knowledge.md')) {
          return sampleContent;
        }
        return jest
          .requireActual<typeof import('fs')>('fs')
          .readFileSync(filePath, options);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeContentService],
    }).compile();

    service = module.get<KnowledgeContentService>(KnowledgeContentService);
  });

  afterEach(() => {
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

    readFileSyncMock.mockImplementation(
      (filePath: fs.PathOrFileDescriptor, options: BufferEncoding) => {
        if (typeof filePath === 'string' && filePath.endsWith('preferred.md')) {
          return sampleContent;
        }
        if (typeof filePath === 'string' && filePath.endsWith('fallback.md')) {
          return '# Fallback\n';
        }
        return jest
          .requireActual<typeof import('fs')>('fs')
          .readFileSync(filePath, options);
      },
    );

    const result = await service.getSummary(
      contentRefPath,
      fallbackPath,
      '1.1.1',
      'unused',
    );

    expect(readFileSyncMock).toHaveBeenCalledWith(
      resolve(contentRefPath),
      'utf-8',
    );
    expect(result).toContain('移动通信的起源与发展');
  });

  it('should return empty string when neither path is provided', async () => {
    const result = await service.getSummary(
      undefined,
      undefined,
      '1.1.1',
      'title',
    );

    expect(result).toBe('');
    expect(readFileSyncMock).not.toHaveBeenCalled();
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
    readFileSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });

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
    readFileSyncMock.mockReturnValue(content);

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

    readFileSyncMock.mockReturnValue(content);

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

    readFileSyncMock.mockReturnValue(content);

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
});
