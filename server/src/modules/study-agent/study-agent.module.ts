import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';

@Module({
  controllers: [StudyAgentController],
  providers: [StudyAgentConfigService],
})
export class StudyAgentModule {}
