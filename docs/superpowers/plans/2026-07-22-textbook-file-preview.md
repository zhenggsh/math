# 教材详情页 iksm 文件预览与联动定位 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **注意：** 所有 `git commit` 步骤执行前必须先获得用户确认（项目规则：git 变更需逐次确认）。
>
> **上游工件：** OpenSpec 变更 `openspec/changes/add-textbook-file-preview/`（proposal/design/specs/tasks，4/4 就绪）；设计文档与工程评审见 `~/.gstack/projects/cursor-math-openspec/`。本计划是 tasks.md 的可执行化（TDD + 逐步命令 + 完整代码）。

**Goal:** 在教材详情页直接预览 iksm 磁盘上的 xlsx 框架与 md 内容文件并支持点击框架行定位 md，同时修复扩充功能写错 xlsx sheet 的数据损坏 bug 并修复 math01.xlsx 数据。

**Architecture:** 后端新增 2 个只读端点（文件是真相源，不读 DB）；`appendXlsxRows` 改为经 parser 框架 sheet 检测定位写入目标并按表头名映射列。前端把扩充弹窗的 `FrameworkPreview`/`MdPreview` 迁移为共享组件、`findMdLineByCode` 抽为纯函数，详情页改造为 Allotment 双栏（左框架/右 md 行号视图），扩充成功后自动刷新并高亮新增行。

**Tech Stack:** NestJS 10 + Prisma + SheetJS(xlsx) + papaparse（后端）；React 18 + Ant Design 5 + Allotment + Vitest（前端）；Jest（后端测试）；pnpm workspace。

---

## File Structure

**后端（server/src/modules/textbook/）：**
| 文件 | 责任 | 动作 |
|---|---|---|
| `textbook-parser.service.ts` | 框架文件解析；新增公开的框架 sheet 检测 | Modify |
| `types/textbook.types.ts` | `ParseResult` 增加 `sheetName?` | Modify |
| `textbook-file.service.ts` | 文件读写；`appendXlsxRows` 修复（注入 parser） | Modify |
| `textbook-file.service-append.spec.ts` | append 相关测试（已存在，补充多 sheet 用例） | Modify |
| `textbook-parser.service.spec.ts` | parser 测试（已存在，补充 sheet 检测用例） | Modify |
| `textbook.service.ts` | 新增 `getFrameworkFileContent` / `getContentFileContent` | Modify |
| `textbook.controller.ts` | 新增 2 个 GET 端点 | Modify |
| `textbook.service.spec.ts` | 新端点 service 层测试 | Modify |
| `server/scripts/repair-math01-xlsx.ts` | 一次性数据修复脚本 | Create |

**前端（web/src/）：**
| 文件 | 责任 | 动作 |
|---|---|---|
| `components/textbook-preview/FrameworkPreview.tsx` | 框架表格预览（从 pages/TextbookDetail/components/ 移入） | Move + Modify |
| `components/textbook-preview/MdPreview.tsx` | md 行号预览（同上移入） | Move + Modify |
| `components/textbook-preview/index.ts` | 桶导出 | Create |
| `utils/mdLineLocator.ts` | 纯函数：md 文本 + 编号 → 行号 | Create |
| `utils/mdLineLocator.test.ts` | locator 测试 | Create |
| `utils/textbookFilePreview.ts` | `parseXlsxPreview` 镜像服务端 sheet 检测 + 表头 trim | Modify |
| `utils/textbookFilePreview.test.ts` | 多 sheet 夹具测试（如已存在则补充） | Modify/Create |
| `pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` | 改引用共享组件与 locator | Modify |
| `pages/TextbookDetail/TextbookDetailPage.tsx` | 双栏改造、移除 DB 表格、联动、分歧 Tag | Modify |
| `pages/TextbookDetail/hooks/useTextbookDetail.ts` | 双文件获取与三态 | Modify |
| `services/textbook.service.ts` | 2 个新 API 方法 | Modify |
| `types/textbook.types.ts` | `FrameworkFileContent` / `ContentFileContent` 类型 | Modify |
| `pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx` | 页面交互测试 | Create |

---

### Task 1: parser 暴露框架 sheet 检测（后端）

**Files:**
- Modify: `server/src/modules/textbook/textbook-parser.service.ts`（parseXlsx 重构 + 新增公开方法）
- Modify: `server/src/modules/textbook/types/textbook.types.ts:29-35`（ParseResult 加 sheetName）
- Test: `server/src/modules/textbook/textbook-parser.service.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `textbook-parser.service.spec.ts` 末尾的 describe 块内追加（先看清现有 describe 结构，把测试加进同级新 describe）：

```typescript
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('detectFrameworkSheet', () => {
  let tmpFile: string;

  const buildWorkbook = (sheets: Record<string, unknown[][]>) => {
    const wb = xlsx.utils.book_new();
    for (const [name, aoa] of Object.entries(sheets)) {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(aoa), name);
    }
    tmpFile = path.join(os.tmpdir(), `fw-detect-${Date.now()}.xlsx`);
    xlsx.writeFile(wb, tmpFile);
  };

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('封面在前时选中框架 sheet 并返回 sheetName 与全量行', () => {
    buildWorkbook({
      封面: [['高中数学必修一 知识点框架'], ['知识点总数', '2']],
      知识点框架: [
        ['一级知识点', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', '知识点编号'],
        ['集合', '集合的概念', '集合的含义', '研究对象的总体', '确定性', 'A', '1.1.1'],
        ['集合', '集合的概念', '集合的表示', '列举法与描述法', '互异性', 'B', '1.1.2'],
      ],
    });
    const result = service.detectFrameworkSheet(tmpFile);
    expect(result).not.toBeNull();
    expect(result!.sheetName).toBe('知识点框架');
    expect(result!.records).toHaveLength(2);
    expect(result!.records[0]['知识点编号']).toBe('1.1.1');
  });

  it('无合规框架 sheet 时返回 null', () => {
    buildWorkbook({ 封面: [['只有封面'], ['没有任何框架数据']] });
    expect(service.detectFrameworkSheet(tmpFile)).toBeNull();
  });

  it('表头带空格时 trim 后仍能映射列', () => {
    buildWorkbook({
      知识点框架: [
        ['一级知识点 ', ' 知识点编号'],
        ['集合', '1.1.1'],
      ],
    });
    const result = service.detectFrameworkSheet(tmpFile);
    // 编号列存在即可识别为框架（level1+level3 不足时靠编号列）
    expect(result).not.toBeNull();
    expect(result!.records[0]['知识点编号']).toBe('1.1.1');
  });
});
```

（注：`service` 变量名以该 spec 文件现有 beforeEach 中的实例化名为准；若现有文件用 `parserService`，测试里统一替换。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server && pnpm jest textbook-parser.service.spec.ts -t detectFrameworkSheet`
Expected: FAIL — `service.detectFrameworkSheet is not a function`

- [ ] **Step 3: 实现 detectFrameworkSheet 并重构 parseXlsx**

`textbook-parser.service.ts`：把 `parseXlsx` 的"遍历 sheet → 找表头 → 组装 records → 校验"逻辑抽为两个方法，`parseXlsx` 改为调用公开方法：

```typescript
  /**
   * 解析 XLSX 文件（私有，供 parseFrameworkFile 使用）
   * 返回第一个合规框架 sheet 的行记录
   */
  private parseXlsx(filePath: string): Record<string, string>[] {
    const detected = this.detectFrameworkSheet(filePath);
    if (!detected) {
      this.logger.warn(`未找到合规的知识点框架工作表: ${filePath}`);
      return [];
    }
    this.logger.log(
      `选择工作表 "${detected.sheetName}" 作为知识点框架 (${detected.records.length} 行)`,
    );
    return detected.records;
  }

  /**
   * 检测 xlsx 文件中的知识点框架 sheet（公开）
   * 遍历所有工作表，返回第一个包含合规框架结构的 sheet 名与全量行记录；
   * 未找到时返回 null。供 appendXlsxRows 与 framework-file 端点复用。
   */
  detectFrameworkSheet(
    filePath: string,
  ): { sheetName: string; records: Record<string, string>[] } | null {
    const workbook = xlsx.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      const records = this.sheetToRecords(workbook.Sheets[sheetName]);
      if (this.isValidKnowledgeFramework(records)) {
        return { sheetName, records };
      }
    }
    return null;
  }

  /**
   * 将 worksheet 转为记录数组：第一个非空行作为表头（trim），
   * 空表头列跳过，单元格统一转字符串
   */
  private sheetToRecords(
    worksheet: xlsx.WorkSheet,
  ): Record<string, string>[] {
    const data = xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
    });

    if (data.length === 0) {
      return [];
    }

    let headerRowIndex = 0;
    while (headerRowIndex < data.length) {
      const row = data[headerRowIndex] as unknown as string[];
      if (
        row.some(
          (cell) =>
            cell !== undefined && cell !== null && String(cell).trim() !== '',
        )
      ) {
        break;
      }
      headerRowIndex++;
    }

    if (headerRowIndex >= data.length) {
      return [];
    }

    const headers = data[headerRowIndex] as unknown as string[];
    const rows = data.slice(headerRowIndex + 1);

    return rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header: string, index: number) => {
        if (
          header !== undefined &&
          header !== null &&
          String(header).trim() !== ''
        ) {
          const value = (row as unknown[])[index];
          record[String(header).trim()] =
            value === undefined || value === null ? '' : String(value);
        }
      });
      return record;
    });
  }
```

注意原实现 `String(row[index] || '')` 会把数字 `0` 变为 `''`，新实现已修正（`0` 保留为 `'0'`）——这是评审确认的对齐项之一。

`types/textbook.types.ts` 的 `ParseResult` 增加字段：

```typescript
export interface ParseResult {
  success: boolean;
  data?: RawKnowledgePoint[];
  explicitCodes?: string[];
  rawRecords?: Record<string, string>[];
  sheetName?: string; // xlsx 时：检测到的框架 sheet 名
  error?: string;
}
```

`parseFrameworkFile` 中 xlsx 分支改为记录 sheetName：

```typescript
      let rawData: Record<string, string>[] = [];
      let sheetName: string | undefined;

      if (fileType === 'xlsx') {
        const detected = this.detectFrameworkSheet(filePath);
        if (detected) {
          sheetName = detected.sheetName;
        }
        rawData = this.parseXlsx(filePath);
      } else if (fileType === 'csv') {
        rawData = this.parseCsv(filePath);
      } else {
        // ... 原样
      }

      // ... return 时带上 sheetName
      return {
        success: true,
        data: knowledgePoints,
        explicitCodes,
        rawRecords: rawData,
        sheetName,
      };
```

（parseXlsx 内部会再调一次 detectFrameworkSheet，单次读取文件的重复开销对单用户系统可接受；若想避免可把 parseXlsx 逻辑内联进 xlsx 分支——二选一，保持简单即可。）

- [ ] **Step 4: 运行测试确认通过 + 既有测试回归**

Run: `cd server && pnpm jest textbook-parser.service.spec.ts`
Expected: PASS（新增 3 个 + 既有全部）

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add server/src/modules/textbook/textbook-parser.service.ts server/src/modules/textbook/types/textbook.types.ts server/src/modules/textbook/textbook-parser.service.spec.ts
git commit -m "feat(server/textbook): expose framework sheet detection from parser"
```

---

### Task 2: 修复 appendXlsxRows 写路径（后端）

**Files:**
- Modify: `server/src/modules/textbook/textbook-file.service.ts:233-278`（appendXlsxRows）+ 构造函数注入 parser
- Test: `server/src/modules/textbook/textbook-file.service-append.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `textbook-file.service-append.spec.ts` 追加（沿用该文件现有的 service 实例化方式；若现有文件用 `new TextbookFileService(configService)`，需同步改为传入 parser —— 见 Step 3 说明）：

```typescript
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'append-xlsx-'));
    buildCoverFirstWorkbook();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server && pnpm jest textbook-file.service-append.spec.ts -t 多sheet`
Expected: FAIL — 追加行落到了封面（封面行数变为 3）或列位置错误

- [ ] **Step 3: 实现修复**

`textbook-file.service.ts`：
1. 顶部 import 增加 `import { TextbookParserService } from './textbook-parser.service';`（放到相对导入处）
2. 构造函数注入 parser：

```typescript
  constructor(
    private readonly configService: ConfigService,
    private readonly parserService: TextbookParserService,
  ) {
```

（module 的 providers 已同时包含两者，Nest 自动注入；`textbook-file.service.spec.ts` 等手动 `new TextbookFileService(...)` 的测试需同步补一个 `new TextbookParserService()` 参数。）

3. `appendXlsxRows` 整体替换为：

```typescript
  /**
   * 在 xlsx 框架 sheet 末尾追加新行
   * 目标 sheet 由 parser 的框架检测确定（不使用 SheetNames[0]）；
   * 列按目标 sheet 表头名映射（兼容不同列序）
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

    const detected = this.parserService.detectFrameworkSheet(filePath);
    if (!detected) {
      throw new BadRequestException(
        `未找到合规的知识点框架工作表: ${fileName}`,
      );
    }

    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[detected.sheetName];

    // 读取目标 sheet 的表头行（第一个非空行），建立 表头名 -> 列索引 映射
    const sheetData = xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
    });
    let headerRowIndex = 0;
    while (headerRowIndex < sheetData.length) {
      const row = sheetData[headerRowIndex] as unknown as string[];
      if (
        row.some(
          (cell) =>
            cell !== undefined && cell !== null && String(cell).trim() !== '',
        )
      ) {
        break;
      }
      headerRowIndex++;
    }
    const sheetHeaders = (sheetData[headerRowIndex] as unknown as string[]).map(
      (cell) => String(cell ?? '').trim(),
    );

    const columnIndexes = headers.map((header) => {
      const index = sheetHeaders.indexOf(header.trim());
      if (index === -1) {
        throw new BadRequestException(
          `框架 sheet "${detected.sheetName}" 中不存在列: ${header}`,
        );
      }
      return index;
    });

    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    const lastRow = range.e.r;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      for (let j = 0; j < row.length; j++) {
        const cellAddress = xlsx.utils.encode_cell({
          r: lastRow + 1 + i,
          c: columnIndexes[j],
        });
        const value = row[j] ?? '';
        worksheet[cellAddress] = {
          t: typeof value === 'number' ? 'n' : 's',
          v: value,
        };
      }
    }

    range.e.r = Math.max(range.e.r, lastRow + rows.length);
    worksheet['!ref'] = xlsx.utils.encode_range(range);

    xlsx.writeFile(workbook, filePath);
    this.logger.log(
      `已追加 ${rows.length} 行到 xlsx: ${filePath} (sheet: ${detected.sheetName})`,
    );
  }
```

- [ ] **Step 4: 运行测试确认通过 + 全量 textbook 测试回归**

Run: `cd server && pnpm jest textbook`
Expected: PASS（含既有 append/service/parser/controller 测试；手动实例化 FileService 的 spec 已同步改构造参数）

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add server/src/modules/textbook/textbook-file.service.ts server/src/modules/textbook/textbook-file.service-append.spec.ts server/src/modules/textbook/textbook-file.service.spec.ts
git commit -m "fix(server/textbook): write expand rows to detected framework sheet with header-name column mapping"
```

---

### Task 3: math01.xlsx 数据修复（一次性脚本）

**Files:**
- Create: `server/scripts/repair-math01-xlsx.ts`
- Modify: `iksm/math01.xlsx`（由脚本修改，先备份到 `.bak/`）
- Read: DB（Prisma 查询 2.4.x 知识点作为补行数据源）

背景（已验证）：math01.xlsx 的 `封面` sheet 行索引 15-42（`sheet_to_json(header:1)` 的 0-based 行号）被 28 行错位三角函数数据污染；`知识点框架` sheet 缺少全部 2.4.x 行；DB 中已有完整 2.4.x 知识点（expand 写入）。修复 = 封面还原 + 框架 sheet 补行 + 封面统计数字更新。

- [ ] **Step 1: 备份**

```bash
mkdir -p .bak && cp iksm/math01.xlsx ".bak/math01.xlsx.bak-$(date +%Y%m%d-%H%M%S)" && cp iksm/math02.xlsx ".bak/math02.xlsx.bak-$(date +%Y%m%d-%H%M%S)" && ls -la .bak/
```
Expected: `.bak/` 下出现两个带时间戳的备份文件

- [ ] **Step 2: 写修复脚本**

`server/scripts/repair-math01-xlsx.ts`：

```typescript
/**
 * 一次性数据修复脚本：math01.xlsx（必要时含 math02.xlsx）
 *
 * 背景：appendXlsxRows 曾硬编码写 SheetNames[0]（封面）并按位置硬编码列序，
 * 导致 2026-07-22 的三角函数扩充把 28 行错位数据写入 math01.xlsx 封面，
 * 而知识点框架 sheet 缺失全部 2.4.x 行。
 *
 * 修复：
 *   1. 封面 sheet 还原为前 15 行（索引 0-14，即被污染前的内容）
 *   2. 以 DB 中 math01 的 2.4 / 2.4.x 知识点为准，按框架 sheet 表头列序补行
 *   3. 更新封面统计（知识点总数 / 一级 / 二级 / 三级 数量、框架行数说明）
 *   4. math02.xlsx 只做检查（封面是否含知识点行），报告不修改
 *
 * 运行：cd server && npx ts-node scripts/repair-math01-xlsx.ts
 * 前置：已备份 iksm/*.xlsx 到 .bak/
 */
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const IKSM_DIR = path.join(process.cwd(), '..', 'iksm');
const COVER_KEEP_ROWS = 15; // 封面被污染前的行数（索引 0-14）

interface SheetCounts {
  total: number;
  level1: number;
  level2: number;
  level3: number;
}

function countLevels(rows: string[][]): SheetCounts {
  const counts = { total: 0, level1: 0, level2: 0, level3: 0 };
  for (const row of rows.slice(1)) {
    const code = String(row[6] ?? '').trim();
    if (!code) continue;
    counts.total++;
    if (/^\d+$/.test(code)) counts.level1++;
    else if (/^\d+\.\d+$/.test(code)) counts.level2++;
    else if (/^\d+\.\d+\.\d+/.test(code)) counts.level3++;
  }
  return counts;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    // 1. 从 DB 取 math01 的 2.4.x 知识点
    const textbook = await prisma.textbook.findUnique({
      where: { fileName: 'math01' },
    });
    if (!textbook) throw new Error('DB 中未找到 math01 教材');

    const points = await prisma.knowledgePoint.findMany({
      where: {
        textbookId: textbook.id,
        OR: [{ code: '2.4' }, { code: { startsWith: '2.4.' } }],
      },
      orderBy: { code: 'asc' },
    });
    if (points.length === 0) throw new Error('DB 中未找到 2.4.x 知识点');
    console.log(`DB 中查到 ${points.length} 个 2.4.x 知识点`);

    // 2. 修复 math01.xlsx
    const filePath = path.join(IKSM_DIR, 'math01.xlsx');
    const workbook = xlsx.readFile(filePath);
    const fwSheetName = '知识点框架';
    const fwSheet = workbook.Sheets[fwSheetName];
    if (!fwSheet) throw new Error('未找到知识点框架 sheet');

    // 2a. 框架 sheet 补行（按表头列序：一级/二级/三级/定义/特性/重要性/编号）
    const fwRows = xlsx.utils.sheet_to_json<string[]>(fwSheet, {
      header: 1,
      defval: '',
    });
    const existingCodes = new Set(
      fwRows.slice(1).map((r) => String(r[6] ?? '').trim()),
    );
    const toAdd = points.filter((p) => !existingCodes.has(p.code));
    console.log(`框架 sheet 已有 ${existingCodes.size} 个编号，需补 ${toAdd.length} 行`);
    for (const p of toAdd) {
      fwRows.push([
        p.level1 ?? '',
        p.level2 ?? '',
        p.level3 ?? '',
        p.definition ?? '',
        p.characteristics ?? '',
        p.importanceLevel ?? '',
        p.code,
      ]);
    }
    workbook.Sheets[fwSheetName] = xlsx.utils.aoa_to_sheet(fwRows);

    // 2b. 封面还原：仅保留前 COVER_KEEP_ROWS 行，并更新统计
    const counts = countLevels(fwRows);
    const coverSheet = workbook.Sheets['封面'];
    const coverRows = xlsx.utils.sheet_to_json<string[]>(coverSheet, {
      header: 1,
      defval: '',
    });
    const cleanCover = coverRows.slice(0, COVER_KEEP_ROWS).map((row) => {
      // 更新统计单元格（该行第 2 列为数值）
      if (row[0] === '知识点总数') return [row[0], String(counts.total)];
      if (row[0] === '一级节点(a)') return [row[0], String(counts.level1)];
      if (row[0] === '二级节点(a.b)') return [row[0], String(counts.level2)];
      if (row[0] === '三级知识点(a.b.c)') return [row[0], String(counts.level3)];
      if (row[0] === '知识点框架')
        return [row[0], `完整知识点数据（${fwRows.length - 1}行）`];
      return row;
    });
    workbook.Sheets['封面'] = xlsx.utils.aoa_to_sheet(cleanCover);

    xlsx.writeFile(workbook, filePath);
    console.log(
      `math01.xlsx 修复完成：框架 sheet ${fwRows.length - 1} 行，统计 ${JSON.stringify(counts)}`,
    );

    // 3. 验证
    const verify = xlsx.readFile(filePath);
    const vCover = xlsx.utils.sheet_to_json<string[]>(verify.Sheets['封面'], {
      header: 1,
      defval: '',
    });
    const vFw = xlsx.utils.sheet_to_json<string[]>(
      verify.Sheets[fwSheetName],
      { header: 1, defval: '' },
    );
    const coverPolluted = vCover.some((r) =>
      String(r[0] ?? '').includes('三角函数'),
    );
    if (coverPolluted) throw new Error('验证失败：封面仍含知识点行');
    const missing = points.filter(
      (p) => !vFw.some((r) => String(r[6] ?? '').trim() === p.code),
    );
    if (missing.length > 0)
      throw new Error(
        `验证失败：框架 sheet 缺 ${missing.map((m) => m.code).join(',')}`,
      );
    console.log('验证通过：封面无知识点行，框架 sheet 含全部 2.4.x 编号');

    // 4. math02 检查（只报告）
    const math02Path = path.join(IKSM_DIR, 'math02.xlsx');
    const wb2 = xlsx.readFile(math02Path);
    const cover2 = xlsx.utils.sheet_to_json<string[]>(
      wb2.Sheets[wb2.SheetNames[0]],
      { header: 1, defval: '' },
    );
    const polluted2 = cover2.filter(
      (r) => String(r[6] ?? '').trim() !== '' || /^\d+\.\d+/.test(String(r[0] ?? '')),
    );
    console.log(
      polluted2.length > 0
        ? `⚠️ math02.xlsx 首个 sheet 疑似含 ${polluted2.length} 行知识点数据，需人工确认`
        : 'math02.xlsx 首个 sheet 无知识点行，无需修复',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('修复失败:', err);
  process.exit(1);
});
```

（注：`KnowledgePoint` 的字段名 `level1/level2/level3/definition/characteristics/importanceLevel/code` 与 prisma schema 一致；若 schema 中字段名不同以 schema 为准调整。）

- [ ] **Step 3: 运行修复脚本**

Run: `cd server && npx ts-node scripts/repair-math01-xlsx.ts`
Expected: 输出"验证通过：封面无知识点行，框架 sheet 含全部 2.4.x 编号"；math02 报告无需修复（或提示人工确认）

- [ ] **Step 4: 独立复核（不依赖脚本自己的验证）**

```bash
cd server && node -e "
const XLSX = require('xlsx');
const wb = XLSX.readFile('../iksm/math01.xlsx');
const cover = XLSX.utils.sheet_to_json(wb.Sheets['封面'], {header:1, defval:''});
const fw = XLSX.utils.sheet_to_json(wb.Sheets['知识点框架'], {header:1, defval:''});
const n24 = fw.filter(r=>String(r[6]||'').startsWith('2.4')).length;
console.log('封面行数:', cover.length, '| 框架行数:', fw.length-1, '| 2.4.x 行数:', n24);
if (cover.length > 15) throw new Error('封面仍被污染');
if (n24 < 28) throw new Error('2.4.x 行不足');
console.log('OK');
"
```
Expected: 封面行数 15、2.4.x 行数 ≥ 28（27 个三级 + 1 个二级）、输出 OK

- [ ] **Step 5: 检查 math02 并同步 DB 的 lastModifiedAt（如需要）**

文件 mtime 已被修复脚本改变，DB 的 `lastModifiedAt` 与文件会不一致——这正是分歧提示 Tag 要展示的场景，**不需要**手动同步；若想立即一致，在教材管理页对该教材执行一次「刷新」（注意：refresh 会全量重建知识点并 cascade 删除关联学习记录，math01 目前刚扩充过 2.4，执行前确认无重要学习记录）。

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add server/scripts/repair-math01-xlsx.ts iksm/math01.xlsx
git commit -m "fix(iksm): repair math01.xlsx cover pollution and backfill 2.4 framework rows"
```

---

### Task 4: GET /textbooks/:id/framework-file 端点（后端）

**Files:**
- Modify: `server/src/modules/textbook/textbook.service.ts`（新增 getFrameworkFileContent）
- Modify: `server/src/modules/textbook/textbook.controller.ts`（新增端点）
- Test: `server/src/modules/textbook/textbook.service.spec.ts`

- [ ] **Step 1: 写失败测试**

在 `textbook.service.spec.ts` 追加 describe（沿用该文件现有的 mock 结构：`fileService.getFilePath` 已被 mock 的先例在 :117/:350/:381）：

```typescript
describe('getFrameworkFileContent', () => {
  it('xlsx 教材返回全量行、sheetName 与 mtime', async () => {
    // 构造真实临时 xlsx（封面在前），getFilePath 指向它
    const tmpFile = path.join(os.tmpdir(), `fw-${Date.now()}.xlsx`);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['封面']]), '封面');
    xlsx.utils.book_append_sheet(
      wb,
      xlsx.utils.aoa_to_sheet([
        ['一级知识点', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', '知识点编号'],
        ['集合', '集合的概念', '集合的含义', '定义', '特性', 'A', '1.1.1'],
      ]),
      '知识点框架',
    );
    xlsx.writeFile(wb, tmpFile);

    jest.spyOn(fileService, 'getFilePath').mockReturnValue(tmpFile);
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      frameworkPath: 'math01.xlsx',
      frameworkType: 'xlsx',
    });

    const result = await service.getFrameworkFileContent('t1');
    expect(result.fileName).toBe('math01.xlsx');
    expect(result.fileType).toBe('xlsx');
    expect(result.sheetName).toBe('知识点框架');
    expect(result.rows).toHaveLength(1);
    expect(result.totalRows).toBe(1);
    expect(new Date(result.lastModifiedAt).getTime()).toBeGreaterThan(0);
    fs.unlinkSync(tmpFile);
  });

  it('教材不存在抛 NotFoundException', async () => {
    prisma.textbook.findUnique.mockResolvedValue(null);
    await expect(service.getFrameworkFileContent('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('磁盘文件缺失抛 NotFoundException', async () => {
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      frameworkPath: 'ghost.xlsx',
      frameworkType: 'xlsx',
    });
    jest
      .spyOn(fileService, 'getFilePath')
      .mockReturnValue('/nonexistent/ghost.xlsx');
    await expect(service.getFrameworkFileContent('t1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('无合规框架 sheet 抛 UnprocessableEntityException', async () => {
    const tmpFile = path.join(os.tmpdir(), `bad-${Date.now()}.xlsx`);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['只有封面']]), '封面');
    xlsx.writeFile(wb, tmpFile);
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      frameworkPath: 'bad.xlsx',
      frameworkType: 'xlsx',
    });
    jest.spyOn(fileService, 'getFilePath').mockReturnValue(tmpFile);
    await expect(service.getFrameworkFileContent('t1')).rejects.toThrow(
      UnprocessableEntityException,
    );
    fs.unlinkSync(tmpFile);
  });
});
```

（文件顶部需补 import：`NotFoundException, UnprocessableEntityException` from '@nestjs/common'，`xlsx/fs/os/path`；prisma mock 的方法名以该 spec 现有写法为准。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server && pnpm jest textbook.service.spec.ts -t getFrameworkFileContent`
Expected: FAIL — `service.getFrameworkFileContent is not a function`

- [ ] **Step 3: 实现 service 方法**

`textbook.service.ts`（import 区补 `NotFoundException, UnprocessableEntityException`）新增：

```typescript
  /**
   * 读取并解析 iksm 磁盘上的框架文件（文件是真相源，不读 DB 知识点）
   * 供教材详情页文件预览使用
   */
  async getFrameworkFileContent(textbookId: string): Promise<{
    fileName: string;
    fileType: FrameworkType;
    sheetName?: string;
    rows: Record<string, string>[];
    totalRows: number;
    lastModifiedAt: Date;
  }> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });
    if (!textbook) {
      throw new NotFoundException('教材不存在');
    }

    const filePath = this.fileService.getFilePath(textbook.frameworkPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(
        `框架文件不存在: ${textbook.frameworkPath}`,
      );
    }

    const fileType = textbook.frameworkType as FrameworkType;
    const result = this.parserService.parseFrameworkFile(filePath, fileType);
    if (!result.success || !result.rawRecords) {
      throw new UnprocessableEntityException(
        result.error ?? '框架文件解析失败',
      );
    }

    const stats = fs.statSync(filePath);
    return {
      fileName: textbook.frameworkPath,
      fileType,
      sheetName: result.sheetName,
      rows: result.rawRecords,
      totalRows: result.rawRecords.length,
      lastModifiedAt: stats.mtime,
    };
  }
```

（文件顶部确认已有 `import * as fs from 'fs'`——现有代码已使用 fs.writeFileSync，import 应已存在。）

- [ ] **Step 4: 实现 controller 端点**

`textbook.controller.ts` 在 `GET /:id` 端点之后新增（注意必须放在 `GET /knowledge-points/:knowledgePointId` 之类更具体路由的匹配顺序上无冲突——`/:id/framework-file` 与 `/:id` 不冲突）：

```typescript
  @Get(':id/framework-file')
  @Roles(Role.TEACHER, Role.ADMIN)
  async getFrameworkFile(@Param('id') id: string) {
    const data = await this.textbookService.getFrameworkFileContent(id);
    return { success: true, data };
  }
```

（controller 顶部的 `@UseGuards(JwtAuthGuard, RolesGuard)` 是类级还是方法级以现有代码为准；若类级已有守卫，此处只需 `@Roles`。）

- [ ] **Step 5: 运行测试确认通过**

Run: `cd server && pnpm jest textbook.service.spec.ts -t getFrameworkFileContent`
Expected: PASS（4 个用例）

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add server/src/modules/textbook/textbook.service.ts server/src/modules/textbook/textbook.controller.ts server/src/modules/textbook/textbook.service.spec.ts
git commit -m "feat(server/textbook): add GET /textbooks/:id/framework-file endpoint"
```

---

### Task 5: GET /textbooks/:id/content-file 端点（后端）

**Files:**
- Modify: `server/src/modules/textbook/textbook.service.ts`（新增 getContentFileContent）
- Modify: `server/src/modules/textbook/textbook.controller.ts`（新增端点）
- Test: `server/src/modules/textbook/textbook.service.spec.ts`

- [ ] **Step 1: 写失败测试**

```typescript
describe('getContentFileContent', () => {
  it('返回完整 md 原文与行数', async () => {
    const tmpFile = path.join(os.tmpdir(), `content-${Date.now()}.md`);
    fs.writeFileSync(tmpFile, '## 1 集合\n\n### 1.1 集合的概念\n\n#### 知识点 1.1.1：集合的含义\n内容\n');
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      contentPath: 'math01.md',
    });
    jest.spyOn(fileService, 'getFilePath').mockReturnValue(tmpFile);

    const result = await service.getContentFileContent('t1');
    expect(result.fileName).toBe('math01.md');
    expect(result.content).toContain('集合的含义');
    expect(result.totalLines).toBe(7);
    expect(result.empty).toBe(false);
    fs.unlinkSync(tmpFile);
  });

  it('contentPath 为空返回空状态标记', async () => {
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      contentPath: null,
    });
    const result = await service.getContentFileContent('t1');
    expect(result.empty).toBe(true);
    expect(result.content).toBe('');
    expect(result.totalLines).toBe(0);
  });

  it('磁盘文件缺失抛 NotFoundException', async () => {
    prisma.textbook.findUnique.mockResolvedValue({
      id: 't1',
      contentPath: 'ghost.md',
    });
    jest
      .spyOn(fileService, 'getFilePath')
      .mockReturnValue('/nonexistent/ghost.md');
    await expect(service.getContentFileContent('t1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('教材不存在抛 NotFoundException', async () => {
    prisma.textbook.findUnique.mockResolvedValue(null);
    await expect(service.getContentFileContent('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd server && pnpm jest textbook.service.spec.ts -t getContentFileContent`
Expected: FAIL — `service.getContentFileContent is not a function`

- [ ] **Step 3: 实现 service 方法 + controller 端点**

```typescript
  /**
   * 读取 iksm 磁盘上的 md 内容文件原文（文件是真相源）
   * 供教材详情页文件预览使用
   */
  async getContentFileContent(textbookId: string): Promise<{
    fileName: string | null;
    content: string;
    totalLines: number;
    lastModifiedAt: Date | null;
    empty: boolean;
  }> {
    const textbook = await this.prisma.textbook.findUnique({
      where: { id: textbookId },
    });
    if (!textbook) {
      throw new NotFoundException('教材不存在');
    }

    if (!textbook.contentPath) {
      return {
        fileName: null,
        content: '',
        totalLines: 0,
        lastModifiedAt: null,
        empty: true,
      };
    }

    const filePath = this.fileService.getFilePath(textbook.contentPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`内容文件不存在: ${textbook.contentPath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    return {
      fileName: textbook.contentPath,
      content,
      totalLines: content.split('\n').length,
      lastModifiedAt: stats.mtime,
      empty: false,
    };
  }
```

controller：

```typescript
  @Get(':id/content-file')
  @Roles(Role.TEACHER, Role.ADMIN)
  async getContentFile(@Param('id') id: string) {
    const data = await this.textbookService.getContentFileContent(id);
    return { success: true, data };
  }
```

- [ ] **Step 4: 运行测试确认通过 + 手动冒烟**

Run: `cd server && pnpm jest textbook.service.spec.ts -t getContentFileContent`
Expected: PASS（4 个用例）

冒烟（服务运行中）：`curl -s http://localhost:3000/textbooks/<math01的id>/content-file -H "Authorization: Bearer <教师token>" | head -c 300`

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add server/src/modules/textbook/textbook.service.ts server/src/modules/textbook/textbook.controller.ts server/src/modules/textbook/textbook.service.spec.ts
git commit -m "feat(server/textbook): add GET /textbooks/:id/content-file endpoint"
```

---

### Task 6: 前端 parseXlsxPreview 镜像服务端 sheet 检测（前端）

**Files:**
- Modify: `web/src/utils/textbookFilePreview.ts:39-64`（parseXlsxPreview）
- Test: `web/src/utils/textbookFilePreview.test.ts`（不存在则创建）

- [ ] **Step 1: 写失败测试**

`web/src/utils/textbookFilePreview.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxPreview } from './textbookFilePreview'

function buildXlsxFile(sheets: Record<string, unknown[][]>, name = 'test.xlsx'): File {
  const wb = XLSX.utils.book_new()
  for (const [sheetName, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName)
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([out], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('parseXlsxPreview 多 sheet', () => {
  it('封面在前时选中框架 sheet 并 trim 表头', async () => {
    const file = buildXlsxFile({
      封面: [['高中数学必修一 知识点框架'], ['知识点总数', '2']],
      知识点框架: [
        ['一级知识点 ', '二级知识点', '三级知识点', '定义', '特性', '重要性级别', ' 知识点编号'],
        ['集合', '集合的概念', '集合的含义', '研究对象的总体', '确定性', 'A', '1.1.1'],
        ['集合', '集合的概念', '集合的表示', '列举法', '互异性', 'B', '1.1.2'],
      ],
    })
    const rows = await parseXlsxPreview(file)
    expect(rows).toHaveLength(2)
    expect(rows[0]['知识点编号']).toBe('1.1.1')
    expect(rows[0]['一级知识点']).toBe('集合')
  })

  it('无合规框架 sheet 时返回空数组', async () => {
    const file = buildXlsxFile({ 封面: [['只有封面'], ['没有框架']] })
    const rows = await parseXlsxPreview(file)
    expect(rows).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && pnpm vitest run src/utils/textbookFilePreview.test.ts`
Expected: FAIL — 第一个用例返回封面解析结果（rows[0]['知识点编号'] 为 undefined）

- [ ] **Step 3: 实现镜像检测**

`textbookFilePreview.ts`：在 `CODE_HEADERS` 常量区下方新增框架识别逻辑并替换 `parseXlsxPreview`：

```typescript
const CODE_PATTERN = /^\d+(\.\d+){2,}/

/**
 * 判断记录集是否为合规知识点框架（与服务端 isValidKnowledgeFramework 镜像）：
 * 任一记录的编号列匹配 a.b.c 模式，或同时存在一级与三级知识点列
 */
function isValidFrameworkRecords(records: XlsxPreviewRow[]): boolean {
  if (records.length === 0) {
    return false
  }
  const hasCode = records.some(record => {
    const code = getRecordCode(record)
    return code !== undefined && CODE_PATTERN.test(code)
  })
  if (hasCode) {
    return true
  }
  const hasLevel1 = records.some(r => getRecordLevel1(r) !== undefined)
  const hasLevel3 = records.some(r => getRecordLevel3(r) !== undefined)
  return hasLevel1 && hasLevel3
}

/**
 * worksheet → 记录数组（与服务端 sheetToRecords 镜像）：
 * 第一个非空行作为表头（trim），空表头列跳过
 */
function sheetToRecords(worksheet: XLSX.WorkSheet): XlsxPreviewRow[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })
  if (rawRows.length === 0) {
    return []
  }

  let headerRowIndex = 0
  while (headerRowIndex < rawRows.length) {
    const row = rawRows[headerRowIndex]
    if (row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
      break
    }
    headerRowIndex++
  }
  if (headerRowIndex >= rawRows.length) {
    return []
  }

  const headers = rawRows[headerRowIndex].map(cell => String(cell ?? '').trim())
  return rawRows.slice(headerRowIndex + 1).map(row => {
    const record: XlsxPreviewRow = {}
    headers.forEach((header, index) => {
      if (header !== '') {
        const value = row[index] as string | number | boolean | null | undefined
        record[header] = value === undefined || value === null ? '' : String(value)
      }
    })
    return record
  })
}

/**
 * 检测 workbook 中的框架 sheet（与服务端 detectFrameworkSheet 镜像）
 */
function detectFrameworkSheet(workbook: XLSX.WorkBook): XlsxPreviewRow[] | null {
  for (const sheetName of workbook.SheetNames) {
    const records = sheetToRecords(workbook.Sheets[sheetName])
    if (isValidFrameworkRecords(records)) {
      return records
    }
  }
  return null
}

export async function parseXlsxPreview(file: File, limit = 100): Promise<XlsxPreviewRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  const workbook = XLSX.read(data, { type: 'array' })

  const records = detectFrameworkSheet(workbook)
  if (!records) {
    return []
  }
  return records.slice(0, limit)
}
```

- [ ] **Step 4: 运行测试确认通过 + 既有测试回归**

Run: `cd web && pnpm vitest run src/utils/`
Expected: PASS（新增 2 个 + 既有 utils 测试）

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add web/src/utils/textbookFilePreview.ts web/src/utils/textbookFilePreview.test.ts
git commit -m "fix(web/textbook): mirror server framework sheet detection in xlsx preview"
```

---

### Task 7: 组件迁移到共享目录 + props 扩展（前端）

**Files:**
- Move: `web/src/pages/TextbookDetail/components/FrameworkPreview.tsx` → `web/src/components/textbook-preview/FrameworkPreview.tsx`
- Move: `web/src/pages/TextbookDetail/components/MdPreview.tsx` → `web/src/components/textbook-preview/MdPreview.tsx`
- Move: 对应 `__tests__` 下的两个测试文件（如存在于 `pages/TextbookDetail/components/__tests__/`）
- Create: `web/src/components/textbook-preview/index.ts`
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`（import 更新）

- [ ] **Step 1: git mv 迁移（含测试文件）**

```bash
mkdir -p web/src/components/textbook-preview
git mv web/src/pages/TextbookDetail/components/FrameworkPreview.tsx web/src/components/textbook-preview/FrameworkPreview.tsx
git mv web/src/pages/TextbookDetail/components/MdPreview.tsx web/src/components/textbook-preview/MdPreview.tsx
# 若存在测试文件（先 ls 确认路径）：
ls web/src/pages/TextbookDetail/components/__tests__/
git mv web/src/pages/TextbookDetail/components/__tests__/FrameworkPreview.test.tsx web/src/components/textbook-preview/FrameworkPreview.test.tsx
git mv web/src/pages/TextbookDetail/components/__tests__/MdPreview.test.tsx web/src/components/textbook-preview/MdPreview.test.tsx
```

- [ ] **Step 2: 修正被移动文件的内部 import 深度**

两个组件原来在 `pages/TextbookDetail/components/`（深度 3，`../../../` 到 src），新位置 `components/textbook-preview/`（深度 2，`../../` 到 src）。修改：

`FrameworkPreview.tsx` 顶部：
```typescript
import type { ValidationIssue } from '../../types/textbook.types'
import {
  CODE_HEADERS,
  getRecordCode,
  type XlsxPreviewRow,
} from '../../utils/textbookFilePreview'
```

`MdPreview.tsx` 顶部：
```typescript
import type { ValidationIssue } from '../../types/textbook.types'
```

测试文件内的组件 import 改为同目录相对引用（`./FrameworkPreview`、`./MdPreview`），工具类 import 同步调浅一级。

- [ ] **Step 3: props 扩展（emptyDescription + highlightedCodes + rows 依赖）**

`FrameworkPreview.tsx` 的 Props 与 highlight 逻辑改为：

```typescript
interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[]
  errors: ValidationIssue[]
  highlightedCodes?: string[]
  emptyDescription?: string
  onRowClick?: (code: string) => void
}

export const FrameworkPreview: React.FC<FrameworkPreviewProps> = ({
  rows,
  errors,
  highlightedCodes,
  emptyDescription = '选择文件后在此处预览',
  onRowClick,
}) => {
  // ...
  useEffect(() => {
    if (!highlightedCodes || highlightedCodes.length === 0 || !tableRef.current) {
      return
    }
    const element = tableRef.current.querySelector(
      `[data-row-key="framework-row-${highlightedCodes[0]}"]`
    )
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedCodes, rows]) // rows 必须在依赖中：数据刷新后行集变化才重新触发滚动

  if (rows.length === 0) {
    return <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }
  // rowClassName 中：
  //   if (code && highlightedCodes?.includes(code)) {
  //     classes.push('framework-row-highlighted')
  //   }
```

`MdPreview.tsx` 的 Props：

```typescript
interface MdPreviewProps {
  content: string
  errors: ValidationIssue[]
  highlightedLine?: number
  emptyDescription?: string
}
// 解构加 emptyDescription = '选择文件后在此处预览'
// 两个 <Empty description=...> 处改用该 prop
```

（`highlightedCode` 旧 prop 直接删除——唯二调用方是本任务修改的弹窗和 Task 10 的详情页，无其他引用，改前先 `grep -r "highlightedCode" web/src` 确认。）

- [ ] **Step 4: 桶导出 + 弹窗 import 更新**

`web/src/components/textbook-preview/index.ts`：

```typescript
export { FrameworkPreview } from './FrameworkPreview'
export { MdPreview } from './MdPreview'
```

`ExpandKnowledgePointsModal.tsx`：把
```typescript
import { FrameworkPreview } from './FrameworkPreview'
import { MdPreview } from './MdPreview'
```
改为
```typescript
import { FrameworkPreview, MdPreview } from '../../../components/textbook-preview'
```

弹窗内 `highlightedCode={highlightedFrameworkCode}` 改为 `highlightedCodes={highlightedFrameworkCode ? [highlightedFrameworkCode] : []}`（grep 弹窗内 `highlightedCode` 出现处逐一替换）。

- [ ] **Step 5: 运行既有测试确认回归为零**

Run: `cd web && pnpm vitest run src/components/textbook-preview src/pages/TextbookDetail`
Expected: PASS（移动后的组件测试 + 弹窗测试全绿；若有断言旧空态文案或单值 prop 的测试，按新 props 更新断言——行为等价）

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add web/src/components/textbook-preview web/src/pages/TextbookDetail
git commit -m "refactor(web/textbook): move preview components to shared textbook-preview with array highlight props"
```

---

### Task 8: 抽取 mdLineLocator 纯函数 + 弹窗接入（前端）

**Files:**
- Create: `web/src/utils/mdLineLocator.ts`
- Test: `web/src/utils/mdLineLocator.test.ts`
- Modify: `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx:327-345`（删除内联实现，改调用）

- [ ] **Step 1: 写失败测试**

`web/src/utils/mdLineLocator.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { findMdLineByCode } from './mdLineLocator'

const MD = [
  '# 数学必修一',           // 1
  '## 1 集合',              // 2
  '### 1.1 集合的概念',      // 3
  '#### 知识点 1.1.1：集合的含义', // 4
  '内容一',                  // 5
  '#### 知识点 1.1.10：集合的其他', // 6
  '内容十',                  // 7
  '### 1.10 另一个二级',      // 8
  '#### 2.4.1 任意角的概念',  // 9
  '内容',                    // 10
].join('\n')

describe('findMdLineByCode', () => {
  it('精确匹配三级标题（含 知识点 前缀与全角冒号）', () => {
    expect(findMdLineByCode(MD, '1.1.1')).toBe(4)
  })

  it('编号 1.1.1 不误匹配 1.1.10（负向前瞻）', () => {
    expect(findMdLineByCode(MD, '1.1.1')).not.toBe(6)
  })

  it('编号 1.1 精确命中二级标题而非 1.10', () => {
    expect(findMdLineByCode(MD, '1.1')).toBe(3)
  })

  it('一级编号退化匹配到后代编号的第一行', () => {
    expect(findMdLineByCode(MD, '2.4')).toBe(9)
  })

  it('无匹配返回 undefined', () => {
    expect(findMdLineByCode(MD, '9.9.9')).toBeUndefined()
  })

  it('空文本返回 undefined', () => {
    expect(findMdLineByCode('', '1.1.1')).toBeUndefined()
  })

  it('无 # 标题前缀的行不匹配', () => {
    expect(findMdLineByCode('1.1.1 不是标题', '1.1.1')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && pnpm vitest run src/utils/mdLineLocator.test.ts`
Expected: FAIL — `Cannot find module './mdLineLocator'`

- [ ] **Step 3: 实现纯函数**

`web/src/utils/mdLineLocator.ts`：

```typescript
/**
 * 在 md 文本中查找知识点编号对应的标题行号（1-based）
 * 优先精确匹配标题行（##/###/####，可带"知识点 "前缀），
 * 未命中时退化到其后代编号的第一行（如 2.4 → 2.4.1）。
 * 负向前瞻 (?![\d.]) 防止 1.1 误匹配 1.10。
 *
 * 纯函数：与 React 无关，供扩充弹窗与教材详情页共用。
 * （原样搬迁自 ExpandKnowledgePointsModal 内联实现）
 */
export function findMdLineByCode(mdText: string, code: string): number | undefined {
  if (!mdText) {
    return undefined
  }
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lines = mdText.split('\n')

  const exactPattern = new RegExp(`^#{2,4}\\s+(?:知识点\\s+)?${escaped}(?![\\d.])`)
  for (let i = 0; i < lines.length; i++) {
    if (exactPattern.test(lines[i])) {
      return i + 1
    }
  }

  const childPattern = new RegExp(`^#{2,4}\\s+(?:知识点\\s+)?${escaped}\\.\\d`)
  for (let i = 0; i < lines.length; i++) {
    if (childPattern.test(lines[i])) {
      return i + 1
    }
  }

  return undefined
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && pnpm vitest run src/utils/mdLineLocator.test.ts`
Expected: PASS（7 个用例）

- [ ] **Step 5: 弹窗改为调用共享函数**

`ExpandKnowledgePointsModal.tsx`：
1. 顶部 import 增加：`import { findMdLineByCode } from '../../../utils/mdLineLocator'`
2. 删除 327-345 行的内联 `findMdLineByCode` useCallback 定义
3. 原调用处改为包一层（保留 mdPreview 闭包）：

```typescript
  // 在 md 内容中查找知识点编号对应的行号（1-based），共享实现见 utils/mdLineLocator
  const locateMdLine = useCallback(
    (code: string): number | undefined => findMdLineByCode(mdPreview, code),
    [mdPreview]
  )
```

4. `handleErrorClick` 与 `handleFrameworkRowClick` 内的 `findMdLineByCode(...)` 调用改为 `locateMdLine(...)`，依赖数组里的 `findMdLineByCode` 改为 `locateMdLine`

- [ ] **Step 6: 弹窗回归测试 + Commit（需用户确认）**

Run: `cd web && pnpm vitest run src/pages/TextbookDetail`
Expected: PASS

```bash
git add web/src/utils/mdLineLocator.ts web/src/utils/mdLineLocator.test.ts web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx
git commit -m "refactor(web/textbook): extract findMdLineByCode to shared mdLineLocator util"
```

---

### Task 9: 前端 API 方法与 useTextbookDetail 双文件获取（前端）

**Files:**
- Modify: `web/src/types/textbook.types.ts`（新增 2 个响应类型）
- Modify: `web/src/services/textbook.service.ts`（新增 2 个 API 方法）
- Modify: `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`
- Test: `web/src/services/__tests__/textbook.service.test.ts`（如已存在则追加）

- [ ] **Step 1: 类型定义**

`web/src/types/textbook.types.ts` 末尾追加：

```typescript
/** GET /textbooks/:id/framework-file 响应 */
export interface FrameworkFileContent {
  fileName: string
  fileType: 'xlsx' | 'csv'
  sheetName?: string
  rows: import('../utils/textbookFilePreview').XlsxPreviewRow[]
  totalRows: number
  lastModifiedAt: string
}

/** GET /textbooks/:id/content-file 响应 */
export interface ContentFileContent {
  fileName: string | null
  content: string
  totalLines: number
  lastModifiedAt: string | null
  empty: boolean
}
```

- [ ] **Step 2: API 方法**

`web/src/services/textbook.service.ts` 末尾追加：

```typescript
/**
 * 获取教材框架文件（xlsx/csv）解析内容
 */
export const getFrameworkFile = async (id: string): Promise<FrameworkFileContent> => {
  const response = await textbookApi.get(`/${id}/framework-file`)
  return response.data.data
}

/**
 * 获取教材内容文件（md）原文
 */
export const getContentFile = async (id: string): Promise<ContentFileContent> => {
  const response = await textbookApi.get(`/${id}/content-file`)
  return response.data.data
}
```

（import 区把 `FrameworkFileContent, ContentFileContent` 加入 `../types/textbook.types` 的类型导入。）

- [ ] **Step 3: hook 扩展**

`useTextbookDetail.ts`：
1. import 增加 `getFrameworkFile, getContentFile` 与两个新类型
2. 接口 `UseTextbookDetailReturn` 增加：

```typescript
  frameworkFile: FrameworkFileContent | null
  contentFile: ContentFileContent | null
  filesLoading: boolean
  filesError: string | null
  fetchFiles: () => Promise<void>
```

3. hook 内新增状态与获取函数（独立于 fetchTextbook，互不影响三态）：

```typescript
  const [frameworkFile, setFrameworkFile] = useState<FrameworkFileContent | null>(null)
  const [contentFile, setContentFile] = useState<ContentFileContent | null>(null)
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true)
    setFilesError(null)
    try {
      const [framework, content] = await Promise.all([
        getFrameworkFile(id),
        getContentFile(id),
      ])
      setFrameworkFile(framework)
      setContentFile(content)
    } catch (err) {
      const message = extractErrorMessage(err, '加载教材文件失败')
      setFilesError(message)
    } finally {
      setFilesLoading(false)
    }
  }, [id])
```

4. 现有 `useEffect(() => { void fetchTextbook() }, [fetchTextbook])` 下方加：
```typescript
  useEffect(() => {
    void fetchFiles()
  }, [fetchFiles])
```

5. return 对象增加 `frameworkFile, contentFile, filesLoading, filesError, fetchFiles`

- [ ] **Step 4: 类型检查 + 既有测试回归**

Run: `cd web && pnpm typecheck && pnpm vitest run src/services src/pages/TextbookDetail`
Expected: tsc 无错误；测试 PASS

- [ ] **Step 5: Commit（需用户确认）**

```bash
git add web/src/types/textbook.types.ts web/src/services/textbook.service.ts web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts
git commit -m "feat(web/textbook): add file preview API methods and dual-file fetching in useTextbookDetail"
```

---

### Task 10: 详情页双栏改造（前端，核心页面）

**Files:**
- Modify: `web/src/pages/TextbookDetail/TextbookDetailPage.tsx`（整体重写主体）
- Test: `web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`（不存在则创建；已存在则重写用例）

- [ ] **Step 1: 写失败测试**

`web/src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`（mock 风格参照 `pages/TextbookDetail` 下既有测试；以下是关键用例，mock 数据按其工具函数惯例调整）：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TextbookDetailPage from '../TextbookDetailPage'

const mockFetchFiles = vi.fn()
const mockHookReturn = {
  textbook: {
    id: 't1',
    name: '高中数学必修一',
    fileName: 'math01',
    frameworkType: 'xlsx',
    hasContent: true,
    knowledgePointCount: 83,
    lastModifiedAt: '2026-07-20T10:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  knowledgePoints: [],
  loading: false,
  error: null,
  expanding: false,
  expandError: null,
  validating: false,
  validationResult: null,
  validationError: null,
  frameworkFile: {
    fileName: 'math01.xlsx',
    fileType: 'xlsx' as const,
    sheetName: '知识点框架',
    rows: [
      { 一级知识点: '集合', 二级知识点: '集合的概念', 三级知识点: '集合的含义', 定义: '总体', 特性: '确定性', 重要性级别: 'A', 知识点编号: '1.1.1' },
    ],
    totalRows: 1,
    lastModifiedAt: '2026-07-22T10:00:00.000Z',
  },
  contentFile: {
    fileName: 'math01.md',
    content: '## 1 集合\n\n### 1.1 集合的概念\n\n#### 知识点 1.1.1：集合的含义\n内容\n',
    totalLines: 7,
    lastModifiedAt: '2026-07-22T10:00:00.000Z',
    empty: false,
  },
  filesLoading: false,
  filesError: null,
  fetchTextbook: vi.fn(),
  fetchFiles: mockFetchFiles,
  expand: vi.fn(),
  validate: vi.fn(),
  resetValidation: vi.fn(),
}

vi.mock('../hooks/useTextbookDetail', () => ({
  useTextbookDetail: () => mockHookReturn,
}))

// scrollIntoView 在 jsdom 中不存在
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/teacher/textbooks/t1']}>
      <Routes>
        <Route path="/teacher/textbooks/:id" element={<TextbookDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('TextbookDetailPage 文件预览', () => {
  it('双栏展示框架行与 md 行号视图', () => {
    renderPage()
    expect(screen.getByText('1.1.1')).toBeInTheDocument() // 框架行
    expect(screen.getByText(/集合的含义/)).toBeInTheDocument() // md 内容
  })

  it('点击框架行后 md 对应行高亮并触发滚动', async () => {
    renderPage()
    fireEvent.click(screen.getByText('1.1.1'))
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('文件 mtime 与 DB lastModifiedAt 不一致时显示分歧提示', () => {
    renderPage()
    expect(screen.getByText(/文件与数据库不一致/)).toBeInTheDocument()
  })

  it('点击重新加载重新拉取文件', () => {
    renderPage()
    fireEvent.click(screen.getByText('重新加载'))
    expect(mockFetchFiles).toHaveBeenCalled()
  })

  it('无内容文件时右栏显示空态', () => {
    mockHookReturn.contentFile = {
      fileName: null, content: '', totalLines: 0, lastModifiedAt: null, empty: true,
    }
    renderPage()
    expect(screen.getByText(/暂无内容文件/)).toBeInTheDocument()
  })

  it('文件加载失败显示错误态而非白屏', () => {
    mockHookReturn.filesError = '框架文件不存在: math01.xlsx'
    renderPage()
    expect(screen.getByText(/math01.xlsx/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && pnpm vitest run src/pages/TextbookDetail/__tests__/TextbookDetailPage.test.tsx`
Expected: FAIL — 当前页面无文件预览、无分歧提示、无重新加载按钮

- [ ] **Step 3: 重写 TextbookDetailPage**

```tsx
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button, Space, Typography, Descriptions, Spin, Alert, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { Allotment } from 'allotment'
import { useTextbookDetail } from './hooks/useTextbookDetail'
import { ExpandKnowledgePointsModal } from './components/ExpandKnowledgePointsModal'
import { FrameworkPreview, MdPreview } from '../../components/textbook-preview'
import { findMdLineByCode } from '../../utils/mdLineLocator'

const { Title } = Typography
const NARROW_BREAKPOINT = 768

const TextbookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(() => searchParams.get('expand') === '1')
  const [highlightedCodes, setHighlightedCodes] = useState<string[]>([])
  const [highlightedMdLine, setHighlightedMdLine] = useState<number | undefined>(undefined)
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < NARROW_BREAKPOINT)
  const {
    textbook,
    loading,
    error,
    expanding,
    expandError,
    validating,
    validationResult,
    validationError,
    frameworkFile,
    contentFile,
    filesLoading,
    filesError,
    expand,
    fetchTextbook,
    fetchFiles,
    validate,
    resetValidation,
  } = useTextbookDetail(id || '')

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 扩充成功高亮：3 秒后自动取消（移植自原 newPointCodes 逻辑）
  useEffect(() => {
    if (highlightedCodes.length === 0) {
      return
    }
    const timer = setTimeout(() => setHighlightedCodes([]), 3000)
    return () => clearTimeout(timer)
  }, [highlightedCodes])

  const handleFrameworkRowClick = useCallback(
    (code: string) => {
      if (!contentFile?.content) {
        return
      }
      const line = findMdLineByCode(contentFile.content, code)
      if (line !== undefined) {
        setHighlightedMdLine(line)
      }
    },
    [contentFile]
  )

  const handleExpand = async (framework: File, content: File) => {
    const result = await expand(framework, content)
    if (result?.success) {
      // 扩充写入了磁盘文件：重新拉取文件预览（不依赖 DB 刷新）
      await Promise.all([fetchTextbook(), fetchFiles()])
      if (result.data?.addedCodes.length) {
        setHighlightedCodes(result.data.addedCodes)
      }
      setModalOpen(false)
    }
  }

  const handleValidate = async (framework: File, content: File) => {
    await validate(framework, content)
  }

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
            <Button onClick={() => void navigate('/teacher/textbooks')}>返回列表</Button>
          }
        />
      </div>
    )
  }

  // 文件 mtime 与 DB lastModifiedAt 分歧检测（容忍 1 秒内的取整差异）
  const dbTime = new Date(textbook.lastModifiedAt).getTime()
  const fileTime = frameworkFile?.lastModifiedAt
    ? new Date(frameworkFile.lastModifiedAt).getTime()
    : null
  const diverged = fileTime !== null && Math.abs(fileTime - dbTime) > 1000

  const frameworkPane = filesError ? (
    <Alert message="文件加载失败" description={filesError} type="error" showIcon />
  ) : filesLoading && !frameworkFile ? (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <Spin />
    </div>
  ) : (
    <FrameworkPreview
      rows={frameworkFile?.rows ?? []}
      errors={[]}
      highlightedCodes={highlightedCodes}
      emptyDescription="暂无框架文件内容"
      onRowClick={handleFrameworkRowClick}
    />
  )

  const mdPane = contentFile?.empty ? (
    <FrameworkPreview rows={[]} errors={[]} emptyDescription="暂无内容文件" />
  ) : filesError ? (
    <Alert message="文件加载失败" description={filesError} type="error" showIcon />
  ) : filesLoading && !contentFile ? (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <Spin />
    </div>
  ) : (
    <MdPreview
      content={contentFile?.content ?? ''}
      errors={[]}
      highlightedLine={highlightedMdLine}
      emptyDescription="暂无内容文件"
    />
  )

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => void navigate('/teacher/textbooks')}>
              返回
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              {textbook.name}
            </Title>
            {diverged && (
              <Tag icon={<WarningOutlined />} color="warning">
                文件与数据库不一致
              </Tag>
            )}
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchFiles()}>
              重新加载
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              扩充知识点
            </Button>
          </Space>
        </Space>

        <Card title="教材信息">
          <Descriptions bordered size="small">
            <Descriptions.Item label="文件名">{textbook.fileName}</Descriptions.Item>
            <Descriptions.Item label="框架类型">
              {textbook.frameworkType.toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="知识点数量">{textbook.knowledgePointCount}</Descriptions.Item>
            <Descriptions.Item label="内容文件">
              {textbook.hasContent ? <Tag color="success">已上传</Tag> : <Tag>未上传</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="最后修改">
              {new Date(textbook.lastModifiedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {frameworkFile?.sheetName && (
              <Descriptions.Item label="框架工作表">{frameworkFile.sheetName}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card
          title={`教材文件预览（${frameworkFile?.fileName ?? '…'} / ${contentFile?.fileName ?? '…'}）`}
          styles={{ body: { height: 480, padding: 12 } }}
        >
          {isNarrow ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ height: 300, overflow: 'auto' }}>{frameworkPane}</div>
              <div style={{ height: 300, overflow: 'auto' }}>{mdPane}</div>
            </Space>
          ) : (
            <Allotment proportionalLayout={false} style={{ height: '100%' }}>
              <Allotment.Pane minSize={280}>{frameworkPane}</Allotment.Pane>
              <Allotment.Pane minSize={320}>{mdPane}</Allotment.Pane>
            </Allotment>
          )}
        </Card>
      </Space>

      <ExpandKnowledgePointsModal
        key={modalOpen ? 'open' : 'closed'}
        open={modalOpen}
        textbookId={id || ''}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleExpand}
        onValidate={handleValidate}
        onResetValidation={resetValidation}
        loading={expanding}
        validating={validating}
        error={expandError}
        validationResult={validationResult}
        validationError={validationError}
      />
    </div>
  )
}

export default TextbookDetailPage
```

注意：
- 删除了原 DB 知识点 `Table` 卡片与 `knowledgePoints`、`columns`、`KnowledgePoint` import、`newPointCodes` state（其高亮机制已被文件预览高亮替代）；hook 返回的 `knowledgePoints` 字段保留（LearningPage 等不使用此 hook，仅本页面——确认无其他引用后也可从 hook 移除，但保留更安全）
- `errors={[]}`：本期预览不做校验，ValidationIssue 列表传空（第三期校验复用同组件）
- 若项目 antd 版本 `Card` 不支持 `styles` prop，改用 `bodyStyle={{ height: 480, padding: 12 }}`

- [ ] **Step 4: 运行测试确认通过 + 全量前端测试回归**

Run: `cd web && pnpm vitest run src/pages/TextbookDetail && pnpm typecheck`
Expected: 页面测试 PASS；tsc 无错误

- [ ] **Step 5: 浏览器手动冒烟**

前后端运行中，教师账号登录后访问 `http://localhost:5173/teacher/textbooks/<math01-id>`：
- 左栏显示 math01.xlsx 框架行（含 2.4.x），右栏显示 math01.md 行号视图
- 点击 `2.4.1` → 右侧滚动到 `#### 知识点 2.4.1：任意角的概念`（或对应标题）并高亮
- 点击「重新加载」→ 双栏刷新
- 窗口缩窄 <768px → 双栏变垂直堆叠

- [ ] **Step 6: Commit（需用户确认）**

```bash
git add web/src/pages/TextbookDetail web/src/pages/TextbookDetail/__tests__
git commit -m "feat(web/textbook): rebuild detail page with dual-pane iksm file preview and md locate"
```

---

### Task 11: 扩充闭环端到端验证（前端 + 后端联通）

**Files:**
- 无新代码（验证任务；若发现问题回到对应 Task 修复）

- [ ] **Step 1: 准备扩充测试文件**

用 Task 1 的构造方法生成一个小型扩充文件对（2 个新编号知识点，如 `2.4.99` 测试用编号），或在弹窗中直接上传一个手工准备的 xlsx + md。**注意：会用真实数据，验证后需清理（删除 DB 测试知识点 + 还原 iksm 文件）——建议先在 math02 上做，或用 `.bak/` 备份还原。**

- [ ] **Step 2: 执行扩充并验证闭环**

1. 详情页点击「扩充知识点」→ 上传文件 → 校验通过 → 确认扩充
2. 弹窗关闭后：双栏自动刷新（能看到新行出现，无需手动重新加载）
3. 新增行高亮显示约 3 秒后取消
4. 真实浏览器中确认页面滚动定位到新增行（jsdom 测不到，必须肉眼验证）
5. 用 node 脚本验证 xlsx：新增行在 `知识点框架` sheet（不在封面）且编号列有值：

```bash
cd server && node -e "
const XLSX = require('xlsx');
const wb = XLSX.readFile('../iksm/math02.xlsx');
const cover = XLSX.utils.sheet_to_json(wb.Sheets['封面'], {header:1, defval:''});
const fw = XLSX.utils.sheet_to_json(wb.Sheets['知识点框架'], {header:1, defval:''});
const has99 = fw.some(r=>String(r[6]||'').includes('99'));
const coverClean = !cover.some(r=>String(r[6]||'').trim() !== '');
console.log('框架 sheet 含新编号:', has99, '| 封面干净:', coverClean);
"
```

- [ ] **Step 3: 清理测试数据**

还原备份文件，DB 中删除测试知识点（或在 Prisma Studio / psql 中 `DELETE FROM knowledge_points WHERE code LIKE '%99%'`）。

---

### Task 12: 全量验证与收尾

- [ ] **Step 1: 静态检查**

Run: `pnpm typecheck && pnpm lint`
Expected: 前后端 tsc 无错误、lint 通过

- [ ] **Step 2: 全量测试**

Run: `cd server && pnpm test` 与 `cd web && pnpm vitest run`
Expected: 全部 PASS（既有扩充弹窗回归 + 新增用例）

- [ ] **Step 3: 手动验证清单**（对照 `~/.gstack/projects/cursor-math-openspec/zhenggsh-master-eng-review-test-plan-20260722-2300.md`）

- [ ] math01 全闭环：预览 → 点击 2.4.1 定位 → 扩充 → 自动刷新高亮
- [ ] math02 预览与定位
- [ ] 无 md 教材：右栏空态
- [ ] 窄屏（<768px）：垂直堆叠
- [ ] 外部编辑器改动 math01.md 后点「重新加载」：预览更新、DB 不变、分歧 Tag 出现
- [ ] 2400 行 md 滚动流畅度实测（卡顿则记录到 Open Question，本期不阻塞）
- [ ] 扩充弹窗三步流程回归（上传 → 校验 → 确认、草稿、校验报告导出）

- [ ] **Step 4: OpenSpec 状态勾选与提交**

将 `openspec/changes/add-textbook-file-preview/tasks.md` 中已完成的条目勾选为 `- [x]`，然后（需用户确认）：

```bash
git add openspec/changes/add-textbook-file-preview docs/superpowers/plans TODOS.md
git commit -m "feat(textbook): add iksm file preview with linked navigation on detail page"
```

归档变更留待用户确认后执行（`openspec-archive-change`）。

---

## Self-Review 记录

**Spec coverage：** specs/textbook-file-preview 的 7 个需求 → Task 4/5（两端点，含 404/422/empty/403）、Task 7+10（双栏/空态/窄屏）、Task 10（定位/重新加载/分歧 Tag）、Task 11（扩充联动）；textbook-knowledge-point-expansion 的 2 个 MODIFIED → Task 10（详情页布局）+ Task 2/3（xlsx 写路径与数据修复）+ Task 6（弹窗解析一致）。无遗漏。

**Placeholder scan：** 仅两处"以现有代码为准"类措辞（spec 文件的 mock 变量名、Card styles/bodyStyle prop）——这些是执行时的环境适配点，非逻辑占位。

**Type consistency：** `detectFrameworkSheet`（后端 parser / 前端镜像同名）、`getFrameworkFileContent` / `getContentFileContent`（service）↔ `getFrameworkFile` / `getContentFile`（前端 API）↔ `frameworkFile` / `contentFile`（hook state）、`highlightedCodes: string[]`（组件 prop）↔ `setHighlightedCodes`（页面）、`findMdLineByCode(mdText, code)` 签名前后一致。
