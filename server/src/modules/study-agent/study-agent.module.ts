import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';

@Module({
  controllers: [StudyAgentController],
  providers: [StudyAgentConfigService, KimiClientService],
})
export class StudyAgentModule {}
