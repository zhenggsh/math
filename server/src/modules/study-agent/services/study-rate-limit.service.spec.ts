import { Test, TestingModule } from '@nestjs/testing';
import { StudyRateLimitService } from './study-rate-limit.service';

describe('StudyRateLimitService', () => {
  let service: StudyRateLimitService;
  const BASE_TIME = 1_000_000_000_000;
  let currentTime = BASE_TIME;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyRateLimitService],
    }).compile();

    service = module.get<StudyRateLimitService>(StudyRateLimitService);
    currentTime = BASE_TIME;
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const setTime = (ms: number): void => {
    currentTime = BASE_TIME + ms;
  };

  const advanceTime = (ms: number): void => {
    currentTime += ms;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should allow requests within the minute and hour limits', () => {
    setTime(0);
    for (let i = 0; i < 20; i += 1) {
      advanceTime(100);
      expect(service.isAllowed('user-1')).toBe(true);
    }
  });

  it('should block the 21st request within the same minute', () => {
    setTime(0);
    for (let i = 0; i < 20; i += 1) {
      expect(service.isAllowed('user-1')).toBe(true);
    }
    expect(service.isAllowed('user-1')).toBe(false);
  });

  it('should allow requests again after one minute has passed', () => {
    setTime(0);
    for (let i = 0; i < 20; i += 1) {
      expect(service.isAllowed('user-1')).toBe(true);
    }
    expect(service.isAllowed('user-1')).toBe(false);

    advanceTime(60 * 1000 + 1);
    expect(service.isAllowed('user-1')).toBe(true);
  });

  it('should block the 101st request within the same hour', () => {
    setTime(0);
    // Fill the hour limit with 5 bursts of 20 requests, each in a different minute.
    for (let minute = 0; minute < 5; minute += 1) {
      setTime(minute * 60 * 1000);
      for (let i = 0; i < 20; i += 1) {
        expect(service.isAllowed('user-1')).toBe(true);
      }
    }
    expect(service.isAllowed('user-1')).toBe(false);
  });

  it('should allow requests again after one hour has passed', () => {
    setTime(0);
    for (let minute = 0; minute < 5; minute += 1) {
      setTime(minute * 60 * 1000);
      for (let i = 0; i < 20; i += 1) {
        expect(service.isAllowed('user-1')).toBe(true);
      }
    }
    expect(service.isAllowed('user-1')).toBe(false);

    advanceTime(60 * 60 * 1000 + 1);
    expect(service.isAllowed('user-1')).toBe(true);
  });

  it('should prune timestamps older than one hour', () => {
    setTime(0);
    for (let minute = 0; minute < 5; minute += 1) {
      setTime(minute * 60 * 1000);
      for (let i = 0; i < 20; i += 1) {
        expect(service.isAllowed('user-1')).toBe(true);
      }
    }

    advanceTime(60 * 60 * 1000 + 1);
    expect(service.isAllowed('user-1')).toBe(true);
    expect(service.isAllowed('user-1')).toBe(true);
    expect(service.isAllowed('user-1')).toBe(true);
  });

  it('should track limits independently for different users', () => {
    setTime(0);
    for (let i = 0; i < 20; i += 1) {
      expect(service.isAllowed('user-1')).toBe(true);
    }
    expect(service.isAllowed('user-1')).toBe(false);

    setTime(0);
    expect(service.isAllowed('user-2')).toBe(true);
  });
});
