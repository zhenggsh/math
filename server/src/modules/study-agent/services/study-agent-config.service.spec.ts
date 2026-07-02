import { Test, TestingModule } from '@nestjs/testing';
import { StudyAgentConfigService } from './study-agent-config.service';
import * as fs from 'fs';

jest.mock('fs', () => {
  const actualFs = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn(),
  };
});

const readFileSyncMock = fs.readFileSync as jest.Mock;

describe('StudyAgentConfigService', () => {
  let service: StudyAgentConfigService;

  const readActualFile = (
    filePath: fs.PathOrFileDescriptor,
    options: BufferEncoding,
  ): string =>
    jest
      .requireActual<typeof import('fs')>('fs')
      .readFileSync(filePath, options);

  beforeEach(async () => {
    readFileSyncMock.mockImplementation(
      (filePath: fs.PathOrFileDescriptor, options: BufferEncoding) => {
        return readActualFile(filePath, options);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyAgentConfigService],
    }).compile();

    service = module.get<StudyAgentConfigService>(StudyAgentConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load identity config from file', () => {
    const identity = service.getIdentity();
    expect(identity).toContain('知识通');
    expect(identity).toContain('小智');
  });

  it('should load memory config from file', () => {
    const memory = service.getMemory();
    expect(memory).toContain('学习记录');
    expect(memory).toContain('教学策略偏好');
  });

  it('should load SOULE values from file', () => {
    const soule = service.getSoule();
    expect(soule).toContain('Supportive');
    expect(soule).toContain('Learner-centered');
  });

  it('should return empty string when a config file is missing', async () => {
    readFileSyncMock.mockImplementation(
      (filePath: fs.PathOrFileDescriptor, options: BufferEncoding) => {
        if (typeof filePath === 'string' && filePath.endsWith('Memory.md')) {
          throw new Error('ENOENT: no such file or directory');
        }
        return readActualFile(filePath, options);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyAgentConfigService],
    }).compile();

    const missingService = module.get<StudyAgentConfigService>(
      StudyAgentConfigService,
    );

    expect(missingService.getMemory()).toBe('');
    expect(missingService.getIdentity()).toContain('知识通');
  });
});
