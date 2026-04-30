import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ExportService } from './export.service';

/**
 * 数据分析模块
 * 提供学习数据分析 API，支持学生和教师两个视角
 */
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExportService],
  exports: [AnalyticsService, ExportService],
})
export class AnalyticsModule {}
