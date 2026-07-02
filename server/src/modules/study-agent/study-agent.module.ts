import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';
import { KnowledgeContentService } from './services/knowledge-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudyAgentController],
  providers: [
    StudyAgentConfigService,
    KimiClientService,
    KnowledgeContentService,
  ],
})
export class StudyAgentModule {}
