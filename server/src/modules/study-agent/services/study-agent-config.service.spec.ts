import { Test, TestingModule } from '@nestjs/testing';
import { StudyAgentConfigService } from './study-agent-config.service';

describe('StudyAgentConfigService', () => {
  let service: StudyAgentConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyAgentConfigService],
    }).compile();

    service = module.get<StudyAgentConfigService>(StudyAgentConfigService);
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
});
