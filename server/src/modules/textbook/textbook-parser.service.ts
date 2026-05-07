import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import {
  RawKnowledgePoint,
  FrameworkType,
  ParseResult,
} from './types/textbook.types';

@Injectable()
export class TextbookParserService {
  private readonly logger = new Logger(TextbookParserService.name);

  /**
   * 解析框架文件
   * @param filePath 文件路径
   * @param fileType 文件类型 (xlsx | csv)
   */
  parseFrameworkFile(filePath: string, fileType: FrameworkType): ParseResult {
    try {
      this.logger.log(`开始解析文件: ${filePath}, 类型: ${fileType}`);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `文件不存在: ${filePath}`,
        };
      }

      let rawData: Record<string, string>[] = [];

      if (fileType === 'xlsx') {
        rawData = this.parseXlsx(filePath);
      } else if (fileType === 'csv') {
        rawData = this.parseCsv(filePath);
      } else {
        return {
          success: false,
          error: `不支持的文件类型: ${String(fileType)}`,
        };
      }

      const knowledgePoints = this.transformToKnowledgePoints(rawData);

      this.logger.log(`成功解析 ${knowledgePoints.length} 个知识点`);

      return {
        success: true,
        data: knowledgePoints,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`解析文件失败: ${errorMessage}`);
      return {
        success: false,
        error: `解析文件失败: ${errorMessage}`,
      };
    }
  }

  /**
   * 解析 XLSX 文件
   * 遍历所有工作表，返回第一个包含合规知识点编号的框架数据
   */
  private parseXlsx(filePath: string): Record<string, string>[] {
    const workbook = xlsx.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];

      // 转换为 JSON，使用第一行作为表头
      const data = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, {
        header: 1,
        defval: '',
      });

      if (data.length === 0) {
        continue;
      }

      // 找到第一个非空行作为表头（跳过开头的空行）
      let headerRowIndex = 0;
      while (headerRowIndex < data.length) {
        const row = data[headerRowIndex] as unknown as string[];
        if (
          row.some(
            (cell) =>
              cell !== undefined &&
              cell !== null &&
              String(cell).trim() !== '',
          )
        ) {
          break;
        }
        headerRowIndex++;
      }

      if (headerRowIndex >= data.length) {
        continue;
      }

      const headers = data[headerRowIndex] as unknown as string[];
      const rows = data.slice(headerRowIndex + 1);

      const records = rows.map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          if (
            header !== undefined &&
            header !== null &&
            String(header).trim() !== ''
          ) {
            record[String(header).trim()] = String(row[index] || '');
          }
        });
        return record;
      });

      if (this.isValidKnowledgeFramework(records)) {
        this.logger.log(
          `选择工作表 "${sheetName}" 作为知识点框架 (${records.length} 行)`,
        );
        return records;
      }
    }

    this.logger.warn(`未找到合规的知识点框架工作表: ${filePath}`);
    return [];
  }

  /**
   * 判断是否为合规的知识点框架
   * 检查数据中是否存在符合 a.b.c 模式的知识点编号，
   * 或存在知识点层级列（一级/二级/三级知识点）
   */
  private isValidKnowledgeFramework(
    records: Record<string, string>[],
  ): boolean {
    if (records.length === 0) {
      return false;
    }

    // a.b.c 模式：至少3级数字用点分隔，如 1.1.1、1.1.1-1
    const codePattern = /^\d+(\.\d+){2,}/;

    for (const record of records) {
      const code = this.getFieldValue(record, [
        '知识点编号',
        '编号',
        'code',
      ]);
      if (codePattern.test(code)) {
        return true;
      }
    }

    // 如果没有编号列，检查是否有知识点层级列（一级+三级知识点）
    const hasLevel1 = records.some(
      (r) => this.getFieldValue(r, ['一级知识点', '一级', 'level1']) !== '',
    );
    const hasLevel3 = records.some(
      (r) => this.getFieldValue(r, ['三级知识点', '三级', 'level3']) !== '',
    );

    if (hasLevel1 && hasLevel3) {
      return true;
    }

    return false;
  }

  /**
   * 解析 CSV 文件
   */
  private parseCsv(filePath: string): Record<string, string>[] {
    const content = fs.readFileSync(filePath, 'utf-8');

    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      complete: () => {},
    }) as unknown as Papa.ParseResult<Record<string, string>>;

    if (result.errors && result.errors.length > 0) {
      this.logger.warn(`CSV 解析警告: ${JSON.stringify(result.errors)}`);
    }

    return result.data || [];
  }

  /**
   * 将原始数据转换为知识点结构
   * 自动生成一二级知识点记录（code 为 a 和 a.b）
   */
  private transformToKnowledgePoints(
    rawData: Record<string, string>[],
  ): RawKnowledgePoint[] {
    // 用于继承空值和自动编号
    let currentLevel1 = '';
    let currentLevel2 = '';
    let l1Idx = 0;
    let l2Idx = 0;
    let l3Idx = 0;
    let prevL1 = '';
    let prevL2 = '';

    const points = rawData.map((row, index) => {
      // 提取字段，支持多种可能的列名
      let code = this.getFieldValue(row, ['知识点编号', '编号', 'code']);
      let level1 = this.getFieldValue(row, ['一级知识点', '一级', 'level1']);
      let level2 = this.getFieldValue(row, ['二级知识点', '二级', 'level2']);
      let level3 = this.getFieldValue(row, ['三级知识点', '三级', 'level3']);

      // 过滤占位符（Excel 中用"—"或"-"表示无）
      if (level2 === '—' || level2 === '-') {
        level2 = '';
      }
      if (level3 === '—' || level3 === '-') {
        level3 = '';
      }
      const definition = this.getFieldValue(row, ['定义', 'description']);
      const characteristics = this.getFieldValue(row, [
        '特性/运算方式',
        '特性',
        '运算方式',
        'characteristics',
      ]);
      const importanceLevelRaw = this.getFieldValue(row, [
        '重要性级别',
        '重要性',
        '级别',
        'importanceLevel',
      ]);

      // 继承空的一级/二级知识点（Excel 中空白表示继承上一行）
      if (level1) {
        currentLevel1 = level1;
        currentLevel2 = ''; // 一级变化时重置二级
      } else {
        level1 = currentLevel1;
      }

      if (level2) {
        currentLevel2 = level2;
      } else {
        level2 = currentLevel2;
      }

      // 自动生成编号（当文件中没有编号列时）
      if (!code) {
        if (level1 !== prevL1) {
          l1Idx++;
          l2Idx = 0;
          l3Idx = 0;
          prevL1 = level1;
          prevL2 = '';
        }
        if (level2 && level2 !== prevL2) {
          l2Idx++;
          l3Idx = 0;
          prevL2 = level2;
        }
        l3Idx++;
        if (level3) {
          code = `${l1Idx}.${l2Idx}.${l3Idx}`;
        } else if (level2) {
          code = `${l1Idx}.${l2Idx}`;
        } else {
          code = `${l1Idx}`;
        }
      }

      // 验证必填字段
      if (!code) {
        this.logger.warn(`第 ${index + 1} 行缺少知识点编号`);
      }
      if (!level1) {
        this.logger.warn(`第 ${index + 1} 行缺少一级知识点`);
      }

      // 标准化重要性级别
      let importanceLevel: 'A' | 'B' | 'C' = 'C';
      if (importanceLevelRaw) {
        const upperLevel = importanceLevelRaw.toUpperCase();
        if (upperLevel === 'A' || upperLevel === 'B' || upperLevel === 'C') {
          importanceLevel = upperLevel;
        }
      }

      return {
        code: code || `unknown-${index}`,
        level1: level1 || '未分类',
        level2: level2 || undefined,
        level3: level3 || undefined,
        definition: definition || undefined,
        characteristics: characteristics || undefined,
        importanceLevel,
      };
    });

    // 后处理：自动生成一二级知识点记录
    return this.generateHierarchyPoints(points);
  }

  /**
   * 根据三级知识点自动生成一二级知识点记录
   */
  private generateHierarchyPoints(
    points: RawKnowledgePoint[],
  ): RawKnowledgePoint[] {
    const existingCodes = new Set(points.map((p) => p.code));
    const l1Map = new Map<
      string,
      { level1: string; importanceLevel: 'A' | 'B' | 'C' }
    >();
    const l2Map = new Map<
      string,
      { level1: string; level2: string; importanceLevel: 'A' | 'B' | 'C' }
    >();

    for (const point of points) {
      // 只处理数字层级格式的 code（如 1.1.1）
      if (!/^\d+(\.\d+)*$/.test(point.code)) {
        continue;
      }

      const parts = point.code.split('.');

      if (parts.length >= 3) {
        // 三级记录，提取一二级
        const l1Code = parts[0];
        const l2Code = `${parts[0]}.${parts[1]}`;

        if (!existingCodes.has(l1Code)) {
          const current = l1Map.get(l1Code);
          if (
            !current ||
            this.importanceRank(point.importanceLevel) >
              this.importanceRank(current.importanceLevel)
          ) {
            l1Map.set(l1Code, {
              level1: point.level1,
              importanceLevel: point.importanceLevel,
            });
          }
        }

        if (!existingCodes.has(l2Code)) {
          const current = l2Map.get(l2Code);
          if (
            !current ||
            this.importanceRank(point.importanceLevel) >
              this.importanceRank(current.importanceLevel)
          ) {
            l2Map.set(l2Code, {
              level1: point.level1,
              level2: point.level2 || '',
              importanceLevel: point.importanceLevel,
            });
          }
        }
      } else if (parts.length === 2) {
        // 二级记录，提取一级
        const l1Code = parts[0];
        if (!existingCodes.has(l1Code)) {
          const current = l1Map.get(l1Code);
          if (
            !current ||
            this.importanceRank(point.importanceLevel) >
              this.importanceRank(current.importanceLevel)
          ) {
            l1Map.set(l1Code, {
              level1: point.level1,
              importanceLevel: point.importanceLevel,
            });
          }
        }
      }
    }

    const generated: RawKnowledgePoint[] = [];

    for (const [code, info] of l1Map) {
      generated.push({
        code,
        level1: info.level1,
        importanceLevel: info.importanceLevel,
      });
    }

    for (const [code, info] of l2Map) {
      generated.push({
        code,
        level1: info.level1,
        level2: info.level2 || undefined,
        importanceLevel: info.importanceLevel,
      });
    }

    if (generated.length > 0) {
      this.logger.log(
        `自动生成 ${generated.length} 个一二级知识点记录（一级: ${l1Map.size}, 二级: ${l2Map.size}）`,
      );
    }

    return [...points, ...generated];
  }

  /**
   * 重要性级别排序（用于取最高级别）
   */
  private importanceRank(level: 'A' | 'B' | 'C'): number {
    return level === 'A' ? 3 : level === 'B' ? 2 : 1;
  }

  /**
   * 从行数据中获取字段值，尝试多个可能的列名
   */
  private getFieldValue(
    row: Record<string, string>,
    possibleNames: string[],
  ): string {
    for (const name of possibleNames) {
      if (name in row && row[name] !== undefined && row[name] !== '') {
        return row[name].trim();
      }
    }
    return '';
  }

  /**
   * 验证知识点数据
   */
  validateKnowledgePoints(points: RawKnowledgePoint[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      if (!point.code) {
        errors.push(`第 ${i + 1} 行: 知识点编号不能为空`);
      }

      if (!point.level1) {
        errors.push(`第 ${i + 1} 行: 一级知识点不能为空`);
      }

      // 检查编号唯一性
      const duplicates = points.filter((p) => p.code === point.code);
      if (duplicates.length > 1) {
        const existingError = errors.find((e) =>
          e.includes(`知识点编号 "${point.code}" 重复`),
        );
        if (!existingError) {
          const duplicateLines = duplicates
            .map((p) => points.indexOf(p) + 1)
            .join(', ');
          errors.push(
            `知识点编号 "${point.code}" 重复 (行: ${duplicateLines})`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
