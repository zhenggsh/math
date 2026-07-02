import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';
import { KnowledgeContentService } from './services/knowledge-content.service';
import { LearningContextService } from './services/learning-context.service';
import { StudySessionService } from './services/study-session.service';
import { StudyMessageService } from './services/study-message.service';
import { MessageFeedbackService } from './services/message-feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudyAgentController],
  providers: [
    StudyAgentConfigService,
    KimiClientService,
    KnowledgeContentService,
    LearningContextService,
    StudySessionService,
    StudyMessageService,
    MessageFeedbackService,
  ],
})
export class StudyAgentModule {}
