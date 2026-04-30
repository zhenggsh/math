import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LearningRecordService } from './learning-record.service';
import { LearningRecordController } from './learning-record.controller';

/**
 * 学习记录模块
 * 提供学习记录的创建和查询功能
 */
@Module({
  imports: [PrismaModule],
  controllers: [LearningRecordController],
  providers: [LearningRecordService],
  exports: [LearningRecordService],
})
export class LearningModule {}
