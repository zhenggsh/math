import { MasteryLevel, ImportanceLevel } from '@prisma/client';
import {
  calculateBaseScore,
  calculateDecayBonus,
  calculateRecentStudyPenalty,
  calculateImportanceWeight,
  calculateImprovementVelocity,
  calculateFinalScore,
  generateRecommendationReason,
  masteryLevelToNumeric,
} from './recommendation-scorer';
import type { RecommendationConfig } from './recommendation.config';

const mockConfig: RecommendationConfig = {
  decayPerDay: 2,
  decayMax: 30,
  recentPenalty: 15,
  frequencyWindowDays: 7,
  importanceWeightA: 1.5,
  importanceWeightB: 1.2,
  importanceWeightC: 1.0,
  velocityMultiplier: 10,
};

describe('Recommendation Scorer', () => {
  describe('calculateBaseScore', () => {
    it('should map mastery levels correctly', () => {
      expect(calculateBaseScore(MasteryLevel.A)).toBe(10);
      expect(calculateBaseScore(MasteryLevel.B)).toBe(20);
      expect(calculateBaseScore(MasteryLevel.C)).toBe(40);
      expect(calculateBaseScore(MasteryLevel.D)).toBe(70);
      expect(calculateBaseScore(MasteryLevel.E)).toBe(100);
    });
  });

  describe('calculateDecayBonus', () => {
    it('should calculate decay based on days since last study', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      expect(calculateDecayBonus(tenDaysAgo, mockConfig)).toBe(20);
    });

    it('should cap at decayMax', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(calculateDecayBonus(thirtyDaysAgo, mockConfig)).toBe(30);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      expect(calculateDecayBonus(today, mockConfig)).toBe(0);
    });
  });

  describe('calculateRecentStudyPenalty', () => {
    it('should return penalty if studied within window', () => {
      const records = [{ startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }];
      expect(calculateRecentStudyPenalty(records as any, mockConfig)).toBe(15);
    });

    it('should return 0 if no recent records', () => {
      const records = [{ startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }];
      expect(calculateRecentStudyPenalty(records as any, mockConfig)).toBe(0);
    });

    it('should return 0 for empty records', () => {
      expect(calculateRecentStudyPenalty([], mockConfig)).toBe(0);
    });
  });

  describe('calculateImportanceWeight', () => {
    it('should return correct weights', () => {
      expect(calculateImportanceWeight(ImportanceLevel.A, mockConfig)).toBe(1.5);
      expect(calculateImportanceWeight(ImportanceLevel.B, mockConfig)).toBe(1.2);
      expect(calculateImportanceWeight(ImportanceLevel.C, mockConfig)).toBe(1.0);
    });
  });

  describe('calculateImprovementVelocity', () => {
    it('should calculate positive velocity for improvement', () => {
      const records = [
        { masteryLevel: MasteryLevel.D, startTime: new Date('2024-01-01') },
        { masteryLevel: MasteryLevel.C, startTime: new Date('2024-01-02') },
      ];
      expect(calculateImprovementVelocity(records as any, mockConfig)).toBe(10);
    });

    it('should calculate negative velocity for regression', () => {
      const records = [
        { masteryLevel: MasteryLevel.C, startTime: new Date('2024-01-01') },
        { masteryLevel: MasteryLevel.D, startTime: new Date('2024-01-02') },
      ];
      expect(calculateImprovementVelocity(records as any, mockConfig)).toBe(-10);
    });

    it('should return 0 for single record', () => {
      const records = [{ masteryLevel: MasteryLevel.C, startTime: new Date('2024-01-01') }];
      expect(calculateImprovementVelocity(records as any, mockConfig)).toBe(0);
    });

    it('should return 0 for empty records', () => {
      expect(calculateImprovementVelocity([], mockConfig)).toBe(0);
    });
  });

  describe('calculateFinalScore', () => {
    it('should calculate correct final score', () => {
      const score = {
        baseScore: 100,
        decayBonus: 20,
        recentStudyPenalty: 15,
        importanceWeight: 1.5,
        improvementVelocity: -10,
      };
      // (100 + 20 - 15 - (-10)) * 1.5 = 115 * 1.5 = 172.5
      expect(calculateFinalScore(score)).toBe(172.5);
    });

    it('should allow negative scores', () => {
      const score = {
        baseScore: 10,
        decayBonus: 0,
        recentStudyPenalty: 15,
        importanceWeight: 1.0,
        improvementVelocity: 10,
      };
      expect(calculateFinalScore(score)).toBe(-15);
    });
  });

  describe('generateRecommendationReason', () => {
    it('should prioritize recent study penalty', () => {
      const score = { baseScore: 100, decayBonus: 0, recentStudyPenalty: 15, importanceWeight: 1.0, improvementVelocity: 0 };
      expect(generateRecommendationReason(score)).toBe('近期已学习过，建议先复习其他知识点');
    });

    it('should detect decay bonus', () => {
      const score = { baseScore: 100, decayBonus: 20, recentStudyPenalty: 0, importanceWeight: 1.0, improvementVelocity: 0 };
      expect(generateRecommendationReason(score)).toBe('距离上次学习已超过 10 天，建议复习');
    });

    it('should detect low mastery', () => {
      const score = { baseScore: 100, decayBonus: 0, recentStudyPenalty: 0, importanceWeight: 1.0, improvementVelocity: 0 };
      expect(generateRecommendationReason(score)).toBe('掌握度较低，需要加强');
    });

    it('should detect regression', () => {
      const score = { baseScore: 40, decayBonus: 0, recentStudyPenalty: 0, importanceWeight: 1.0, improvementVelocity: -10 };
      expect(generateRecommendationReason(score)).toBe('近期掌握度下降，需要巩固');
    });

    it('should detect high importance', () => {
      const score = { baseScore: 40, decayBonus: 0, recentStudyPenalty: 0, importanceWeight: 1.5, improvementVelocity: 0 };
      expect(generateRecommendationReason(score)).toBe('重要知识点，优先掌握');
    });

    it('should return default reason', () => {
      const score = { baseScore: 20, decayBonus: 0, recentStudyPenalty: 0, importanceWeight: 1.0, improvementVelocity: 0 };
      expect(generateRecommendationReason(score)).toBe('根据你的学习情况推荐');
    });
  });

  describe('masteryLevelToNumeric', () => {
    it('should map correctly', () => {
      expect(masteryLevelToNumeric(MasteryLevel.A)).toBe(5);
      expect(masteryLevelToNumeric(MasteryLevel.B)).toBe(4);
      expect(masteryLevelToNumeric(MasteryLevel.C)).toBe(3);
      expect(masteryLevelToNumeric(MasteryLevel.D)).toBe(2);
      expect(masteryLevelToNumeric(MasteryLevel.E)).toBe(1);
    });
  });
});
