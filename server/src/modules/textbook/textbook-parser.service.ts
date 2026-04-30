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

      // 第一行作为表头
      const headers = data[0] as unknown as string[];
      const rows = data.slice(1);

      const records = rows.map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          record[String(header)] = String(row[index] || '');
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
   * 检查数据中是否存在符合 a.b.c 模式的知识点编号
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
   */
  private transformToKnowledgePoints(
    rawData: Record<string, string>[],
  ): RawKnowledgePoint[] {
    return rawData.map((row, index) => {
      // 提取字段，支持多种可能的列名
      const code = this.getFieldValue(row, ['知识点编号', '编号', 'code']);
      const level1 = this.getFieldValue(row, ['一级知识点', '一级', 'level1']);
      const level2 = this.getFieldValue(row, ['二级知识点', '二级', 'level2']);
      const level3 = this.getFieldValue(row, ['三级知识点', '三级', 'level3']);
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
