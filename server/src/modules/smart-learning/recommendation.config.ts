import { registerAs } from '@nestjs/config';

export interface RecommendationConfig {
  decayPerDay: number;
  decayMax: number;
  recentPenalty: number;
  frequencyWindowDays: number;
  importanceWeightA: number;
  importanceWeightB: number;
  importanceWeightC: number;
  velocityMultiplier: number;
}

export const recommendationConfig = registerAs(
  'recommendation',
  (): RecommendationConfig => ({
    decayPerDay: parseInt(process.env.RECOMMENDATION_DECAY_PER_DAY ?? '2', 10),
    decayMax: parseInt(process.env.RECOMMENDATION_DECAY_MAX ?? '30', 10),
    recentPenalty: parseInt(
      process.env.RECOMMENDATION_RECENT_PENALTY ?? '15',
      10,
    ),
    frequencyWindowDays: parseInt(
      process.env.RECOMMENDATION_FREQUENCY_WINDOW_DAYS ?? '7',
      10,
    ),
    importanceWeightA: parseFloat(
      process.env.RECOMMENDATION_IMPORTANCE_A ?? '1.5',
    ),
    importanceWeightB: parseFloat(
      process.env.RECOMMENDATION_IMPORTANCE_B ?? '1.2',
    ),
    importanceWeightC: parseFloat(
      process.env.RECOMMENDATION_IMPORTANCE_C ?? '1.0',
    ),
    velocityMultiplier: parseInt(
      process.env.RECOMMENDATION_VELOCITY_MULTIPLIER ?? '10',
      10,
    ),
  }),
);
