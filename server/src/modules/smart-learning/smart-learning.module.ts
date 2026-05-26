import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartLearningService } from './smart-learning.service';
import { SmartLearningController } from './smart-learning.controller';
import { recommendationConfig } from './recommendation.config';

@Module({
  imports: [ConfigModule.forFeature(recommendationConfig)],
  controllers: [SmartLearningController],
  providers: [SmartLearningService],
  exports: [SmartLearningService],
})
export class SmartLearningModule {}
