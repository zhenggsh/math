/**
 * 一次性数据修复脚本：DB 中 math01 的 2.4 知识点记录（含 xlsx 同步）
 *
 * 背景：expand 骨架生成时写入脏数据：level1='2'、level2='2.4'、
 * definition='三角函数特性11'、characteristics='三角函数特性22'。
 * repair-math01-xlsx.ts 修复 xlsx 时已推断出正确名称，但 DB 未修，
 * 且垃圾 definition/characteristics 被复制进了 xlsx 的 2.4 行。
 * 本脚本修复 DB 记录（根因），并同步 xlsx 框架 sheet 的 2.4 行。
 *
 * 修复值（参照其他二级记录 2.3 幂函数 的约定）：
 *   name='三角函数', level1='基本初等函数', level2='三角函数', level3=null
 *   definition：md 的 2.4 小节"本节概览"仅有"三角函数"几个字，无可用定义，
 *               采用简洁定义（见下）
 *   characteristics：参照 md 2.4 小节内容给出简洁描述
 *
 * 只动 code='2.4' 这一条记录，2.4.1-2.4.27 的三级记录不动。
 *
 * 运行：cd server && npx ts-node scripts/fix-db-24-record.ts
 */
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

// 手动加载 .env（dotenv 符号链接在本环境不可用，同 repair-math01-xlsx.ts）
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

const FIXED = {
  name: '三角函数',
  level1: '基本初等函数',
  level2: '三角函数',
  level3: null as string | null,
  definition:
    '以角为自变量、以比值为函数值的一类函数，包括正弦、余弦、正切等，是研究周期性现象的基本工具',
  characteristics:
    '包含任意角与弧度制、任意角的三角函数定义、同角关系与诱导公式、图像与性质（周期性、奇偶性、单调性、最值）；是研究周期性现象的基本模型',
};

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const textbook = await prisma.textbook.findUnique({
      where: { fileName: 'math01' },
    });
    if (!textbook) throw new Error('DB 中未找到 math01 教材');

    // 1. 修复 DB 记录（只动 code='2.4'）
    const before = await prisma.knowledgePoint.findUnique({
      where: {
        idx_knowledge_point_code_textbook: { code: '2.4', textbookId: textbook.id },
      },
    });
    if (!before) throw new Error('DB 中未找到 math01 的 2.4 知识点');
    console.log('修复前:', JSON.stringify(before, null, 2));

    const after = await prisma.knowledgePoint.update({
      where: {
        idx_knowledge_point_code_textbook: { code: '2.4', textbookId: textbook.id },
      },
      data: FIXED,
    });
    console.log('修复后:', JSON.stringify(after, null, 2));

    // 2. 同步 xlsx 框架 sheet 的 2.4 行
    const filePath = path.join(IKSM_DIR, 'math01.xlsx');
    const workbook = xlsx.readFile(filePath);
    const fwSheetName = '知识点框架';
    const fwRows = xlsx.utils.sheet_to_json<string[]>(
      workbook.Sheets[fwSheetName],
      { header: 1, defval: '' },
    );
    let updated = 0;
    for (const row of fwRows) {
      if (String(row[6] ?? '').trim() === '2.4') {
        row[0] = FIXED.level1;
        row[1] = FIXED.level2;
        row[2] = '—'; // 二级行的三级列约定（与 2.3 行一致）
        row[3] = FIXED.definition;
        row[4] = FIXED.characteristics;
        updated++;
      }
    }
    if (updated !== 1) throw new Error(`xlsx 中 2.4 行数量为 ${updated}，预期 1`);
    workbook.Sheets[fwSheetName] = xlsx.utils.aoa_to_sheet(fwRows);
    xlsx.writeFile(workbook, filePath);
    console.log('xlsx 2.4 行已同步');

    // 3. 验证：xlsx 与 DB 一致，其他行不受影响
    const verify = xlsx.readFile(filePath);
    const vFw = xlsx.utils.sheet_to_json<string[]>(
      verify.Sheets[fwSheetName],
      { header: 1, defval: '' },
    );
    if (vFw.length - 1 !== 82)
      throw new Error(`框架 sheet 行数异常：${vFw.length - 1}，预期 82`);
    const row24 = vFw.find((r) => String(r[6] ?? '').trim() === '2.4');
    if (
      !row24 ||
      row24[0] !== FIXED.level1 ||
      row24[1] !== FIXED.level2 ||
      row24[3] !== FIXED.definition ||
      row24[4] !== FIXED.characteristics
    )
      throw new Error(`xlsx 2.4 行验证失败: ${JSON.stringify(row24)}`);
    const n24 = vFw.filter((r) =>
      String(r[6] ?? '').startsWith('2.4.'),
    ).length;
    if (n24 !== 27) throw new Error(`2.4.x 三级行数异常：${n24}，预期 27`);
    console.log('验证通过：DB 与 xlsx 2.4 行一致，框架 sheet 共 82 行，2.4.x 三级行 27 行未受影响');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('修复失败:', err);
  process.exit(1);
});
