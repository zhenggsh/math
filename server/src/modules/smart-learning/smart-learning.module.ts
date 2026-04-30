import { Module } from '@nestjs/common';
import { SmartLearningService } from './smart-learning.service';
import { SmartLearningController } from './smart-learning.controller';

@Module({
  controllers: [SmartLearningController],
  providers: [SmartLearningService],
  exports: [SmartLearningService],
})
export class SmartLearningModule {}
