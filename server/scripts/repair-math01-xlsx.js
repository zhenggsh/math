"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const xlsx = __importStar(require("xlsx"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
(function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath))
        return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
    }
})();
const IKSM_DIR = path.join(process.cwd(), '..', 'iksm');
const COVER_KEEP_ROWS = 15;
function compareCode(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0)
            return d;
    }
    return 0;
}
function countLevels(rows) {
    const counts = { total: 0, level1: 0, level2: 0, level3: 0 };
    for (const row of rows.slice(1)) {
        const code = String(row[6] ?? '').trim();
        if (!code)
            continue;
        counts.total++;
        if (/^\d+$/.test(code))
            counts.level1++;
        else if (/^\d+\.\d+$/.test(code))
            counts.level2++;
        else if (/^\d+\.\d+\.\d+/.test(code))
            counts.level3++;
    }
    return counts;
}
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const textbook = await prisma.textbook.findUnique({
            where: { fileName: 'math01' },
        });
        if (!textbook)
            throw new Error('DB 中未找到 math01 教材');
        const points = await prisma.knowledgePoint.findMany({
            where: {
                textbookId: textbook.id,
                OR: [{ code: '2.4' }, { code: { startsWith: '2.4.' } }],
            },
        });
        if (points.length === 0)
            throw new Error('DB 中未找到 2.4.x 知识点');
        points.sort((a, b) => compareCode(a.code, b.code));
        console.log(`DB 中查到 ${points.length} 个 2.4.x 知识点`);
        const filePath = path.join(IKSM_DIR, 'math01.xlsx');
        const workbook = xlsx.readFile(filePath);
        const fwSheetName = '知识点框架';
        const fwSheet = workbook.Sheets[fwSheetName];
        if (!fwSheet)
            throw new Error('未找到知识点框架 sheet');
        const fwRows = xlsx.utils.sheet_to_json(fwSheet, {
            header: 1,
            defval: '',
        });
        const existingCodes = new Set(fwRows.slice(1).map((r) => String(r[6] ?? '').trim()));
        const toAdd = points.filter((p) => !existingCodes.has(p.code));
        console.log(`框架 sheet 已有 ${existingCodes.size} 个编号，需补 ${toAdd.length} 行`);
        const child = points.find((p) => p.code.startsWith('2.4.') && p.level1);
        const parentL1 = child?.level1 ?? '';
        const parentL2 = child?.level2 ?? '';
        const newRows = toAdd.map((p) => {
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
        const header = fwRows[0];
        const dataRows = fwRows.slice(1).concat(newRows);
        dataRows.sort((a, b) => compareCode(String(a[6] ?? ''), String(b[6] ?? '')));
        const merged = [header, ...dataRows];
        workbook.Sheets[fwSheetName] = xlsx.utils.aoa_to_sheet(merged);
        const counts = countLevels(merged);
        const impCounts = {};
        for (const row of merged.slice(1)) {
            const imp = String(row[5] ?? '').trim();
            if (imp)
                impCounts[imp] = (impCounts[imp] ?? 0) + 1;
        }
        const coverSheet = workbook.Sheets['封面'];
        const coverRows = xlsx.utils.sheet_to_json(coverSheet, {
            header: 1,
            defval: '',
        });
        const cleanCover = coverRows.slice(0, COVER_KEEP_ROWS).map((row) => {
            if (row[0] === '知识点总数')
                return [row[0], String(counts.total)];
            if (row[0] === '一级节点(a)')
                return [row[0], String(counts.level1)];
            if (row[0] === '二级节点(a.b)')
                return [row[0], String(counts.level2)];
            if (row[0] === '三级知识点(a.b.c)')
                return [row[0], String(counts.level3)];
            const impMatch = String(row[0] ?? '').match(/^([ABC])类/);
            if (impMatch)
                return [row[0], String(impCounts[impMatch[1]] ?? 0)];
            if (row[0] === '知识点框架')
                return [row[0], `完整知识点数据（${merged.length - 1}行）`];
            return row;
        });
        workbook.Sheets['封面'] = xlsx.utils.aoa_to_sheet(cleanCover);
        xlsx.writeFile(workbook, filePath);
        console.log(`math01.xlsx 修复完成：框架 sheet ${merged.length - 1} 行，统计 ${JSON.stringify(counts)}，重要性分布 ${JSON.stringify(impCounts)}`);
        const verify = xlsx.readFile(filePath);
        const vCover = xlsx.utils.sheet_to_json(verify.Sheets['封面'], {
            header: 1,
            defval: '',
        });
        const vFw = xlsx.utils.sheet_to_json(verify.Sheets[fwSheetName], { header: 1, defval: '' });
        const coverPolluted = vCover.some((r) => String(r[0] ?? '').includes('三角函数'));
        if (coverPolluted)
            throw new Error('验证失败：封面仍含知识点行');
        const missing = points.filter((p) => !vFw.some((r) => String(r[6] ?? '').trim() === p.code));
        if (missing.length > 0)
            throw new Error(`验证失败：框架 sheet 缺 ${missing.map((m) => m.code).join(',')}`);
        console.log('验证通过：封面无知识点行，框架 sheet 含全部 2.4.x 编号');
        const math02Path = path.join(IKSM_DIR, 'math02.xlsx');
        const wb2 = xlsx.readFile(math02Path);
        const cover2 = xlsx.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1, defval: '' });
        const polluted2 = cover2.filter((r) => String(r[6] ?? '').trim() !== '' ||
            /^\d+\.\d+/.test(String(r[0] ?? '')));
        console.log(polluted2.length > 0
            ? `⚠️ math02.xlsx 首个 sheet 疑似含 ${polluted2.length} 行知识点数据，需人工确认`
            : 'math02.xlsx 首个 sheet 无知识点行，无需修复');
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((err) => {
    console.error('修复失败:', err);
    process.exit(1);
});
//# sourceMappingURL=repair-math01-xlsx.js.map