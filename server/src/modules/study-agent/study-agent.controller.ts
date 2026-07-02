import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  ServiceUnavailableException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  StudyMessage,
  StudyMessageFeedback,
  StudyMessageRole,
} from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageFeedbackService } from './services/message-feedback.service';
import { StudyMessageService } from './services/study-message.service';
import { StudyRateLimitService } from './services/study-rate-limit.service';
import { StudySessionService } from './services/study-session.service';
import { StudySkillRegistry } from './services/study-skill.registry';
import { QaSkillResult } from './services/skills/qa.skill';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { StudyMessageResponseDto } from './dto/study-message-response.dto';
import { StudySessionResponseDto } from './dto/study-session-response.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@ApiTags('study-agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study-agent')
export class StudyAgentController {
  constructor(
    private readonly sessionService: StudySessionService,
    private readonly messageService: StudyMessageService,
    private readonly feedbackService: MessageFeedbackService,
    private readonly rateLimitService: StudyRateLimitService,
    private readonly skillRegistry: StudySkillRegistry,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建或恢复学习会话' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '会话创建成功',
    type: StudySessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async createSession(
    @CurrentUser('userId') userId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateSessionDto,
  ): Promise<{ success: boolean; data: StudySessionResponseDto }> {
    const session = await this.sessionService.upsert(
      userId,
      dto.knowledgePointId,
      dto.knowledgePointTitle,
    );
    const messages = await this.messageService.findBySession(
      userId,
      session.id,
    );
    return { success: true, data: this.mapSession(session, messages) };
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: '获取会话详情' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: StudySessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '会话不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async findSession(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionId: string,
  ): Promise<{ success: boolean; data: StudySessionResponseDto }> {
    const session = await this.sessionService.findById(userId, sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const messages = await this.messageService.findBySession(
      userId,
      session.id,
    );
    return { success: true, data: this.mapSession(session, messages) };
  }

  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发送消息并获取 AI 回复' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '回复成功',
    type: StudyMessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: '请求太频繁',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AI 助手暂时不可用',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '会话不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async createMessage(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateMessageDto,
  ): Promise<{ success: boolean; data: StudyMessageResponseDto }> {
    this.checkRateLimit(userId);

    const session = await this.sessionService.findById(userId, sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.messageService.createUserMessage(userId, sessionId, dto.content);

    const messages = await this.messageService.findBySession(userId, sessionId);
    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const question = this.findLastUserMessageContent(history);

    const result = await this.callQaSkill(userId, session, question, history);
    const agentMessage = await this.messageService.createAgentMessage(userId, {
      sessionId,
      content: result.content,
      followUps: result.followUps,
    });

    return { success: true, data: this.mapMessage(agentMessage) };
  }

  @Put('messages/:id/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新消息反馈' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '消息不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async updateFeedback(
    @CurrentUser('userId') userId: string,
    @Param('id') messageId: string,
    @Body(new ValidationPipe({ transform: true })) dto: UpdateFeedbackDto,
  ): Promise<{ success: boolean }> {
    await this.feedbackService.updateFeedback(
      userId,
      messageId,
      dto.feedback ?? null,
    );
    return { success: true };
  }

  @Post('messages/:userMessageId/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重新生成 AI 回复' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '重新生成成功',
    type: StudyMessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: '请求太频繁',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AI 助手暂时不可用',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '消息不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  async regenerate(
    @CurrentUser('userId') userId: string,
    @Param('userMessageId') userMessageId: string,
  ): Promise<{ success: boolean; data: StudyMessageResponseDto }> {
    this.checkRateLimit(userId);

    const userMessage = await this.messageService.findUserMessageById(
      userId,
      userMessageId,
    );
    if (!userMessage) {
      throw new NotFoundException('User message not found');
    }

    const agentResponse =
      await this.messageService.findAgentResponseForUserMessage(
        userId,
        userMessage.sessionId,
        userMessageId,
      );
    if (!agentResponse) {
      throw new NotFoundException('Agent response not found');
    }

    const session = await this.sessionService.findById(
      userId,
      userMessage.sessionId,
    );
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const allMessages = await this.messageService.findBySession(
      userId,
      session.id,
    );
    const history = allMessages
      .filter((message) => message.createdAt < agentResponse.createdAt)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const result = await this.callQaSkill(
      userId,
      session,
      userMessage.content,
      history,
    );
    const updatedMessage = await this.messageService.updateAgentMessage(
      userId,
      agentResponse.id,
      result.content,
      result.followUps,
    );

    return { success: true, data: this.mapMessage(updatedMessage) };
  }

  private checkRateLimit(userId: string): void {
    if (!this.rateLimitService.isAllowed(userId)) {
      throw new HttpException(
        '请求太频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async callQaSkill(
    userId: string,
    session: {
      id: string;
      userId: string;
      knowledgePointId: string;
      title: string;
      createdAt: Date;
    },
    question: string,
    history: { role: StudyMessageRole; content: string }[],
  ): Promise<QaSkillResult> {
    const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
      where: { id: session.knowledgePointId },
      include: { textbook: true },
    });

    if (!knowledgePoint) {
      throw new NotFoundException('Knowledge point not found');
    }

    const dedupedHistory = this.deduplicateHistory(history, question);

    try {
      return await this.skillRegistry.getDefaultSkill().execute({
        userId,
        knowledgePointId: session.knowledgePointId,
        question,
        history: dedupedHistory,
        title: session.title,
        code: knowledgePoint.code,
        contentRef: knowledgePoint.contentRef ?? undefined,
        textbookContentPath: knowledgePoint.textbook?.contentPath ?? undefined,
      });
    } catch {
      throw new ServiceUnavailableException('AI 助手暂时不可用，请稍后重试');
    }
  }

  private deduplicateHistory(
    history: { role: StudyMessageRole; content: string }[],
    question: string,
  ): { role: StudyMessageRole; content: string }[] {
    const lastMessage = history[history.length - 1];
    if (
      lastMessage?.role === StudyMessageRole.USER &&
      lastMessage.content === question
    ) {
      return history.slice(0, -1);
    }
    return history;
  }

  private findLastUserMessageContent(
    history: { role: StudyMessageRole; content: string }[],
  ): string {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === StudyMessageRole.USER) {
        return history[i].content;
      }
    }
    return '';
  }

  private mapMessage(message: StudyMessage): StudyMessageResponseDto {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: this.mapRole(message.role),
      content: message.content,
      followUps: message.followUps,
      feedback: this.mapFeedback(message.feedback),
      createdAt: message.createdAt,
    };
  }

  private mapSession(
    session: {
      id: string;
      userId: string;
      knowledgePointId: string;
      title: string;
      createdAt: Date;
    },
    messages: StudyMessage[],
  ): StudySessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      knowledgePointId: session.knowledgePointId,
      title: session.title,
      messages: messages.map((message) => this.mapMessage(message)),
      createdAt: session.createdAt,
    };
  }

  private mapRole(role: StudyMessageRole): 'user' | 'agent' {
    return role === StudyMessageRole.USER ? 'user' : 'agent';
  }

  private mapFeedback(
    feedback: StudyMessageFeedback | null | undefined,
  ): 'positive' | 'negative' | null {
    if (feedback === StudyMessageFeedback.POSITIVE) {
      return 'positive';
    }
    if (feedback === StudyMessageFeedback.NEGATIVE) {
      return 'negative';
    }
    return null;
  }
}
