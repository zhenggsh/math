import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KimiClientService } from './kimi-client.service';

type MockOpenAI = jest.Mock & { createMock: jest.Mock };

jest.mock('openai', () => {
  const createMock = jest.fn();
  const OpenAIMock = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  }));

  const mockWithCreate = Object.assign(OpenAIMock, {
    createMock,
  }) as MockOpenAI;

  return {
    __esModule: true,
    default: mockWithCreate,
    OpenAI: mockWithCreate,
  };
});

describe('KimiClientService', () => {
  let service: KimiClientService;
  let createMock: jest.Mock;

  const getMockedOpenAI = (): { default: MockOpenAI; OpenAI: MockOpenAI } =>
    jest.requireMock('openai');

  const createConfigService = (
    overrides?: Record<string, string | undefined>,
  ) =>
    ({
      get: jest.fn((key: string) => {
        const values: Record<string, string | undefined> = {
          KIMI_BASE_URL: 'https://api.moonshot.cn/v1',
          KIMI_API_KEY: 'test-api-key',
          KIMI_MODEL: 'kimi-k2.6',
          ...overrides,
        };
        return values[key];
      }),
    }) as unknown as ConfigService;

  beforeEach(async () => {
    const mocked = getMockedOpenAI();
    createMock = mocked.default.createMock;
    createMock.mockReset();
    mocked.default.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KimiClientService,
        {
          provide: ConfigService,
          useValue: createConfigService(),
        },
      ],
    }).compile();

    service = module.get<KimiClientService>(KimiClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create OpenAI client with configured values on first chat call', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '你好，我是小智。' } }],
    });

    const mocked = getMockedOpenAI();
    await service.chat([{ role: 'user', content: '你好' }]);

    expect(mocked.default).toHaveBeenCalledWith({
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: 'test-api-key',
      timeout: 60000,
      maxRetries: 0,
    });
  });

  it('should call chat completions with configured model', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '你好，我是小智。' } }],
    });

    const result = await service.chat([{ role: 'user', content: '你好' }]);

    expect(createMock).toHaveBeenCalledWith({
      model: 'kimi-k2.6',
      messages: [{ role: 'user', content: '你好' }],
      thinking: { type: 'disabled' },
    });
    expect(result.content).toBe('你好，我是小智。');
  });

  it('should throw when credentials are missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KimiClientService,
        {
          provide: ConfigService,
          useValue: createConfigService({
            KIMI_BASE_URL: undefined,
            KIMI_API_KEY: undefined,
          }),
        },
      ],
    }).compile();

    const serviceWithoutCredentials =
      module.get<KimiClientService>(KimiClientService);

    await expect(
      serviceWithoutCredentials.chat([{ role: 'user', content: '你好' }]),
    ).rejects.toThrow('Kimi API credentials are not configured');
  });
});
