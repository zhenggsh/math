/**
 * 一次性数据修复脚本：math01.xlsx（必要时含 math02.xlsx）
 *
 * 背景：appendXlsxRows 曾硬编码写 SheetNames[0]（封面）并按位置硬编码列序，
 * 导致 2026-07-22 的三角函数扩充把 28 行错位数据写入 math01.xlsx 封面，
 * 而知识点框架 sheet 缺失全部 2.4.x 行。（代码已在 Task 2 修复，本脚本修数据。）
 *
 * 修复：
 *   1. 封面 sheet 还原为前 15 行（索引 0-14，即被污染前的内容）
 *   2. 以 DB 中 math01 的 2.4 / 2.4.x 知识点为准，按框架 sheet 表头列序补行，
 *      并按编号插入到正确位置（2.3.x 之后、3.x 之前，而非简单 append）
 *   3. 更新封面统计（知识点总数 / 一级 / 二级 / 三级 数量、框架行数说明）
 *   4. math02.xlsx 只做检查（封面是否含知识点行），报告不修改
 *
 * 运行：cd server && npx ts-node scripts/repair-math01-xlsx.ts
 * 前置：已备份 iksm/*.xlsx 到 .bak/
 *
 * 环境说明：server/node_modules/dotenv 是指向 /cygdrive/... 的 MSYS 符号链接，
 * Windows 原生 Node 无法解析，故此处手动加载 server/.env（等价 dotenv/config）。
 */
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// 手动加载 .env（standalone ts-node 脚本不会自动加载；dotenv 符号链接在本环境不可用）
(function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
})();

const IKSM_DIR = path.join(process.cwd(), '..', 'iksm');
const COVER_KEEP_ROWS = 15; // 封面被污染前的行数（索引 0-14）

interface SheetCounts {
  total: number;
  level1: number;
  level2: number;
  level3: number;
}

/** 编号数值化比较：2.4.9 < 2.4.10（字符串序会反过来） */
function compareCode(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
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
    });
    if (points.length === 0) throw new Error('DB 中未找到 2.4.x 知识点');
    points.sort((a, b) => compareCode(a.code, b.code));
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
    console.log(
      `框架 sheet 已有 ${existingCodes.size} 个编号，需补 ${toAdd.length} 行`,
    );

    // DB 中 2.4（二级节点）的 level1/level2 误存为编号 "2"/"2.4"，
    // 从三级子行推断真实名称；二级行的三级列按现有约定写 "—"
    const child = points.find((p) => p.code.startsWith('2.4.') && p.level1);
    const parentL1 = child?.level1 ?? '';
    const parentL2 = child?.level2 ?? '';
    const newRows: string[][] = toAdd.map((p) => {
      const isLevel2 = /^\d+\.\d+$/.test(p.code);
      const badCodeAsName = isLevel2 && /^\d+(\.\d+)?$/.test(p.level1);
      return [
        badCodeAsName ? parentL1 : (p.level1 ?? ''),
        badCodeAsName ? parentL2 : (p.level2 ?? ''),
        isLevel2 ? '—' : (p.level3 ?? ''),
        p.definition ?? '',
        p.characteristics ?? '',
        p.importanceLevel ?? '',
        p.code,
      ];
    });

    // 按编号插入到正确位置（2.4.x 应位于 2.3.x 之后、3.x 之前）
    const header = fwRows[0];
    const dataRows = fwRows.slice(1).concat(newRows);
    dataRows.sort((a, b) =>
      compareCode(String(a[6] ?? ''), String(b[6] ?? '')),
    );
    const merged: string[][] = [header, ...dataRows];
    workbook.Sheets[fwSheetName] = xlsx.utils.aoa_to_sheet(merged);

    // 2b. 封面还原：仅保留前 COVER_KEEP_ROWS 行，并更新统计
    const counts = countLevels(merged);
    const coverSheet = workbook.Sheets['封面'];
    const coverRows = xlsx.utils.sheet_to_json<string[]>(coverSheet, {
      header: 1,
      defval: '',
    });
    const cleanCover = coverRows.slice(0, COVER_KEEP_ROWS).map((row) => {
      if (row[0] === '知识点总数') return [row[0], String(counts.total)];
      if (row[0] === '一级节点(a)') return [row[0], String(counts.level1)];
      if (row[0] === '二级节点(a.b)') return [row[0], String(counts.level2)];
      if (row[0] === '三级知识点(a.b.c)') return [row[0], String(counts.level3)];
      if (row[0] === '知识点框架')
        return [row[0], `完整知识点数据（${merged.length - 1}行）`];
      return row;
    });
    workbook.Sheets['封面'] = xlsx.utils.aoa_to_sheet(cleanCover);

    xlsx.writeFile(workbook, filePath);
    console.log(
      `math01.xlsx 修复完成：框架 sheet ${merged.length - 1} 行，统计 ${JSON.stringify(counts)}`,
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
      (r) =>
        String(r[6] ?? '').trim() !== '' ||
        /^\d+\.\d+/.test(String(r[0] ?? '')),
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
