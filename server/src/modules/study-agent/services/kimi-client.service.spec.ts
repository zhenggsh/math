import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KimiClientService } from './kimi-client.service';

jest.mock('openai', () => {
  const createMock = jest.fn();
  const OpenAIMock = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  }));

  return {
    __esModule: true,
    default: Object.assign(OpenAIMock, { createMock }),
    OpenAI: Object.assign(OpenAIMock, { createMock }),
  };
});

describe('KimiClientService', () => {
  let service: KimiClientService;
  let createMock: jest.Mock;

  beforeEach(async () => {
    const mocked = jest.requireMock('openai') as {
      default: jest.Mock & { createMock: jest.Mock };
    };
    createMock = mocked.default.createMock;
    createMock.mockReset();
    mocked.default.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KimiClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                KIMI_BASE_URL: 'https://api.moonshot.cn/v1',
                KIMI_API_KEY: 'test-api-key',
                KIMI_MODEL: 'kimi-k2-0711-preview',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KimiClientService>(KimiClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create OpenAI client with configured values', () => {
    const mocked = jest.requireMock('openai') as {
      default: jest.Mock;
    };
    expect(mocked.default).toHaveBeenCalledWith({
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: 'test-api-key',
      timeout: 30000,
      maxRetries: 1,
    });
  });

  it('should call chat completions with configured model', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '你好，我是小智。' } }],
    });

    const result = await service.chat([
      { role: 'user', content: '你好' },
    ]);

    expect(createMock).toHaveBeenCalledWith({
      model: 'kimi-k2-0711-preview',
      messages: [{ role: 'user', content: '你好' }],
    });
    expect(result.content).toBe('你好，我是小智。');
  });
});
