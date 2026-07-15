# 教材详情页与知识点扩充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在教材管理模块新增教材详情页，并在详情页中提供通过上传新的 xlsx（知识点概述）+ md（知识点详述）文件向现有教材安全扩充知识点的能力；新知识点写入数据库的同时追加到原教材 xlsx 与 md 文件。

**Architecture:** 复用现有 `TextbookParserService` 解析上传的 xlsx，复用现有文件服务读写教材文件，新增 `TextbookService.expandKnowledgePoints` 负责校验、加 PostgreSQL advisory lock、追加文件、写入 DB 的完整流程；前端新增教材详情页与上传弹窗。后端 `POST /textbooks/:id/expand` 作为统一入口。

**Tech Stack:** React 19 + TypeScript + Vite + Ant Design 6 + TanStack Query；NestJS + Prisma + PostgreSQL；`xlsx` 库操作 xlsx；`proper-lockfile` 或 `node-advisory-lock` 用于单实例文件锁；PostgreSQL `pg_advisory_xact_lock` 用于跨实例锁。

---

## File Structure

**Backend:**
- `server/src/modules/textbook/textbook.service.ts` — add `expandKnowledgePoints` and helpers
- `server/src/modules/textbook/textbook.controller.ts` — add `POST /textbooks/:id/expand`
- `server/src/modules/textbook/textbook-file.service.ts` — add `appendXlsxRows` and `appendMdContent` helpers
- `server/src/modules/textbook/textbook-parser.service.ts` — add `extractRequiredColumns` validation helper
- `server/src/modules/textbook/dto/expand-knowledge-points.dto.ts` — response DTO types
- `server/src/modules/textbook/textbook.service.spec.ts` — add expansion tests
- `server/src/modules/textbook/textbook.controller.spec.ts` — add controller tests

**Frontend:**
- `web/src/App.tsx` — add `/teacher/textbooks/:id` route
- `web/src/pages/TextbookDetail/TextbookDetailPage.tsx` — new detail page
- `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts` — new hook for textbook detail and expand
- `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` — new upload modal
- `web/src/pages/TextbookManage/components/TextbookTable.tsx` — add "详情" action
- `web/src/services/textbook.service.ts` — add `expandTextbook` API call
- `web/src/types/textbook.types.ts` — add `ExpandResult` type
- `web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx` — detail page tests
- `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx` — modal tests

**E2E (if framework exists):**
- `e2e/textbook-expand.spec.ts` — happy path and conflict path

---

## Task 1: Backend — Add expand response DTO and advisory lock helper

**Files:**
- Create: `server/src/modules/textbook/dto/expand-knowledge-points.dto.ts`
- Modify: `server/src/modules/textbook/textbook.service.ts`

- [ ] **Step 1: Write the DTO file**

Create `server/src/modules/textbook/dto/expand-knowledge-points.dto.ts`:

```typescript
export interface ExpandKnowledgePointsResponse {
  success: boolean
  message: string
  data?: {
    addedCodes: string[]
    count: number
  }
}

export interface ExpandKnowledgePointsErrorResponse {
  success: false
  message: string
  errors: string[]
}
```

- [ ] **Step 2: Add advisory lock helper in TextbookService**

Add to `server/src/modules/textbook/textbook.service.ts` near the top of the class (after the constructor):

```typescript
private async withTextbookAdvisoryLock<T>(
  tx: any,
  textbookId: string,
  callback: () => Promise<T>,
): Promise<T> {
  // Lock key: hash textbookId to a 64-bit signed integer
  // We use a simple positive hash; pg_advisory_xact_lock takes bigint
  const key = this.hashTextbookId(textbookId)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await tx.$executeRawUnsafe(
    `SELECT pg_advisory_xact_lock(${key})`,
  )
  return callback()
}

private hashTextbookId(textbookId: string): number {
  let hash = 0
  for (let i = 0; i < textbookId.length; i++) {
    const char = textbookId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash)
}
```

- [ ] **Step 3: Run backend tests to ensure no regressions**

Run: `pnpm --filter server test -- textbook.service.spec.ts`
Expected: existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/textbook/dto/expand-knowledge-points.dto.ts server/src/modules/textbook/textbook.service.ts
git commit -m "feat(server/textbook): add expand DTO and advisory lock helper"
```

---

## Task 2: Backend — Add xlsx append helper to TextbookFileService

**Files:**
- Modify: `server/src/modules/textbook/textbook-file.service.ts`
- Test: `server/src/modules/textbook/textbook-file.service.spec.ts`

- [ ] **Step 1: Write the failing test for appendXlsxRows**

Add to `server/src/modules/textbook/textbook-file.service.spec.ts` (create it if missing, or add to existing tests):

```typescript
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

  it('should append rows to an existing xlsx file', () => {
    const fileName = 'test-append.xlsx';
    const filePath = path.join(uploadDir, fileName);
    const headers = ['知识点编号', '一级知识点', '二级知识点', '三级知识点', '定义', '重要性级别'];
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

    // Cleanup
    fs.unlinkSync(filePath);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server test -- textbook-file.service.spec.ts`
Expected: FAIL with `appendXlsxRows` not defined.

- [ ] **Step 3: Implement appendXlsxRows**

Add to `server/src/modules/textbook/textbook-file.service.ts`:

```typescript
/**
 * 在 xlsx 文件末尾追加新行
 * 保持原工作表结构（best-effort）
 */
appendXlsxRows(
  fileName: string,
  headers: string[],
  rows: (string | number | undefined)[][],
): void {
  if (rows.length === 0) {
    return;
  }

  const filePath = this.getFilePath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new BadRequestException(`文件不存在: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Determine the last row with data
  const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
  let lastRow = range.e.r;

  // Ensure we append after the last data row
  const newRowCount = rows.length;
  for (let i = 0; i < newRowCount; i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cellAddress = xlsx.utils.encode_cell({ r: lastRow + 1 + i, c: j });
      const value = row[j];
      worksheet[cellAddress] = {
        t: typeof value === 'number' ? 'n' : 's',
        v: value,
      };
    }
  }

  // Update range
  range.e.r = Math.max(range.e.r, lastRow + newRowCount);
  worksheet['!ref'] = xlsx.utils.encode_range(range);

  xlsx.writeFile(workbook, filePath);
  this.logger.log(`已追加 ${newRowCount} 行到 xlsx: ${filePath}`);
}
```

Make sure to import `xlsx` at the top of the file:

```typescript
import * as xlsx from 'xlsx';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter server test -- textbook-file.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/textbook/textbook-file.service.ts server/src/modules/textbook/textbook-file.service.spec.ts
git commit -m "feat(server/textbook): add xlsx row append helper"
```

---

## Task 3: Backend — Add md content-block append/insert logic

**Files:**
- Modify: `server/src/modules/textbook/textbook.service.ts`
- Test: `server/src/modules/textbook/textbook.service.spec.ts`

- [ ] **Step 1: Write failing tests for md append logic**

Add to `server/src/modules/textbook/textbook.service.spec.ts`:

```typescript
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
    expect(result.endsWith('#### 知识点 2.1.1：新知识点\n\n新内容\n')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server test -- textbook.service.spec.ts`
Expected: FAIL with `appendMdContent` not defined.

- [ ] **Step 3: Implement appendMdContent and extractMdCodes**

Add to `server/src/modules/textbook/textbook.service.ts`:

```typescript
/**
 * 将新知识点内容块追加/插入到 md 内容中
 */
private appendMdContent(
  fileContent: string,
  newBlocks: {
    code: string;
    level1: string;
    level2: string | null;
    level3: string | null;
    name: string;
    content: string;
  }[],
): string {
  const lines = fileContent.split('\n');

  for (const block of newBlocks) {
    const codeParts = block.code.split('.');
    const heading =
      codeParts.length === 1
        ? `## ${block.code} ${block.name}`
        : codeParts.length === 2
          ? `### ${block.code} ${block.name}`
          : `#### 知识点 ${block.code}：${block.name}`;
    const blockLines = [heading, '', block.content, ''];

    const insertIndex = this.findInsertIndexForCode(lines, block.code);
    lines.splice(insertIndex, 0, ...blockLines);
  }

  return lines.join('\n');
}

/**
 * 根据 code 层级找到最佳插入位置（父节点内容块结束之前）
 * 找不到父节点时返回文件末尾
 */
private findInsertIndexForCode(lines: string[], code: string): number {
  const codeParts = code.split('.');

  // Level 3: insert before the end of the parent level-2 block
  if (codeParts.length >= 3) {
    const parentCode = codeParts.slice(0, 2).join('.');
    const parentRange = this.findBlockRangeByCodeLevel2(lines, parentCode);
    if (parentRange) {
      return parentRange.endIndex;
    }
  }

  // Level 2: insert before the end of the parent level-1 block
  if (codeParts.length === 2) {
    const parentCode = codeParts[0];
    const parentRange = this.findBlockRangeByCodeLevel1(lines, parentCode);
    if (parentRange) {
      return parentRange.endIndex;
    }
  }

  // Level 1 or parent not found: append to end
  return lines.length;
}

/**
 * 从 md 内容中提取所有知识点 code
 */
private extractMdCodes(fileContent: string): string[] {
  const codes: string[] = [];
  const lines = fileContent.split('\n');

  for (const line of lines) {
    const level3Match = line.match(/^####\s+知识点\s+(\d+(?:\.\d+)*)\s*[:：]/);
    if (level3Match) {
      codes.push(level3Match[1]);
      continue;
    }
    const level2Match = line.match(/^###\s+(\d+(?:\.\d)*)\b/);
    if (level2Match) {
      codes.push(level2Match[1]);
      continue;
    }
    const level1Match = line.match(/^##\s+(\d+(?:\.\d)*)\b/);
    if (level1Match) {
      codes.push(level1Match[1]);
    }
  }

  return codes;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter server test -- textbook.service.spec.ts`
Expected: new tests pass; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/textbook/textbook.service.ts server/src/modules/textbook/textbook.service.spec.ts
git commit -m "feat(server/textbook): add md content append and code extraction helpers"
```

---

## Task 4: Backend — Add validation and expandKnowledgePoints service method

**Files:**
- Modify: `server/src/modules/textbook/textbook.service.ts`
- Modify: `server/src/modules/textbook/textbook-parser.service.ts`
- Test: `server/src/modules/textbook/textbook.service.spec.ts`

- [ ] **Step 1: Add required column validation in parser**

Add to `server/src/modules/textbook/textbook-parser.service.ts`:

```typescript
/**
 * 检查原始数据是否包含必要的列
 */
validateRequiredColumns(records: Record<string, string>[]): {
  valid: boolean;
  errors: string[];
} {
  if (records.length === 0) {
    return { valid: false, errors: ['框架文件为空'] };
  }

  const requiredFields = [
    ['知识点编号', '编号', 'code'],
    ['一级知识点', '一级', 'level1'],
  ];
  const firstRow = records[0];
  const errors: string[] = [];

  for (const possibleNames of requiredFields) {
    const hasField = possibleNames.some((name) => name in firstRow);
    if (!hasField) {
      errors.push(`缺少必填列: ${possibleNames.join(' / ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 2: Write failing tests for expandKnowledgePoints validation**

Add to `server/src/modules/textbook/textbook.service.spec.ts`:

```typescript
describe('expandKnowledgePoints', () => {
  const mockFrameworkFile = {
    originalname: 'expand.xlsx',
    buffer: Buffer.from('xlsx-binary'),
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    jest
      .spyOn(prismaService.textbook, 'findUnique')
      .mockResolvedValue({ id: 'tb-1', frameworkPath: 'math01.xlsx', contentPath: 'math01.md' } as any);
    jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
      success: false,
      error: 'parse error',
    });

    await expect(
      service.expandKnowledgePoints('tb-1', mockFrameworkFile, mockContentFile),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException when code conflicts with existing', async () => {
    jest
      .spyOn(prismaService.textbook, 'findUnique')
      .mockResolvedValue({ id: 'tb-1', frameworkPath: 'math01.xlsx', contentPath: 'math01.md' } as any);
    jest.spyOn(parserService, 'parseFrameworkFile').mockReturnValue({
      success: true,
      data: [{ code: '1.1.1', level1: '集合', importanceLevel: 'A' }],
    });
    jest
      .spyOn(prismaService.knowledgePoint, 'findMany')
      .mockResolvedValue([{ code: '1.1.1' }] as any);

    await expect(
      service.expandKnowledgePoints('tb-1', mockFrameworkFile, mockContentFile),
    ).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter server test -- textbook.service.spec.ts`
Expected: FAIL with `expandKnowledgePoints` not defined.

- [ ] **Step 4: Implement expandKnowledgePoints**

Add to `server/src/modules/textbook/textbook.service.ts`:

```typescript
/**
 * 扩充教材知识点
 * 在编号不冲突的前提下，把新知识点写入 DB 并追加到原 xlsx/md 文件
 */
async expandKnowledgePoints(
  textbookId: string,
  frameworkFile: Express.Multer.File,
  contentFile: Express.Multer.File,
): Promise<ExpandKnowledgePointsResponse> {
  const textbook = await this.prisma.textbook.findUnique({
    where: { id: textbookId },
  });

  if (!textbook) {
    throw new NotFoundException(`教材不存在: ${textbookId}`);
  }

  // Parse and validate framework file
  const parseResult = this.parserService.parseFrameworkFile(
    this.fileService.getFilePath(frameworkFile.originalname),
    frameworkFile.originalname.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv',
  );

  if (!parseResult.success || !parseResult.data) {
    throw new BadRequestException(`解析框架文件失败: ${parseResult.error}`);
  }

  const newPoints = parseResult.data;

  const columnValidation = this.parserService.validateRequiredColumns(
    newPoints.map((p) => ({
      code: p.code,
      level1: p.level1,
      level2: p.level2 || '',
      level3: p.level3 || '',
      name: p.name || '',
      definition: p.definition || '',
      characteristics: p.characteristics || '',
      importanceLevel: p.importanceLevel,
    })),
  );
  if (!columnValidation.valid) {
    throw new BadRequestException(
      `数据验证失败: ${columnValidation.errors.join('; ')}`,
    );
  }

  const validation = this.parserService.validateKnowledgePoints(newPoints);
  if (!validation.valid) {
    throw new BadRequestException(`数据验证失败: ${validation.errors.join('; ')}`);
  }

  // Validate md content codes are subset of xlsx codes
  const mdContent = contentFile.buffer.toString('utf-8');
  const mdCodes = this.extractMdCodes(mdContent);
  const xlsxCodes = new Set(newPoints.map((p) => p.code));
  const mdCodeErrors = mdCodes
    .filter((code) => !xlsxCodes.has(code))
    .map((code) => `md 中的知识点编号 ${code} 在 xlsx 中不存在`);
  if (mdCodeErrors.length > 0) {
    throw new BadRequestException(`md 文件校验失败: ${mdCodeErrors.join('; ')}`);
  }

  // Acquire advisory lock and execute expansion in transaction
  return this.prisma.$transaction(async (tx) => {
    return this.withTextbookAdvisoryLock(tx, textbookId, async () => {
      // Re-check existing codes after acquiring lock
      const existingPoints = await tx.knowledgePoint.findMany({
        where: { textbookId },
        select: { code: true },
      });
      const existingCodes = new Set(existingPoints.map((p) => p.code));
      const conflicts = newPoints.filter((p) => existingCodes.has(p.code));

      if (conflicts.length > 0) {
        throw new ConflictException(
          `以下知识点编号已存在: ${conflicts.map((p) => p.code).join(', ')}`,
        );
      }

      // Append to xlsx file
      const headers = [
        '知识点编号',
        '一级知识点',
        '二级知识点',
        '三级知识点',
        '知识点名称',
        '定义',
        '特性/运算方式',
        '重要性级别',
      ];
      const xlsxRows = newPoints.map((p) => [
        p.code,
        p.level1,
        p.level2 || '',
        p.level3 || '',
        p.name || '',
        p.definition || '',
        p.characteristics || '',
        p.importanceLevel,
      ]);
      this.fileService.appendXlsxRows(textbook.frameworkPath, headers, xlsxRows);

      // Append to md file
      if (textbook.contentPath) {
        const existingMdContent = fs.readFileSync(
          this.fileService.getFilePath(textbook.contentPath),
          'utf-8',
        );
        const mdBlocks = newPoints
          .filter((p) => p.code.split('.').length >= 3) // Only leaf nodes get detailed content blocks
          .map((p) => ({
            code: p.code,
            level1: p.level1,
            level2: p.level2 || p.level1,
            level3: p.level3 || p.code,
            name: p.name || p.level3 || p.code,
            content: this.extractMdContentForCode(mdContent, p.code) || '[待输入]',
          }));
        const newMdContent = this.appendMdContent(existingMdContent, mdBlocks);
        fs.writeFileSync(
          this.fileService.getFilePath(textbook.contentPath),
          newMdContent,
        );
      }

      // Create DB records
      await tx.knowledgePoint.createMany({
        data: newPoints.map((p) => ({
          code: p.code,
          name: p.name,
          level1: p.level1,
          level2: p.level2 || null,
          level3: p.level3 || null,
          definition: p.definition || null,
          characteristics: p.characteristics || null,
          importanceLevel: p.importanceLevel,
          textbookId,
        })),
      });

      // Update textbook lastModifiedAt
      await tx.textbook.update({
        where: { id: textbookId },
        data: { lastModifiedAt: new Date() },
      });

      return {
        success: true,
        message: `成功新增 ${newPoints.length} 个知识点`,
        data: {
          addedCodes: newPoints.map((p) => p.code),
          count: newPoints.length,
        },
      };
    });
  });
}

/**
 * 从 md 内容中提取指定 code 的详细内容块
 */
private extractMdContentForCode(mdContent: string, code: string): string | null {
  const lines = mdContent.split('\n');
  const codeParts = code.split('.');

  let startIndex = -1;
  if (codeParts.length >= 3) {
    const level3Pattern = new RegExp(
      `^####\\s+知识点\\s+${this.escapeRegex(code)}\\s*[:：]`,
    );
    for (let i = 0; i < lines.length; i++) {
      if (level3Pattern.test(lines[i])) {
        startIndex = i;
        break;
      }
    }
  } else if (codeParts.length === 2) {
    const level2Pattern = new RegExp(`^###\\s+${this.escapeRegex(code)}\\b`);
    for (let i = 0; i < lines.length; i++) {
      if (level2Pattern.test(lines[i])) {
        startIndex = i;
        break;
      }
    }
  } else {
    const level1Pattern = new RegExp(`^##\\s+${this.escapeRegex(code)}\\b`);
    for (let i = 0; i < lines.length; i++) {
      if (level1Pattern.test(lines[i])) {
        startIndex = i;
        break;
      }
    }
  }

  if (startIndex === -1) {
    return null;
  }

  const contentLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^(#{1,4})\s+/) || line.match(/^---\s*$/)) {
      break;
    }
    contentLines.push(line);
  }

  return contentLines.join('\n').trim() || null;
}
```

Wait, there's a problem: `parseFrameworkFile` expects a file path, but we have the file buffer from the upload. We need to save the uploaded file first (to a temp location), then parse it. Or we can modify the parser to accept a buffer. For simplicity, save the uploaded files to a temp location first, parse them, then delete the temp files after processing. But the temp files should not be in the iksm directory to avoid being scanned as textbooks. Use `os.tmpdir()` or a `.tmp` subfolder that is ignored by `scanTextbookFiles` (it already ignores files starting with `.` or `tmp`). Actually, `shouldIgnoreFile` ignores files starting with `.` or `tmp`. So we can use `.tmp-` prefix in the upload dir, or better, use `os.tmpdir()`.

I should adjust the plan to save uploaded files to a temp path first, parse, then delete. Let me add a helper in TextbookFileService or just use fs in the service.

Also, the `TextbookFileService.appendXlsxRows` currently takes a `fileName` and reads from the upload dir. But we need to append to the original textbook's framework file, not the uploaded temp file. The original file name is in `textbook.frameworkPath`. That's correct in the code above.

But the parser needs the path of the uploaded file. We should save it to temp and pass the temp path. Let me add a helper to save temp files.

I need to adjust the implementation. Let me add a `saveTempFile` helper in TextbookFileService, or just use the existing `saveFile` but with a temp name prefix that's ignored. Actually, the existing `saveFile` saves in the upload dir. If the name starts with `.tmp-`, it will be ignored by scan. But `originalname` from the upload might not start with `.tmp-`. We should save with a temp name.

Let me add a helper in the plan.

Also, I need to import the new DTO type. And I need to handle the case where `contentPath` is null. The design says if no md file, create and associate. But for simplicity, maybe we require the original textbook to have a contentPath? The design doc says create if missing. That's extra complexity. I think for the plan, we can say: if the original textbook has no contentPath, save the uploaded md as the content file and update the textbook's contentPath. This is a necessary edge case.

Let me add that to the plan.

Also, the DTO `ExpandKnowledgePointsResponse` needs to be imported in `textbook.service.ts`.

- [ ] **Step 5: Add temp file helper**

Add to `server/src/modules/textbook/textbook-file.service.ts`:

```typescript
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * 保存临时上传文件，返回完整路径
 */
async saveTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const fileName = `.tmp-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(tempDir, fileName);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

/**
 * 删除临时文件
 */
async deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 6: Adjust expandKnowledgePoints to use temp files and handle missing contentPath**

Update the beginning of `expandKnowledgePoints` to save temp files first, and handle the case where `contentPath` is missing:

```typescript
// Save uploaded files to temp locations for parsing
const tempFrameworkPath = await this.fileService.saveTempFile(
  frameworkFile.buffer,
  path.extname(frameworkFile.originalname),
);
const tempContentPath = await this.fileService.saveTempFile(
  contentFile.buffer,
  '.md',
);

try {
  // ... existing parsing code using tempFrameworkPath ...
  const parseResult = this.parserService.parseFrameworkFile(
    tempFrameworkPath,
    frameworkFile.originalname.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv',
  );

  // ... validation code ...

  const mdContent = fs.readFileSync(tempContentPath, 'utf-8');

  // ... transaction code ...

  // Inside transaction, before appending to md file:
  let contentPath = textbook.contentPath;
  if (!contentPath) {
    // Create content file from uploaded md
    contentPath = `${textbook.fileName}.md`;
    fs.writeFileSync(this.fileService.getFilePath(contentPath), mdContent);
    await tx.textbook.update({
      where: { id: textbookId },
      data: { contentPath },
    });
  }

  // ... append to contentPath ...

} finally {
  await this.fileService.deleteTempFile(tempFrameworkPath);
  await this.fileService.deleteTempFile(tempContentPath);
}
```

- [ ] **Step 7: Run the tests**

Run: `pnpm --filter server test -- textbook.service.spec.ts`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/textbook/textbook.service.ts server/src/modules/textbook/textbook.service.spec.ts server/src/modules/textbook/textbook-parser.service.ts server/src/modules/textbook/textbook-file.service.ts
git commit -m "feat(server/textbook): implement expandKnowledgePoints with validation and file append"
```

---

## Task 5: Backend — Add POST /textbooks/:id/expand controller endpoint

**Files:**
- Modify: `server/src/modules/textbook/textbook.controller.ts`
- Test: `server/src/modules/textbook/textbook.controller.spec.ts`

- [ ] **Step 1: Write failing controller test**

Add to `server/src/modules/textbook/textbook.controller.spec.ts` (or create if missing):

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('TextbookController - expand', () => {
  let controller: TextbookController;
  let service: TextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TextbookController],
      providers: [
        {
          provide: TextbookService,
          useValue: {
            expandKnowledgePoints: jest.fn().mockResolvedValue({
              success: true,
              message: '成功新增 1 个知识点',
              data: { addedCodes: ['1.1.2'], count: 1 },
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TextbookController>(TextbookController);
    service = module.get<TextbookService>(TextbookService);
  });

  it('should expand knowledge points', async () => {
    const frameworkFile = {
      originalname: 'expand.xlsx',
      buffer: Buffer.from('xlsx'),
    } as Express.Multer.File;
    const contentFile = {
      originalname: 'expand.md',
      buffer: Buffer.from('md'),
    } as Express.Multer.File;

    const result = await controller.expand('tb-1', { framework: [frameworkFile], content: [contentFile] });

    expect(result.success).toBe(true);
    expect(service.expandKnowledgePoints).toHaveBeenCalledWith('tb-1', frameworkFile, contentFile);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter server test -- textbook.controller.spec.ts`
Expected: FAIL with `expand` not defined.

- [ ] **Step 3: Implement the controller endpoint**

Add to `server/src/modules/textbook/textbook.controller.ts` after the `upload` method:

```typescript
/**
 * 扩充教材知识点
 */
@Post(':id/expand')
@Roles(Role.TEACHER, Role.ADMIN)
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'framework', maxCount: 1 },
    { name: 'content', maxCount: 1 },
  ]),
)
async expand(
  @Param('id') id: string,
  @UploadedFiles() files: FileFields,
): Promise<ExpandKnowledgePointsResponse> {
  if (!files.framework || files.framework.length === 0) {
    throw new BadRequestException('必须上传框架文件 (.xlsx)');
  }
  if (!files.content || files.content.length === 0) {
    throw new BadRequestException('必须上传内容文件 (.md)');
  }

  const frameworkFile = files.framework[0];
  const contentFile = files.content[0];

  if (!frameworkFile.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new BadRequestException('框架文件必须是 .xlsx 格式');
  }
  if (!contentFile.originalname.toLowerCase().endsWith('.md')) {
    throw new BadRequestException('内容文件必须是 .md 格式');
  }

  return this.textbookService.expandKnowledgePoints(
    id,
    frameworkFile,
    contentFile,
  );
}
```

Add the `ExpandKnowledgePointsResponse` import at the top:

```typescript
import { ExpandKnowledgePointsResponse } from './dto/expand-knowledge-points.dto';
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter server test -- textbook.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/textbook/textbook.controller.ts server/src/modules/textbook/textbook.controller.spec.ts
git commit -m "feat(server/textbook): add POST /textbooks/:id/expand endpoint"
```

---

## Task 6: Frontend — Add expand API and types

**Files:**
- Modify: `web/src/services/textbook.service.ts`
- Modify: `web/src/types/textbook.types.ts`

- [ ] **Step 1: Add ExpandResult type**

Add to `web/src/types/textbook.types.ts`:

```typescript
export interface ExpandResult {
  success: boolean
  message: string
  data?: {
    addedCodes: string[]
    count: number
  }
}
```

- [ ] **Step 2: Add expandTextbook API call**

Add to `web/src/services/textbook.service.ts`:

```typescript
/**
 * 扩充教材知识点
 * @param textbookId 教材ID
 * @param frameworkFile 框架文件 (.xlsx)
 * @param contentFile 内容文件 (.md)
 */
export const expandTextbook = async (
  textbookId: string,
  frameworkFile: File,
  contentFile: File
): Promise<ExpandResult> => {
  const formData = new FormData()
  formData.append('framework', frameworkFile)
  formData.append('content', contentFile)

  const response = await textbookApi.post<ExpandResult>(`/${textbookId}/expand`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
```

- [ ] **Step 3: Run frontend typecheck**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/services/textbook.service.ts web/src/types/textbook.types.ts
git commit -m "feat(web/textbook): add expand textbook API and type"
```

---

## Task 7: Frontend — Add /teacher/textbooks/:id route and detail page

**Files:**
- Modify: `web/src/App.tsx`
- Create: `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`
- Create: `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`

- [ ] **Step 1: Add route in App.tsx**

Add a new route in `web/src/App.tsx` after the `/teacher/textbooks` route:

```typescript
<Route
  path="/teacher/textbooks/:id"
  element={
    <AppLayout>
      <ProtectedRoute>
        <TextbookDetailPage />
      </ProtectedRoute>
    </AppLayout>
  }
/>
```

Add the import:

```typescript
import TextbookDetailPage from './pages/TextbookDetail/TextbookDetailPage'
```

- [ ] **Step 2: Create useTextbookDetail hook**

Create `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { getTextbook, expandTextbook } from '../../../services/textbook.service'
import type { TextbookDetail, ExpandResult } from '../../../types/textbook.types'

interface UseTextbookDetailReturn {
  textbook: TextbookDetail | null
  loading: boolean
  error: string | null
  expanding: boolean
  expandError: string | null
  fetchTextbook: () => Promise<void>
  expand: (frameworkFile: File, contentFile: File) => Promise<ExpandResult | null>
}

export const useTextbookDetail = (id: string): UseTextbookDetailReturn => {
  const [textbook, setTextbook] = useState<TextbookDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanding, setExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)

  const fetchTextbook = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTextbook(id)
      setTextbook(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载教材详情失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const expand = useCallback(
    async (frameworkFile: File, contentFile: File): Promise<ExpandResult | null> => {
      setExpanding(true)
      setExpandError(null)
      try {
        const result = await expandTextbook(id, frameworkFile, contentFile)
        await fetchTextbook()
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : '扩充失败'
        setExpandError(message)
        return null
      } finally {
        setExpanding(false)
      }
    },
    [id, fetchTextbook]
  )

  useEffect(() => {
    void fetchTextbook()
  }, [fetchTextbook])

  return {
    textbook,
    loading,
    error,
    expanding,
    expandError,
    fetchTextbook,
    expand,
  }
}
```

- [ ] **Step 3: Create TextbookDetailPage**

Create `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`:

```typescript
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Typography, Descriptions, Spin, Alert, Table, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'
import type { KnowledgePoint } from '../../types/knowledge.types'

const { Title } = Typography

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const {
    textbook,
    loading,
    error,
    expanding,
    expandError,
    expand,
  } = useTextbookDetail(id || '')

  const handleExpand = async (frameworkFile: File, contentFile: File) => {
    const result = await expand(frameworkFile, contentFile)
    if (result?.success) {
      setModalOpen(false)
    }
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null) => name || '-',
    },
    {
      title: '一级知识点',
      dataIndex: 'level1',
      key: 'level1',
    },
    {
      title: '二级知识点',
      dataIndex: 'level2',
      key: 'level2',
      render: (level2: string | null) => level2 || '-',
    },
    {
      title: '三级知识点',
      dataIndex: 'level3',
      key: 'level3',
      render: (level3: string | null) => level3 || '-',
    },
    {
      title: '重要性',
      dataIndex: 'importanceLevel',
      key: 'importanceLevel',
      render: (level: string) => <Tag color="blue">{level}</Tag>,
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !textbook) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="加载失败"
          description={error || '教材不存在'}
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/teacher/textbooks')}>返回列表</Button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher/textbooks')}>
              返回
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {textbook.name}
            </Title>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            扩充知识点
          </Button>
        </Space>

        <Card title="教材信息">
          <Descriptions bordered size="small">
            <Descriptions.Item label="文件名">{textbook.fileName}</Descriptions.Item>
            <Descriptions.Item label="框架类型">{textbook.frameworkType.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="知识点数量">{textbook.knowledgePointCount}</Descriptions.Item>
            <Descriptions.Item label="内容文件">
              {textbook.hasContent ? <Tag color="success">已上传</Tag> : <Tag>未上传</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="最后修改">
              {new Date(textbook.lastModifiedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="知识点列表">
          <Table
            dataSource={textbook.knowledgePoints as KnowledgePoint[]}
            rowKey="id"
            columns={columns}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Space>

      <ExpandKnowledgePointsModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleExpand}
        loading={expanding}
        error={expandError}
      />
    </div>
  )
}

export default TextbookDetailPage
```

Wait, `TextbookDetail` doesn't currently have `knowledgePoints`. The `getTextbook` API returns `TextbookDetail` without knowledge points. We need to add a call to get knowledge points. The existing API `GET /textbooks/:id/knowledge-points` returns the list. We can either update the backend to include knowledge points in `findOne` or make a separate call in the frontend. For simplicity, make a separate call in the hook.

Update `useTextbookDetail` to fetch knowledge points separately:

```typescript
import { getKnowledgeTree } from '../../../services/knowledgeApi'

// Add to state:
const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])

// In fetchTextbook:
const [data, points] = await Promise.all([
  getTextbook(id),
  getKnowledgeTree(id),
])
setTextbook(data)
setKnowledgePoints(points)

// Return knowledgePoints
```

And update the page to use `knowledgePoints` from the hook instead of `textbook.knowledgePoints`.

- [ ] **Step 4: Run frontend typecheck and tests**

Run: `pnpm --filter web typecheck`
Expected: PASS (after fixing types).

- [ ] **Step 5: Commit**

```bash
git add web/src/App.tsx web/src/pages/TextbookDetail/TextbookDetailPage.tsx web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts
git commit -m "feat(web/textbook): add textbook detail page and route"
```

---

## Task 8: Frontend — Add ExpandKnowledgePointsModal

**Files:**
- Create: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`
- Test: `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`

- [ ] **Step 1: Write failing component test**

Create `web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx`:

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExpandKnowledgePointsModal } from '../components/ExpandKnowledgePointsModal'

describe('ExpandKnowledgePointsModal', () => {
  it('should call onSubmit with selected files', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(
      <ExpandKnowledgePointsModal
        open={true}
        onCancel={onCancel}
        onSubmit={onSubmit}
        loading={false}
        error={null}
      />
    )

    const frameworkInput = screen.getByLabelText(/框架文件/i)
    const contentInput = screen.getByLabelText(/内容文件/i)
    const submitButton = screen.getByRole('button', { name: /确认上传/i })

    const frameworkFile = new File(['xlsx'], 'expand.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const contentFile = new File(['md'], 'expand.md', { type: 'text/markdown' })

    fireEvent.change(frameworkInput, { target: { files: [frameworkFile] } })
    fireEvent.change(contentInput, { target: { files: [contentFile] } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(frameworkFile, contentFile)
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- ExpandKnowledgePointsModal.test.tsx`
Expected: FAIL with component not found.

- [ ] **Step 3: Implement the modal**

Create `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`:

```typescript
import React, { useState } from 'react'
import { Modal, Upload, Button, Space, Alert, Typography } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload'

interface ExpandKnowledgePointsModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (frameworkFile: File, contentFile: File) => Promise<void>
  loading: boolean
  error: string | null
}

export const ExpandKnowledgePointsModal: React.FC<ExpandKnowledgePointsModalProps> = ({
  open,
  onCancel,
  onSubmit,
  loading,
  error,
}) => {
  const [frameworkFile, setFrameworkFile] = useState<File | null>(null)
  const [contentFile, setContentFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!frameworkFile || !contentFile) return
    await onSubmit(frameworkFile, contentFile)
  }

  const handleClose = () => {
    setFrameworkFile(null)
    setContentFile(null)
    onCancel()
  }

  return (
    <Modal
      title="扩充知识点"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!frameworkFile || !contentFile}
          onClick={handleSubmit}
        >
          确认上传
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          上传新的 xlsx（知识点概述）和 md（知识点详述）文件，编号不冲突的知识点将被追加到当前教材。
        </Typography.Text>

        {error && <Alert message={error} type="error" showIcon />}

        <Upload
          accept=".xlsx"
          maxCount={1}
          beforeUpload={(file) => {
            setFrameworkFile(file)
            return false
          }}
          onRemove={() => {
            setFrameworkFile(null)
          }}
        >
          <Button icon={<FileExcelOutlined />}>选择框架文件 (.xlsx)</Button>
        </Upload>

        <Upload
          accept=".md"
          maxCount={1}
          beforeUpload={(file) => {
            setContentFile(file)
            return false
          }}
          onRemove={() => {
            setContentFile(null)
          }}
        >
          <Button icon={<FileTextOutlined />}>选择内容文件 (.md)</Button>
        </Upload>
      </Space>
    </Modal>
  )
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter web test -- ExpandKnowledgePointsModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx web/src/pages/TextbookDetail/__tests__/ExpandKnowledgePointsModal.test.tsx
git commit -m "feat(web/textbook): add expand knowledge points modal"
```

---

## Task 9: Frontend — Add "详情" action to TextbookTable

**Files:**
- Modify: `web/src/pages/TextbookManage/components/TextbookTable.tsx`
- Modify: `web/src/pages/TextbookManage/TextbookManagePage.tsx`
- Test: existing tests

- [ ] **Step 1: Add detail action to TextbookTable**

Modify `web/src/pages/TextbookManage/components/TextbookTable.tsx`:

Add prop:
```typescript
interface TextbookTableProps {
  textbooks: Textbook[]
  loading: boolean
  onRefresh: (id: string) => void
  onDelete: (id: string) => void
  onViewDetail: (id: string) => void
}
```

Update destructuring and add a detail button in the action column:
```typescript
export const TextbookTable: React.FC<TextbookTableProps> = ({
  textbooks,
  loading,
  onRefresh,
  onDelete,
  onViewDetail,
}) => {
```

Import `EyeOutlined`:
```typescript
import { SyncOutlined, DeleteOutlined, FileExcelOutlined, FileTextOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons'
```

Add detail button before refresh:
```typescript
<Tooltip title="查看详情">
  <Button type="text" icon={<EyeOutlined />} onClick={() => onViewDetail(record.id)} />
</Tooltip>
```

- [ ] **Step 2: Wire onViewDetail in TextbookManagePage**

Modify `web/src/pages/TextbookManage/TextbookManagePage.tsx`:

Import `useNavigate` (already imported) and add handler:

```typescript
const handleViewDetail = (id: string) => {
  navigate(`/teacher/textbooks/${id}`)
}
```

Pass it to `TextbookTable`:
```typescript
<TextbookTable
  textbooks={textbooks}
  loading={loading}
  onRefresh={handleRefresh}
  onDelete={handleDelete}
  onViewDetail={handleViewDetail}
/>
```

- [ ] **Step 3: Update existing tests if they fail**

Run: `pnpm --filter web test --run`
Expected: PASS or identify failures to fix.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/TextbookManage/components/TextbookTable.tsx web/src/pages/TextbookManage/TextbookManagePage.tsx
git commit -m "feat(web/textbook): add detail action to textbook list"
```

---

## Task 10: Frontend — Add detail page tests

**Files:**
- Create: `web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`

- [ ] **Step 1: Write the test**

Create `web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`:

```typescript
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'

vi.mock('../hooks/useTextbookDetail', () => ({
  useTextbookDetail: vi.fn(() => ({
    textbook: {
      id: 'tb-1',
      name: 'Math 01',
      fileName: 'math01',
      frameworkType: 'xlsx',
      hasContent: true,
      knowledgePointCount: 2,
      lastModifiedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    },
    knowledgePoints: [
      { id: 'kp-1', code: '1.1.1', name: '集合的含义', level1: '集合', level2: '1.1', level3: '1.1.1', importanceLevel: 'A' },
    ],
    loading: false,
    error: null,
    expanding: false,
    expandError: null,
    fetchTextbook: vi.fn(),
    expand: vi.fn(),
  })),
}))

describe('TextbookDetailPage', () => {
  it('should render textbook detail and knowledge points', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/textbooks/tb-1']}>
        <Routes>
          <Route path="/teacher/textbooks/:id" element={<TextbookDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Math 01')).toBeInTheDocument()
    })
    expect(screen.getByText('1.1.1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter web test -- TextbookDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx
git commit -m "test(web/textbook): add textbook detail page tests"
```

---

## Task 11: E2E — Add expand happy and conflict paths

**Files:**
- Create fixture files: `e2e/fixtures/expand-valid.xlsx`, `e2e/fixtures/expand-valid.md`, `e2e/fixtures/expand-conflict.xlsx`, `e2e/fixtures/expand-conflict.md`
- Create: `e2e/textbook-expand.spec.ts` (or equivalent for the existing E2E framework)

- [ ] **Step 1: Create fixture files**

Create `e2e/fixtures/expand-valid.xlsx` with at least one new code (e.g., `1.1.2`) under an existing chapter (`1.1`). The corresponding `expand-valid.md` should have:

```markdown
#### 知识点 1.1.2：元素与集合的关系

元素可以属于集合，也可以不属于集合。
```

Create `e2e/fixtures/expand-conflict.xlsx` with a code that already exists in the target textbook (e.g., `1.1.1`).

- [ ] **Step 2: Write the E2E test**

Create `e2e/textbook-expand.spec.ts` (adapt to Playwright syntax if different):

```typescript
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Textbook knowledge point expansion', () => {
  test('successfully expands a textbook', async ({ page }) => {
    await page.goto('/teacher/textbooks')
    await page.click('text=Math 01') // or the 详情 button
    await page.click('text=扩充知识点')

    const frameworkInput = await page.locator('input[type="file"]').nth(0)
    await frameworkInput.setInputFiles(path.join(__dirname, 'fixtures', 'expand-valid.xlsx'))

    const contentInput = await page.locator('input[type="file"]').nth(1)
    await contentInput.setInputFiles(path.join(__dirname, 'fixtures', 'expand-valid.md'))

    await page.click('text=确认上传')
    await expect(page.locator('text=成功新增')).toBeVisible()
    await expect(page.locator('text=1.1.2')).toBeVisible()
  })

  test('shows conflict error', async ({ page }) => {
    await page.goto('/teacher/textbooks')
    await page.click('text=Math 01')
    await page.click('text=扩充知识点')

    const frameworkInput = await page.locator('input[type="file"]').nth(0)
    await frameworkInput.setInputFiles(path.join(__dirname, 'fixtures', 'expand-conflict.xlsx'))

    const contentInput = await page.locator('input[type="file"]').nth(1)
    await contentInput.setInputFiles(path.join(__dirname, 'fixtures', 'expand-conflict.md'))

    await page.click('text=确认上传')
    await expect(page.locator('text=已存在')).toBeVisible()
  })
})
```

Note: If the project uses a different E2E framework (Cypress, etc.), adapt the syntax.

- [ ] **Step 3: Run E2E tests**

Run: `pnpm test:e2e` (or the appropriate E2E command from CLAUDE.md)
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test(e2e): add textbook expansion happy and conflict paths"
```

---

## Task 12: Quality Gates

**Files:** all changed files

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```
Expected: zero errors.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```
Expected: all tests pass. Note: there are 5 pre-existing failing web tests unrelated to this change (per project memory); ensure no new failures are introduced.

- [ ] **Step 4: Manual verification**

1. Start backend: `pnpm dev:server`
2. Start frontend: `pnpm dev`
3. Navigate to `/teacher/textbooks`
4. Click "详情" on a textbook
5. Click "扩充知识点"
6. Upload valid `expand-valid.xlsx` + `expand-valid.md`
7. Verify new knowledge point appears in the list and the original xlsx/md files are updated
8. Try uploading `expand-conflict.xlsx` and verify error is shown without changes

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: textbook detail page and knowledge point expansion"
```

---

## Self-Review

**Spec coverage:**
- Detail page: Task 7
- Expand upload: Tasks 8, 9
- xlsx + md file upload: Task 8 modal, Task 4 service
- Code conflict prevention: Task 4 validation
- DB storage: Task 4 transaction
- Append to original xlsx/md: Tasks 2, 3, 4
- Permission control: Task 5 controller `@Roles`, existing guards
- Tests: Tasks 10, 11, 12

**Placeholder scan:** No TBD/TODO placeholders. Each step contains concrete code or commands.

**Type consistency:** `ExpandResult` is defined in `web/src/types/textbook.types.ts` and used in `textbook.service.ts` and `useTextbookDetail.ts`. `ExpandKnowledgePointsResponse` is defined in backend DTO and used in service and controller.

**Gaps identified:**
- CSV framework expansion is out of scope for this MVP (see design doc Reviewer Concerns). If the original textbook is csv, the endpoint currently rejects it. A future task could add `appendCsvRows` to `TextbookFileService`.
- The E2E test assumes a Playwright-like API. If the project uses a different framework, adapt the test syntax.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-textbook-knowledge-point-expansion.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?