import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';

@Module({
  controllers: [StudyAgentController],
  providers: [],
})
export class StudyAgentModule {}
