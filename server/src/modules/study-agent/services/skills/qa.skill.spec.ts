import { Test, TestingModule } from '@nestjs/testing';
import { StudyMessageRole } from '@prisma/client';
import { QaSkill, QaSkillInput } from './qa.skill';
import { StudySkillRegistry } from '../study-skill.registry';
import { KimiClientService } from '../kimi-client.service';
import { StudyAgentConfigService } from '../study-agent-config.service';
import { KnowledgeContentService } from '../knowledge-content.service';
import { LearningContextService } from '../learning-context.service';
import { ChatMessage, KimiClientResponse } from '../kimi-client.types';
import { FALLBACK_FOLLOW_UPS } from '../../utils/follow-up-parser';

describe('QaSkill', () => {
  let skill: QaSkill;
  let chatMock: jest.Mock<Promise<KimiClientResponse>, [ChatMessage[]]>;
  let getSummaryMock: jest.Mock<
    Promise<string>,
    [string | undefined, string | undefined, string, string]
  >;
  let getRecentRecordsMock: jest.Mock<Promise<string>, [string, string]>;
  let capturedMessages: ChatMessage[] = [];

  const baseInput: QaSkillInput = {
    userId: 'user-1',
    knowledgePointId: 'kp-1',
    question: '这是什么知识点？',
    history: [],
    title: '二次函数',
    code: '1.2.3',
    contentRef: 'content.md',
    textbookContentPath: 'fallback.md',
  };

  const buildResponse = (answer: string, followUps: string[]): string =>
    `${answer}\n\n\`\`\`json\n${JSON.stringify({ followUps })}\n\`\`\``;

  beforeEach(async () => {
    chatMock = jest.fn<Promise<KimiClientResponse>, [ChatMessage[]]>();
    getSummaryMock = jest.fn<
      Promise<string>,
      [string | undefined, string | undefined, string, string]
    >();
    getRecentRecordsMock = jest.fn<Promise<string>, [string, string]>();
    capturedMessages = [];

    chatMock.mockImplementation((messages: ChatMessage[]) => {
      capturedMessages = messages;
      return Promise.resolve({
        content: buildResponse('这是知识点回答。', ['问题1', '问题2', '问题3']),
      });
    });

    getSummaryMock.mockResolvedValue('知识点摘要');
    getRecentRecordsMock.mockResolvedValue('学习背景');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaSkill,
        {
          provide: KimiClientService,
          useValue: {
            chat: chatMock,
          } as Partial<KimiClientService>,
        },
        {
          provide: StudyAgentConfigService,
          useValue: {
            getIdentity: jest.fn().mockReturnValue('Identity'),
            getMemory: jest.fn().mockReturnValue('Memory'),
            getSoule: jest.fn().mockReturnValue('SOULE'),
          } as Partial<StudyAgentConfigService>,
        },
        {
          provide: KnowledgeContentService,
          useValue: {
            getSummary: getSummaryMock,
          } as Partial<KnowledgeContentService>,
        },
        {
          provide: LearningContextService,
          useValue: {
            getRecentRecords: getRecentRecordsMock,
          } as Partial<LearningContextService>,
        },
      ],
    }).compile();

    skill = module.get<QaSkill>(QaSkill);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(skill).toBeDefined();
  });

  it('should fetch knowledge summary and learning context', async () => {
    await skill.execute(baseInput);

    expect(getSummaryMock).toHaveBeenCalledWith(
      baseInput.contentRef,
      baseInput.textbookContentPath,
      baseInput.code,
      baseInput.title,
    );
    expect(getRecentRecordsMock).toHaveBeenCalledWith(
      baseInput.userId,
      baseInput.knowledgePointId,
    );
  });

  it('should build a system prompt with identity, memory, and soule', async () => {
    await skill.execute(baseInput);

    const system = capturedMessages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('Identity');
    expect(system.content).toContain('Memory');
    expect(system.content).toContain('SOULE');
    expect(system.content).toContain(baseInput.title);
    expect(system.content).toContain(baseInput.code);
  });

  it('should map history roles to OpenAI roles and append the current question', async () => {
    await skill.execute({
      ...baseInput,
      history: [
        { role: StudyMessageRole.USER, content: '历史问题' },
        { role: StudyMessageRole.AGENT, content: '历史回答' },
      ],
    });

    expect(capturedMessages).toHaveLength(4);
    expect(capturedMessages[1]).toEqual({ role: 'user', content: '历史问题' });
    expect(capturedMessages[2]).toEqual({
      role: 'assistant',
      content: '历史回答',
    });
    expect(capturedMessages[3]).toEqual({
      role: 'user',
      content: baseInput.question,
    });
  });

  it('should return parsed follow-ups and strip the JSON block', async () => {
    chatMock.mockResolvedValueOnce({
      content: buildResponse('这是答案。', ['后续1', '后续2', '后续3']),
    });

    const result = await skill.execute(baseInput);

    expect(result.content).toBe('这是答案。');
    expect(result.followUps).toEqual(['后续1', '后续2', '后续3']);
  });

  it('should fall back to default follow-ups when the JSON block is invalid', async () => {
    chatMock.mockResolvedValueOnce({
      content: '没有 JSON 块的答案。',
    });

    const result = await skill.execute(baseInput);

    expect(result.content).toBe('没有 JSON 块的答案。');
    expect(result.followUps).toEqual(FALLBACK_FOLLOW_UPS(baseInput.title));
  });
});

describe('StudySkillRegistry', () => {
  it('should return the injected QaSkill as the default skill', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaSkill,
        StudySkillRegistry,
        {
          provide: KimiClientService,
          useValue: {
            chat: jest.fn().mockResolvedValue({ content: 'ok' }),
          } as Partial<KimiClientService>,
        },
        {
          provide: StudyAgentConfigService,
          useValue: {
            getIdentity: jest.fn().mockReturnValue(''),
            getMemory: jest.fn().mockReturnValue(''),
            getSoule: jest.fn().mockReturnValue(''),
          } as Partial<StudyAgentConfigService>,
        },
        {
          provide: KnowledgeContentService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue(''),
          } as Partial<KnowledgeContentService>,
        },
        {
          provide: LearningContextService,
          useValue: {
            getRecentRecords: jest.fn().mockResolvedValue(''),
          } as Partial<LearningContextService>,
        },
      ],
    }).compile();

    const registry = module.get<StudySkillRegistry>(StudySkillRegistry);
    const qaSkill = module.get<QaSkill>(QaSkill);

    expect(registry.getDefaultSkill()).toBe(qaSkill);
  });
});
