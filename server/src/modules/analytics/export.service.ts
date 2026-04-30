import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as xlsx from 'xlsx';

/**
 * 导出查询参数
 */
export interface ExportParams {
  classId?: string;
  startDate?: string;
  endDate?: string;
  format: 'xlsx' | 'csv';
}

/**
 * 数据导出服务
 * 支持 Excel 和 CSV 格式导出学习记录
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 导出学习记录数据
   */
  async exportLearningRecords(params: ExportParams): Promise<Buffer> {
    this.logger.log(`Exporting learning records: ${JSON.stringify(params)}`);

    const { startDate, endDate, format } = params;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const records = await this.prisma.learningRecord.findMany({
      where,
      include: {
        knowledgePoint: {
          select: {
            code: true,
            level1: true,
            level2: true,
            level3: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = records.map((record) => ({
      学生姓名: record.user.name,
      知识点编号: record.knowledgePoint.code,
      知识点名称: [
        record.knowledgePoint.level1,
        record.knowledgePoint.level2,
        record.knowledgePoint.level3,
      ]
        .filter(Boolean)
        .join(' > '),
      学习时间: record.createdAt.toLocaleString('zh-CN'),
      学习时长分钟: record.durationMinutes,
      掌握程度: record.masteryLevel,
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '学习记录');

    if (format === 'csv') {
      return Buffer.from(xlsx.utils.sheet_to_csv(worksheet));
    }

    return Buffer.from(
      xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    );
  }
}
