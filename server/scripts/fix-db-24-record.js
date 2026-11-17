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
const FIXED = {
    name: '三角函数',
    level1: '基本初等函数',
    level2: '三角函数',
    level3: null,
    definition: '以角为自变量、以比值为函数值的一类函数，包括正弦、余弦、正切等，是研究周期性现象的基本工具',
    characteristics: '包含任意角与弧度制、任意角的三角函数定义、同角关系与诱导公式、图像与性质（周期性、奇偶性、单调性、最值）；是研究周期性现象的基本模型',
};
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const textbook = await prisma.textbook.findUnique({
            where: { fileName: 'math01' },
        });
        if (!textbook)
            throw new Error('DB 中未找到 math01 教材');
        const before = await prisma.knowledgePoint.findUnique({
            where: {
                idx_knowledge_point_code_textbook: { code: '2.4', textbookId: textbook.id },
            },
        });
        if (!before)
            throw new Error('DB 中未找到 math01 的 2.4 知识点');
        console.log('修复前:', JSON.stringify(before, null, 2));
        const after = await prisma.knowledgePoint.update({
            where: {
                idx_knowledge_point_code_textbook: { code: '2.4', textbookId: textbook.id },
            },
            data: FIXED,
        });
        console.log('修复后:', JSON.stringify(after, null, 2));
        const filePath = path.join(IKSM_DIR, 'math01.xlsx');
        const workbook = xlsx.readFile(filePath);
        const fwSheetName = '知识点框架';
        const fwRows = xlsx.utils.sheet_to_json(workbook.Sheets[fwSheetName], { header: 1, defval: '' });
        let updated = 0;
        for (const row of fwRows) {
            if (String(row[6] ?? '').trim() === '2.4') {
                row[0] = FIXED.level1;
                row[1] = FIXED.level2;
                row[2] = '—';
                row[3] = FIXED.definition;
                row[4] = FIXED.characteristics;
                updated++;
            }
        }
        if (updated !== 1)
            throw new Error(`xlsx 中 2.4 行数量为 ${updated}，预期 1`);
        workbook.Sheets[fwSheetName] = xlsx.utils.aoa_to_sheet(fwRows);
        xlsx.writeFile(workbook, filePath);
        console.log('xlsx 2.4 行已同步');
        const verify = xlsx.readFile(filePath);
        const vFw = xlsx.utils.sheet_to_json(verify.Sheets[fwSheetName], { header: 1, defval: '' });
        if (vFw.length - 1 !== 82)
            throw new Error(`框架 sheet 行数异常：${vFw.length - 1}，预期 82`);
        const row24 = vFw.find((r) => String(r[6] ?? '').trim() === '2.4');
        if (!row24 ||
            row24[0] !== FIXED.level1 ||
            row24[1] !== FIXED.level2 ||
            row24[3] !== FIXED.definition ||
            row24[4] !== FIXED.characteristics)
            throw new Error(`xlsx 2.4 行验证失败: ${JSON.stringify(row24)}`);
        const n24 = vFw.filter((r) => String(r[6] ?? '').startsWith('2.4.')).length;
        if (n24 !== 27)
            throw new Error(`2.4.x 三级行数异常：${n24}，预期 27`);
        console.log('验证通过：DB 与 xlsx 2.4 行一致，框架 sheet 共 82 行，2.4.x 三级行 27 行未受影响');
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((err) => {
    console.error('修复失败:', err);
    process.exit(1);
});
//# sourceMappingURL=fix-db-24-record.js.map