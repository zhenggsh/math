import { Injectable } from '@nestjs/common';
import { StudyMessage, StudyMessageRole } from '@prisma/client';
import { KimiClientService } from '../kimi-client.service';
import { StudyAgentConfigService } from '../study-agent-config.service';
import { KnowledgeContentService } from '../knowledge-content.service';
import { LearningContextService } from '../learning-context.service';
import { ChatMessage } from '../kimi-client.types';
import {
  parseFollowUps,
  stripJsonCodeBlock,
} from '../../utils/follow-up-parser';

export interface QaSkillResult {
  content: string;
  followUps: string[];
}

export interface QaSkillInput {
  userId: string;
  knowledgePointId: string;
  question: string;
  history: Pick<StudyMessage, 'role' | 'content'>[];
  title: string;
  code: string;
  contentRef?: string;
  textbookContentPath?: string;
}

@Injectable()
export class QaSkill {
  constructor(
    private readonly kimiClient: KimiClientService,
    private readonly configService: StudyAgentConfigService,
    private readonly knowledgeContentService: KnowledgeContentService,
    private readonly learningContextService: LearningContextService,
  ) {}

  async execute(input: QaSkillInput): Promise<QaSkillResult> {
    const summary = await this.knowledgeContentService.getSummary(
      input.contentRef,
      input.textbookContentPath,
      input.code,
      input.title,
    );
    const context = await this.learningContextService.getRecentRecords(
      input.userId,
      input.knowledgePointId,
    );

    const systemPrompt = this.buildSystemPrompt(
      input.title,
      input.code,
      summary,
      context,
    );
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const message of input.history) {
      const role = this.mapStudyMessageRole(message.role);
      if (role) {
        messages.push({ role, content: message.content });
      }
    }

    messages.push({ role: 'user', content: input.question });

    const response = await this.kimiClient.chat(messages);

    const followUps = parseFollowUps(response.content, input.title);
    const content = stripJsonCodeBlock(response.content);

    return { content, followUps };
  }

  private buildSystemPrompt(
    title: string,
    code: string,
    summary: string,
    context: string,
  ): string {
    const identity = this.configService.getIdentity();
    const memory = this.configService.getMemory();
    const soule = this.configService.getSoule();

    return [
      identity,
      memory,
      soule,
      `当前知识点：${title}（编号：${code}）`,
      `知识点摘要：\n${summary || '暂无'}`,
      `学习背景：\n${context}`,
      '',
      '请根据以上身份设定、记忆、价值观、知识点摘要和学习背景，用中文回答学生的问题。',
      '回答完毕后，请输出一个 JSON 代码块，其中包含一个 followUps 数组，数组中恰好有 3 个后续问题。',
      '示例格式：',
      '```json',
      '{"followUps": ["问题1", "问题2", "问题3"]}',
      '```',
      '如果 JSON 代码块缺失或格式不正确，系统会使用默认问题。',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  }

  private mapStudyMessageRole(
    role: StudyMessageRole,
  ): 'user' | 'assistant' | null {
    if (role === StudyMessageRole.USER) {
      return 'user';
    }
    if (role === StudyMessageRole.AGENT) {
      return 'assistant';
    }
    return null;
  }
}

@Injectable()
export class StudySkillRegistry {
  constructor(private readonly qaSkill: QaSkill) {}

  getDefaultSkill(): QaSkill {
    return this.qaSkill;
  }
}
