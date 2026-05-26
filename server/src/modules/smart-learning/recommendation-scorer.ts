import { MasteryLevel, ImportanceLevel } from '@prisma/client';
import type { RecommendationConfig } from './recommendation.config';

export interface ScoreComponents {
  baseScore: number;
  decayBonus: number;
  recentStudyPenalty: number;
  importanceWeight: number;
  improvementVelocity: number;
}

export function calculateBaseScore(masteryLevel: MasteryLevel): number {
  const scores: Record<MasteryLevel, number> = {
    [MasteryLevel.A]: 10,
    [MasteryLevel.B]: 20,
    [MasteryLevel.C]: 40,
    [MasteryLevel.D]: 70,
    [MasteryLevel.E]: 100,
  };
  return scores[masteryLevel] ?? 0;
}

export function calculateDecayBonus(
  latestStartTime: Date,
  config: RecommendationConfig,
): number {
  const daysSince = Math.floor(
    (Date.now() - latestStartTime.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.min(config.decayMax, daysSince * config.decayPerDay);
}

export function calculateRecentStudyPenalty(
  records: Array<{ startTime: Date }>,
  config: RecommendationConfig,
): number {
  if (records.length === 0) return 0;
  const cutoff = new Date(Date.now() - config.frequencyWindowDays * 24 * 60 * 60 * 1000);
  const hasRecent = records.some((r) => r.startTime >= cutoff);
  return hasRecent ? config.recentPenalty : 0;
}

export function calculateImportanceWeight(
  importanceLevel: ImportanceLevel,
  config: RecommendationConfig,
): number {
  const weights: Record<ImportanceLevel, number> = {
    [ImportanceLevel.A]: config.importanceWeightA,
    [ImportanceLevel.B]: config.importanceWeightB,
    [ImportanceLevel.C]: config.importanceWeightC,
  };
  return weights[importanceLevel] ?? 1.0;
}

export function masteryLevelToNumeric(masteryLevel: MasteryLevel): number {
  const mapping: Record<MasteryLevel, number> = {
    [MasteryLevel.A]: 5,
    [MasteryLevel.B]: 4,
    [MasteryLevel.C]: 3,
    [MasteryLevel.D]: 2,
    [MasteryLevel.E]: 1,
  };
  return mapping[masteryLevel] ?? 0;
}

export function calculateImprovementVelocity(
  records: Array<{ masteryLevel: MasteryLevel; startTime: Date }>,
  config: RecommendationConfig,
): number {
  if (records.length < 2) return 0;
  const sorted = [...records].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );
  const previous = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  const diff =
    masteryLevelToNumeric(latest.masteryLevel) -
    masteryLevelToNumeric(previous.masteryLevel);
  return diff * config.velocityMultiplier;
}

export function calculateFinalScore(components: ScoreComponents): number {
  const weightedBase =
    components.baseScore +
    components.decayBonus -
    components.recentStudyPenalty -
    components.improvementVelocity;
  return weightedBase * components.importanceWeight;
}

export function generateRecommendationReason(components: ScoreComponents): string {
  if (components.recentStudyPenalty > 0) {
    return '近期已学习过，建议先复习其他知识点';
  }
  if (components.decayBonus >= 20) {
    return '距离上次学习已超过 10 天，建议复习';
  }
  if (components.baseScore >= 70) {
    return '掌握度较低，需要加强';
  }
  if (components.improvementVelocity < 0) {
    return '近期掌握度下降，需要巩固';
  }
  if (components.importanceWeight >= 1.5) {
    return '重要知识点，优先掌握';
  }
  return '根据你的学习情况推荐';
}
