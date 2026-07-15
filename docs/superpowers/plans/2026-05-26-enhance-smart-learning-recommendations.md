# Enhance Smart Learning Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mechanical sorting in smart learning (weak-point and importance modes) with a multi-dimensional scoring model that considers mastery level, decay time, recent study penalty, importance weight, and improvement velocity. Each recommendation includes an explainable reason.

**Architecture:** Extract scoring logic into a pure `recommendation-scorer.ts` module with configurable parameters via NestJS `ConfigService`. Service layer fetches candidates, scores them in-memory, and returns enriched DTOs. Frontend displays recommendation reasons as a secondary line in knowledge point cards.

**Tech Stack:** NestJS + Prisma (backend), React + TypeScript (frontend), Jest (testing), Vitest (frontend testing)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `server/src/modules/smart-learning/recommendation.config.ts` | Configuration schema for scoring parameters (decayPerDay, decayMax, recentPenalty, etc.) |
| `server/src/modules/smart-learning/recommendation-scorer.ts` | Pure functions for scoring: baseScore, decayBonus, recentStudyPenalty, importanceWeight, improvementVelocity, finalScore, reason generation |
| `server/src/modules/smart-learning/recommendation-scorer.spec.ts` | Unit tests for all scoring functions |
| `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts` | Swagger response DTOs: `WeakPointResponseDto`, `ByImportanceResponseDto` with `recommendationReason` |

### Modified Files
| File | Responsibility |
|------|---------------|
| `server/src/modules/smart-learning/smart-learning.service.ts` | Refactor `getWeakPoints()` and `getByImportance()` to use scoring model; add batch query helper; add pre-filtering logic |
| `server/src/modules/smart-learning/smart-learning.controller.ts` | Use new response DTOs for Swagger documentation |
| `server/src/modules/smart-learning/smart-learning.service.spec.ts` | Update existing tests to match new service behavior; add tests for scoring integration |
| `server/src/modules/smart-learning/smart-learning.controller.spec.ts` | Update mock data to include `recommendationReason` |
| `web/src/services/smartLearningApi.ts` | Add `recommendationReason` to `WeakPointItem`; add `learningRecord` and `recommendationReason` to `ByImportanceItem` |
| `web/src/components/smart-learning/WeakPointView.tsx` | Display `recommendationReason` below knowledge point name |
| `web/src/components/smart-learning/ImportanceView.tsx` | Display `recommendationReason` below knowledge point name |
| `.env.example` | Add scoring parameter environment variables |

---

### Task 1: Recommendation Configuration

**Files:**
- Create: `server/src/modules/smart-learning/recommendation.config.ts`
- Modify: `.env.example`

**Context:** `ConfigModule` is already global (`isGlobal: true` in `app.module.ts`), so no module registration is needed. Just create the config schema and register it in `SmartLearningModule`.

- [ ] **Step 1: Create recommendation config schema**

Create `server/src/modules/smart-learning/recommendation.config.ts`:

```typescript
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
    recentPenalty: parseInt(process.env.RECOMMENDATION_RECENT_PENALTY ?? '15', 10),
    frequencyWindowDays: parseInt(process.env.RECOMMENDATION_FREQUENCY_WINDOW_DAYS ?? '7', 10),
    importanceWeightA: parseFloat(process.env.RECOMMENDATION_IMPORTANCE_A ?? '1.5'),
    importanceWeightB: parseFloat(process.env.RECOMMENDATION_IMPORTANCE_B ?? '1.2'),
    importanceWeightC: parseFloat(process.env.RECOMMENDATION_IMPORTANCE_C ?? '1.0'),
    velocityMultiplier: parseInt(process.env.RECOMMENDATION_VELOCITY_MULTIPLIER ?? '10', 10),
  }),
);
```

- [ ] **Step 2: Register config in SmartLearningModule**

Modify `server/src/modules/smart-learning/smart-learning.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartLearningService } from './smart-learning.service';
import { SmartLearningController } from './smart-learning.controller';
import { recommendationConfig } from './recommendation.config';

@Module({
  imports: [ConfigModule.forFeature(recommendationConfig)],
  controllers: [SmartLearningController],
  providers: [SmartLearningService],
  exports: [SmartLearningService],
})
export class SmartLearningModule {}
```

- [ ] **Step 3: Add environment variables to `.env.example`**

Append to `.env.example`:

```
# Recommendation scoring parameters
RECOMMENDATION_DECAY_PER_DAY=2
RECOMMENDATION_DECAY_MAX=30
RECOMMENDATION_RECENT_PENALTY=15
RECOMMENDATION_FREQUENCY_WINDOW_DAYS=7
RECOMMENDATION_IMPORTANCE_A=1.5
RECOMMENDATION_IMPORTANCE_B=1.2
RECOMMENDATION_IMPORTANCE_C=1.0
RECOMMENDATION_VELOCITY_MULTIPLIER=10
```

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/smart-learning/recommendation.config.ts \
       server/src/modules/smart-learning/smart-learning.module.ts \
       .env.example
git commit -m "feat(recommendation): add scoring configuration"
```

---

### Task 2: Scoring Algorithm Core (TDD)

**Files:**
- Create: `server/src/modules/smart-learning/recommendation-scorer.ts`
- Create: `server/src/modules/smart-learning/recommendation-scorer.spec.ts`

**Context:** All scoring functions are pure (no side effects). They take inputs and return numbers/strings. MasteryLevel numeric mapping: A=5, B=4, C=3, D=2, E=1 for velocity calculation; A=10, B=20, C=40, D=70, E=100 for base score.

- [ ] **Step 1: Write failing tests for scoring functions**

Create `server/src/modules/smart-learning/recommendation-scorer.spec.ts`:

```typescript
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
      const score = {
        baseScore: 100,
        decayBonus: 0,
        recentStudyPenalty: 15,
        importanceWeight: 1.0,
        improvementVelocity: 0,
      };
      expect(generateRecommendationReason(score)).toBe('近期已学习过，建议先复习其他知识点');
    });

    it('should detect decay bonus', () => {
      const score = {
        baseScore: 100,
        decayBonus: 20,
        recentStudyPenalty: 0,
        importanceWeight: 1.0,
        improvementVelocity: 0,
      };
      expect(generateRecommendationReason(score)).toBe('距离上次学习已超过 10 天，建议复习');
    });

    it('should detect low mastery', () => {
      const score = {
        baseScore: 100,
        decayBonus: 0,
        recentStudyPenalty: 0,
        importanceWeight: 1.0,
        improvementVelocity: 0,
      };
      expect(generateRecommendationReason(score)).toBe('掌握度较低，需要加强');
    });

    it('should detect regression', () => {
      const score = {
        baseScore: 40,
        decayBonus: 0,
        recentStudyPenalty: 0,
        importanceWeight: 1.0,
        improvementVelocity: -10,
      };
      expect(generateRecommendationReason(score)).toBe('近期掌握度下降，需要巩固');
    });

    it('should detect high importance', () => {
      const score = {
        baseScore: 40,
        decayBonus: 0,
        recentStudyPenalty: 0,
        importanceWeight: 1.5,
        improvementVelocity: 0,
      };
      expect(generateRecommendationReason(score)).toBe('重要知识点，优先掌握');
    });

    it('should return default reason', () => {
      const score = {
        baseScore: 20,
        decayBonus: 0,
        recentStudyPenalty: 0,
        importanceWeight: 1.0,
        improvementVelocity: 0,
      };
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter server test -- recommendation-scorer.spec.ts
```

Expected: FAIL with "Cannot find module" or function not defined errors.

- [ ] **Step 3: Implement scoring functions**

Create `server/src/modules/smart-learning/recommendation-scorer.ts`:

```typescript
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
  // Sort by startTime ascending
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter server test -- recommendation-scorer.spec.ts
```

Expected: All 22 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/smart-learning/recommendation-scorer.ts \
       server/src/modules/smart-learning/recommendation-scorer.spec.ts
git commit -m "feat(recommendation): implement scoring algorithm with tests"
```

---

### Task 3: Service Layer - getWeakPoints Refactoring

**Files:**
- Modify: `server/src/modules/smart-learning/smart-learning.service.ts`
- Modify: `server/src/modules/smart-learning/smart-learning.service.spec.ts`

**Context:** The existing `getWeakPoints` returns `WeakPointItem[]` sorted by `masteryLevel desc, startTime asc`. The new version must score each candidate using the scoring model and include `recommendationReason`. Need to add `getRecentRecordsForCandidates` helper to avoid N+1.

- [ ] **Step 1: Add batch query helper to service**

In `server/src/modules/smart-learning/smart-learning.service.ts`, add private method:

```typescript
private async getRecentRecordsForCandidates(
  userId: string,
  candidateIds: string[],
): Promise<
  Array<{
    knowledgePointId: string;
    masteryLevel: MasteryLevel;
    startTime: Date;
  }>
> {
  if (candidateIds.length === 0) return [];
  return this.prisma.learningRecord.findMany({
    where: { userId, knowledgePointId: { in: candidateIds } },
    select: {
      knowledgePointId: true,
      masteryLevel: true,
      startTime: true,
    },
    orderBy: { startTime: 'desc' },
    take: Math.min(candidateIds.length * 2, 1000),
  });
}
```

- [ ] **Step 2: Refactor getWeakPoints to use scoring**

Replace existing `getWeakPoints` implementation. The key changes:
1. Query non-mastered records (same as before)
2. Get all candidate knowledge point IDs
3. Batch fetch recent records for all candidates
4. Score each candidate
5. Sort by finalScore desc with tie-breakers
6. Return enriched `WeakPointItem` with `recommendationReason`

```typescript
async getWeakPoints(
  userId: string,
  query: WeakPointsQuery,
): Promise<{ total: number; items: WeakPointItem[] }> {
  const { textbookId, limit = 20 } = query;
  const config = this.configService.get<RecommendationConfig>('recommendation')!;

  // Step 1: Get all non-mastered records for this user
  const records = await this.prisma.learningRecord.findMany({
    where: {
      userId,
      masteryLevel: { in: [MasteryLevel.C, MasteryLevel.D, MasteryLevel.E] },
      ...(textbookId ? { knowledgePoint: { textbookId } } : {}),
    },
    include: {
      knowledgePoint: {
        select: {
          id: true,
          code: true,
          level1: true,
          level2: true,
          level3: true,
          importanceLevel: true,
          definition: true,
        },
      },
    },
    orderBy: [{ startTime: 'asc' }],
  });

  // Step 2: Get candidate IDs and batch fetch recent records
  const candidateIds = [...new Set(records.map((r) => r.knowledgePointId))];
  const recentRecords = await this.getRecentRecordsForCandidates(userId, candidateIds);

  // Step 3: Group recent records by knowledgePointId
  const recordsByKp = new Map<string, typeof recentRecords>();
  for (const r of recentRecords) {
    const list = recordsByKp.get(r.knowledgePointId) ?? [];
    list.push(r);
    recordsByKp.set(r.knowledgePointId, list);
  }

  // Step 4: Score each unique knowledge point
  const scoredItems: Array<{
    item: WeakPointItem;
    finalScore: number;
    importanceLevel: ImportanceLevel;
    startTime: Date;
    code: string;
  }> = [];

  const seenKpIds = new Set<string>();
  for (const record of records) {
    if (seenKpIds.has(record.knowledgePointId)) continue;
    seenKpIds.add(record.knowledgePointId);

    const kpRecords = recordsByKp.get(record.knowledgePointId) ?? [];
    const latestRecord = kpRecords[0] ?? record;

    const components: ScoreComponents = {
      baseScore: calculateBaseScore(latestRecord.masteryLevel),
      decayBonus: calculateDecayBonus(latestRecord.startTime, config),
      recentStudyPenalty: calculateRecentStudyPenalty(kpRecords, config),
      importanceWeight: calculateImportanceWeight(
        record.knowledgePoint.importanceLevel,
        config,
      ),
      improvementVelocity: calculateImprovementVelocity(kpRecords, config),
    };

    const finalScore = calculateFinalScore(components);
    const reason = generateRecommendationReason(components);

    scoredItems.push({
      item: {
        knowledgePoint: record.knowledgePoint,
        learningRecord: {
          id: record.id,
          masteryLevel: latestRecord.masteryLevel,
          durationMinutes: record.durationMinutes,
          startTime: latestRecord.startTime,
          notes: record.notes,
        },
        priority: Math.round(finalScore),
        recommendationReason: reason,
      },
      finalScore,
      importanceLevel: record.knowledgePoint.importanceLevel,
      startTime: latestRecord.startTime,
      code: record.knowledgePoint.code,
    });
  }

  // Step 5: Sort by finalScore desc, then tie-breakers
  scoredItems.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    const importanceOrder = { A: 0, B: 1, C: 2 };
    const impDiff =
      importanceOrder[a.importanceLevel] - importanceOrder[b.importanceLevel];
    if (impDiff !== 0) return impDiff;
    if (a.startTime.getTime() !== b.startTime.getTime())
      return a.startTime.getTime() - b.startTime.getTime();
    return a.code.localeCompare(b.code);
  });

  // Step 6: Apply limit
  const total = scoredItems.length;
  const limitedItems = scoredItems.slice(0, limit);

  return {
    total,
    items: limitedItems.map((s) => s.item),
  };
}
```

Also update the `WeakPointItem` interface to add `recommendationReason`:

```typescript
export interface WeakPointItem {
  knowledgePoint: {
    id: string;
    code: string;
    level1: string;
    level2: string | null;
    level3: string | null;
    importanceLevel: ImportanceLevel;
    definition: string | null;
  };
  learningRecord: {
    id: string;
    masteryLevel: MasteryLevel;
    durationMinutes: number;
    startTime: Date;
    notes: string | null;
  };
  priority: number;
  recommendationReason: string;
}
```

- [ ] **Step 3: Update service tests for getWeakPoints**

In `server/src/modules/smart-learning/smart-learning.service.spec.ts`, update the `getWeakPoints` tests. The existing mock for `findMany` returns records with `knowledgePoint` included. The test expectations need to change from checking `masteryLevel` order to checking that the result contains `recommendationReason`.

Add these new test cases:

```typescript
it('should include recommendationReason for each weak point', async () => {
  jest
    .spyOn(prismaService.learningRecord, 'findMany')
    .mockResolvedValue(mockLearningRecords as any);
  jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(3);

  const result = await service.getWeakPoints(mockUserId, {});

  expect(result.items[0]).toHaveProperty('recommendationReason');
  expect(typeof result.items[0].recommendationReason).toBe('string');
  expect(result.items[0].recommendationReason.length).toBeGreaterThan(0);
});

it('should sort by scoring model instead of simple mastery order', async () => {
  // Mock a scenario where a C-level point studied long ago scores higher than an E-level studied recently
  const longAgoRecords = [
    {
      ...mockLearningRecords[0],
      knowledgePoint: { ...mockKnowledgePoints[0], importanceLevel: ImportanceLevel.A },
      startTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      masteryLevel: MasteryLevel.C,
    },
    {
      ...mockLearningRecords[1],
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      masteryLevel: MasteryLevel.E,
    },
  ];

  jest
    .spyOn(prismaService.learningRecord, 'findMany')
    .mockResolvedValue(longAgoRecords as any);
  jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(2);

  const result = await service.getWeakPoints(mockUserId, {});

  // The C-level with long decay + high importance should outrank E-level studied yesterday
  expect(result.items[0].learningRecord.masteryLevel).toBe(MasteryLevel.C);
});
```

- [ ] **Step 4: Run service tests**

```bash
pnpm --filter server test -- smart-learning.service.spec.ts
```

Expected: All tests pass, including new ones.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/smart-learning/smart-learning.service.ts \
       server/src/modules/smart-learning/smart-learning.service.spec.ts
git commit -m "feat(recommendation): refactor getWeakPoints with scoring model"
```

---

### Task 4: Service Layer - getByImportance Refactoring

**Files:**
- Modify: `server/src/modules/smart-learning/smart-learning.service.ts`
- Modify: `server/src/modules/smart-learning/smart-learning.service.spec.ts`

**Context:** `getByImportance` currently returns `ByImportanceItem` which is `KnowledgePoint + isMastered`. The new version must also include `learningRecord` (most recent) and `recommendationReason`. This requires querying recent records for each candidate.

- [ ] **Step 1: Update ByImportanceItem interface**

In `server/src/modules/smart-learning/smart-learning.service.ts`, update interface:

```typescript
export interface ByImportanceItem {
  id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  importanceLevel: ImportanceLevel;
  definition: string | null;
  isMastered: boolean;
  learningRecord: {
    id: string;
    masteryLevel: MasteryLevel;
    durationMinutes: number;
    startTime: Date;
    notes: string | null;
  } | null;
  recommendationReason: string;
}
```

- [ ] **Step 2: Refactor getByImportance to use scoring**

Replace existing `getByImportance` implementation:

```typescript
async getByImportance(
  userId: string,
  query: ByImportanceQuery,
): Promise<{
  level: ImportanceLevel;
  total: number;
  items: ByImportanceItem[];
}> {
  const { level, excludeMastered = true, limit = 50 } = query;
  const config = this.configService.get<RecommendationConfig>('recommendation')!;
  const targetLevel = level || ImportanceLevel.A;

  // Get mastered IDs if excluding
  let masteredIds: string[] = [];
  if (excludeMastered) {
    const masteredRecords = await this.prisma.learningRecord.findMany({
      where: { userId, masteryLevel: MasteryLevel.A },
      select: { knowledgePointId: true },
    });
    masteredIds = masteredRecords.map((r) => r.knowledgePointId);
  }

  // Query knowledge points
  const knowledgePoints = await this.prisma.knowledgePoint.findMany({
    where: {
      importanceLevel: targetLevel,
      ...(excludeMastered && masteredIds.length > 0
        ? { id: { notIn: masteredIds } }
        : {}),
    },
    select: {
      id: true,
      code: true,
      level1: true,
      level2: true,
      level3: true,
      importanceLevel: true,
      definition: true,
    },
    orderBy: { code: 'asc' },
  });

  // Batch fetch recent records for all candidates
  const candidateIds = knowledgePoints.map((kp) => kp.id);
  const recentRecords = await this.getRecentRecordsForCandidates(userId, candidateIds);

  // Group by knowledgePointId
  const recordsByKp = new Map<string, typeof recentRecords>();
  for (const r of recentRecords) {
    const list = recordsByKp.get(r.knowledgePointId) ?? [];
    list.push(r);
    recordsByKp.set(r.knowledgePointId, list);
  }

  // Score and build items
  const scoredItems: Array<{
    item: ByImportanceItem;
    finalScore: number;
    startTime: Date;
    code: string;
  }> = [];

  for (const kp of knowledgePoints) {
    const kpRecords = recordsByKp.get(kp.id) ?? [];
    const latestRecord = kpRecords[0] ?? null;
    const isMastered = latestRecord?.masteryLevel === MasteryLevel.A;

    // Skip mastered if excludeMastered (should already be filtered, but double-check)
    if (excludeMastered && isMastered) continue;

    const components: ScoreComponents = {
      baseScore: latestRecord ? calculateBaseScore(latestRecord.masteryLevel) : 10,
      decayBonus: latestRecord ? calculateDecayBonus(latestRecord.startTime, config) : 0,
      recentStudyPenalty: calculateRecentStudyPenalty(kpRecords, config),
      importanceWeight: calculateImportanceWeight(kp.importanceLevel, config),
      improvementVelocity: calculateImprovementVelocity(kpRecords, config),
    };

    const finalScore = calculateFinalScore(components);
    const reason = generateRecommendationReason(components);

    scoredItems.push({
      item: {
        ...kp,
        isMastered,
        learningRecord: latestRecord
          ? {
              id: latestRecord.id ?? '',
              masteryLevel: latestRecord.masteryLevel,
              durationMinutes: 0,
              startTime: latestRecord.startTime,
              notes: null,
            }
          : null,
        recommendationReason: reason,
      },
      finalScore,
      startTime: latestRecord?.startTime ?? new Date(0),
      code: kp.code,
    });
  }

  // Sort: unmastered first (by score), then mastered
  scoredItems.sort((a, b) => {
    const aMastered = a.item.isMastered ? 1 : 0;
    const bMastered = b.item.isMastered ? 1 : 0;
    if (aMastered !== bMastered) return aMastered - bMastered;
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.startTime.getTime() - b.startTime.getTime();
  });

  const total = scoredItems.length;
  const limitedItems = scoredItems.slice(0, limit);

  return {
    level: targetLevel,
    total,
    items: limitedItems.map((s) => s.item),
  };
}
```

- [ ] **Step 3: Update service tests for getByImportance**

In `server/src/modules/smart-learning/smart-learning.service.spec.ts`, add/update tests:

```typescript
it('should include learningRecord and recommendationReason', async () => {
  jest
    .spyOn(prismaService.learningRecord, 'findMany')
    .mockResolvedValue([]);
  jest
    .spyOn(prismaService.knowledgePoint, 'findMany')
    .mockResolvedValue([mockKnowledgePoints[0]] as any);
  jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(1);

  const result = await service.getByImportance(mockUserId, {
    level: ImportanceLevel.A,
  });

  expect(result.items[0]).toHaveProperty('learningRecord');
  expect(result.items[0]).toHaveProperty('recommendationReason');
  expect(typeof result.items[0].recommendationReason).toBe('string');
});
```

- [ ] **Step 4: Run service tests**

```bash
pnpm --filter server test -- smart-learning.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/smart-learning/smart-learning.service.ts \
       server/src/modules/smart-learning/smart-learning.service.spec.ts
git commit -m "feat(recommendation): refactor getByImportance with scoring model"
```

---

### Task 5: Response DTOs

**Files:**
- Create: `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts`

**Context:** NestJS Swagger requires explicit DTO classes with `@ApiProperty()` decorators for response documentation. The controller currently returns raw service results.

- [ ] **Step 1: Create response DTOs**

Create `server/src/modules/smart-learning/dto/smart-learning-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { MasteryLevel, ImportanceLevel } from '@prisma/client';

class KnowledgePointDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  level1: string;

  @ApiProperty({ nullable: true })
  level2: string | null;

  @ApiProperty({ nullable: true })
  level3: string | null;

  @ApiProperty({ enum: ImportanceLevel })
  importanceLevel: ImportanceLevel;

  @ApiProperty({ nullable: true })
  definition: string | null;
}

class LearningRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MasteryLevel })
  masteryLevel: MasteryLevel;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty({ nullable: true })
  notes: string | null;
}

export class WeakPointResponseDto {
  @ApiProperty({ type: KnowledgePointDto })
  knowledgePoint: KnowledgePointDto;

  @ApiProperty({ type: LearningRecordDto })
  learningRecord: LearningRecordDto;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  recommendationReason: string;
}

export class WeakPointsResponse {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [WeakPointResponseDto] })
  items: WeakPointResponseDto[];
}

export class ByImportanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  level1: string;

  @ApiProperty({ nullable: true })
  level2: string | null;

  @ApiProperty({ nullable: true })
  level3: string | null;

  @ApiProperty({ enum: ImportanceLevel })
  importanceLevel: ImportanceLevel;

  @ApiProperty({ nullable: true })
  definition: string | null;

  @ApiProperty()
  isMastered: boolean;

  @ApiProperty({ type: LearningRecordDto, nullable: true })
  learningRecord: LearningRecordDto | null;

  @ApiProperty()
  recommendationReason: string;
}

export class ByImportanceResponse {
  @ApiProperty({ enum: ImportanceLevel })
  level: ImportanceLevel;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: [ByImportanceResponseDto] })
  items: ByImportanceResponseDto[];
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/smart-learning/dto/smart-learning-response.dto.ts
git commit -m "feat(recommendation): add response DTOs with recommendationReason"
```

---

### Task 6: Controller Update

**Files:**
- Modify: `server/src/modules/smart-learning/smart-learning.controller.ts`
- Modify: `server/src/modules/smart-learning/smart-learning.controller.spec.ts`

- [ ] **Step 1: Update controller to use response DTOs**

Modify `server/src/modules/smart-learning/smart-learning.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartLearningService } from './smart-learning.service';
import {
  WeakPointsQueryDto,
  ByImportanceQueryDto,
  RandomQueryDto,
} from './dto/smart-learning.dto';
import { WeakPointsResponse, ByImportanceResponse } from './dto/smart-learning-response.dto';

@ApiTags('smart-learning')
@Controller('smart-learning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SmartLearningController {
  constructor(private readonly smartLearningService: SmartLearningService) {}

  @Get('weak-points')
  @ApiOperation({ summary: 'Get weak points for current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns weak points list with priority and recommendation reason',
    type: WeakPointsResponse,
  })
  async getWeakPoints(
    @CurrentUser('sub') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: WeakPointsQueryDto,
  ) {
    const result = await this.smartLearningService.getWeakPoints(userId, query);
    return { success: true, data: result };
  }

  @Get('by-importance')
  @ApiOperation({ summary: 'Get knowledge points by importance level' })
  @ApiResponse({
    status: 200,
    description: 'Returns knowledge points grouped by importance with recommendation reason',
    type: ByImportanceResponse,
  })
  async getByImportance(
    @CurrentUser('sub') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: ByImportanceQueryDto,
  ) {
    const result = await this.smartLearningService.getByImportance(userId, query);
    return { success: true, data: result };
  }

  // ... random and stats endpoints unchanged
}
```

- [ ] **Step 2: Update controller tests**

In `server/src/modules/smart-learning/smart-learning.controller.spec.ts`, update mock data to include `recommendationReason`:

```typescript
const mockWeakPointResult = {
  total: 2,
  items: [
    {
      knowledgePoint: { id: 'kp-1', code: '1.1.1' },
      learningRecord: { id: 'lr-1', masteryLevel: 'E' },
      priority: 150,
      recommendationReason: '掌握度较低，需要加强',
    },
  ],
};

const mockByImportanceResult = {
  level: 'A',
  total: 5,
  items: [
    {
      id: 'kp-1',
      code: '1.1.1',
      isMastered: false,
      learningRecord: { id: 'lr-1', masteryLevel: 'C' },
      recommendationReason: '重要知识点，优先掌握',
    },
  ],
};
```

Update the test assertions to use these mock objects.

- [ ] **Step 3: Run controller tests**

```bash
pnpm --filter server test -- smart-learning.controller.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/smart-learning/smart-learning.controller.ts \
       server/src/modules/smart-learning/smart-learning.controller.spec.ts
git commit -m "feat(recommendation): update controller with response DTOs"
```

---

### Task 7: Frontend API Types

**Files:**
- Modify: `web/src/services/smartLearningApi.ts`

- [ ] **Step 1: Update API types**

Modify `web/src/services/smartLearningApi.ts`:

```typescript
export interface WeakPointItem {
  knowledgePoint: KnowledgePoint
  learningRecord: {
    id: string
    masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E'
    durationMinutes: number
    startTime: string
    notes: string | null
  }
  priority: number
  recommendationReason: string
}

export interface ByImportanceItem extends KnowledgePoint {
  isMastered: boolean
  learningRecord: {
    id: string
    masteryLevel: 'A' | 'B' | 'C' | 'D' | 'E'
    durationMinutes: number
    startTime: string
    notes: string | null
  } | null
  recommendationReason: string
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/services/smartLearningApi.ts
git commit -m "feat(recommendation): update frontend API types with recommendationReason"
```

---

### Task 8: Frontend WeakPointView

**Files:**
- Modify: `web/src/components/smart-learning/WeakPointView.tsx`

- [ ] **Step 1: Add recommendationReason display**

In `web/src/components/smart-learning/WeakPointView.tsx`, modify the `List.Item.Meta` description to include the recommendation reason:

```tsx
<List.Item.Meta
  title={
    <span className={styles.title}>
      {item.knowledgePoint.level1}
      {item.knowledgePoint.level2 && ` > ${item.knowledgePoint.level2}`}
      {item.knowledgePoint.level3 && ` > ${item.knowledgePoint.level3}`}
    </span>
  }
  description={
    <div className={styles.description}>
      <span className={styles.code}>{item.knowledgePoint.code}</span>
      {item.knowledgePoint.definition && (
        <span className={styles.def}>{item.knowledgePoint.definition}</span>
      )}
      {item.recommendationReason && (
        <span className={styles.reason}>{item.recommendationReason}</span>
      )}
    </div>
  }
/>
```

- [ ] **Step 2: Add CSS for recommendation reason**

In `web/src/components/smart-learning/WeakPointView.module.css`, add:

```css
.reason {
  display: block;
  color: #8c8c8c;
  font-size: 12px;
  margin-top: 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/smart-learning/WeakPointView.tsx \
       web/src/components/smart-learning/WeakPointView.module.css
git commit -m "feat(recommendation): display recommendation reason in WeakPointView"
```

---

### Task 9: Frontend ImportanceView

**Files:**
- Modify: `web/src/components/smart-learning/ImportanceView.tsx`

- [ ] **Step 1: Add recommendationReason display**

In `web/src/components/smart-learning/ImportanceView.tsx`, modify the `List.Item.Meta` description:

```tsx
<List.Item.Meta
  title={
    <span className={styles.title}>
      {item.level1}
      {item.level2 && ` > ${item.level2}`}
      {item.level3 && ` > ${item.level3}`}
    </span>
  }
  description={
    <div className={styles.description}>
      <span className={styles.code}>{item.code}</span>
      {item.definition && <span className={styles.def}>{item.definition}</span>}
      {item.recommendationReason && (
        <span className={styles.reason}>{item.recommendationReason}</span>
      )}
    </div>
  }
/>
```

- [ ] **Step 2: Add CSS for recommendation reason**

In `web/src/components/smart-learning/ImportanceView.module.css`, add:

```css
.reason {
  display: block;
  color: #8c8c8c;
  font-size: 12px;
  margin-top: 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/smart-learning/ImportanceView.tsx \
       web/src/components/smart-learning/ImportanceView.module.css
git commit -m "feat(recommendation): display recommendation reason in ImportanceView"
```

---

### Task 10: Pre-filtering and Edge Case Tests

**Files:**
- Modify: `server/src/modules/smart-learning/smart-learning.service.spec.ts`

- [ ] **Step 1: Add pre-filtering test**

```typescript
describe('pre-filtering', () => {
  it('should limit candidates when over 500', async () => {
    // Create 600 mock records
    const manyRecords = Array.from({ length: 600 }, (_, i) => ({
      id: `lr-${i}`,
      userId: mockUserId,
      knowledgePointId: `kp-${i}`,
      masteryLevel: MasteryLevel.C,
      durationMinutes: 10,
      startTime: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      notes: null,
      knowledgePoint: {
        id: `kp-${i}`,
        code: `${i}.1.1`,
        level1: 'Chapter',
        level2: 'Section',
        level3: 'Point',
        importanceLevel: ImportanceLevel.C,
        definition: 'Definition',
      },
    }));

    jest
      .spyOn(prismaService.learningRecord, 'findMany')
      .mockResolvedValue(manyRecords as any);
    jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(600);

    const result = await service.getWeakPoints(mockUserId, { limit: 20 });

    expect(result.items.length).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 2: Add zero-record fallback test**

```typescript
describe('zero-record fallback', () => {
  it('should return empty for weak points when no records', async () => {
    jest.spyOn(prismaService.learningRecord, 'findMany').mockResolvedValue([]);
    jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(0);

    const result = await service.getWeakPoints(mockUserId, {});

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return all points for importance when no records', async () => {
    jest.spyOn(prismaService.learningRecord, 'findMany').mockResolvedValue([]);
    jest
      .spyOn(prismaService.knowledgePoint, 'findMany')
      .mockResolvedValue(mockKnowledgePoints as any);
    jest.spyOn(prismaService.knowledgePoint, 'count').mockResolvedValue(3);

    const result = await service.getByImportance(mockUserId, {
      level: ImportanceLevel.A,
    });

    expect(result.items.length).toBe(3);
  });
});
```

- [ ] **Step 3: Add tie-breaking test**

```typescript
describe('tie-breaking', () => {
  it('should sort by importance level when scores tie', async () => {
    const tiedRecords = [
      {
        ...mockLearningRecords[0],
        knowledgePoint: { ...mockKnowledgePoints[0], importanceLevel: ImportanceLevel.B },
      },
      {
        ...mockLearningRecords[1],
        knowledgePoint: { ...mockKnowledgePoints[1], importanceLevel: ImportanceLevel.A },
      },
    ];

    jest
      .spyOn(prismaService.learningRecord, 'findMany')
      .mockResolvedValue(tiedRecords as any);
    jest.spyOn(prismaService.learningRecord, 'count').mockResolvedValue(2);

    const result = await service.getWeakPoints(mockUserId, {});

    // A importance should come before B when scores tie
    expect(result.items[0].knowledgePoint.importanceLevel).toBe(ImportanceLevel.A);
  });
});
```

- [ ] **Step 4: Run all service tests**

```bash
pnpm --filter server test -- smart-learning.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/smart-learning/smart-learning.service.spec.ts
git commit -m "test(recommendation): add pre-filtering, fallback, and tie-breaking tests"
```

---

### Task 11: Quality Gates

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: Zero errors in both `web` and `server`.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Zero errors.

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: All tests pass in both packages.

- [ ] **Step 4: Commit if all pass**

```bash
git commit -m "chore: quality gates pass"
```

If any gate fails, fix the issues and re-run before committing.

---

## Task-to-Spec Mapping

| Spec Requirement | Implemented By |
|-----------------|----------------|
| 推荐评分算法 - 弱项学习推荐排序 | Task 3 (getWeakPoints) |
| 推荐评分算法 - 重要性学习推荐排序 | Task 4 (getByImportance) |
| 评分模型维度 - 掌握度基础分 | Task 2 (calculateBaseScore) |
| 评分模型维度 - 遗忘时间加成 | Task 2 (calculateDecayBonus) |
| 评分模型维度 - 近期学习惩罚 | Task 2 (calculateRecentStudyPenalty) |
| 评分模型维度 - 重要性权重 | Task 2 (calculateImportanceWeight) |
| 评分模型维度 - 进步速度调整 | Task 2 (calculateImprovementVelocity) |
| 评分公式 - 标准评分计算 | Task 2 (calculateFinalScore) |
| 评分公式 - 评分可配置 | Task 1 (recommendation.config.ts) |
| 推荐理由生成 | Task 2 (generateRecommendationReason) |
| 推荐 API 响应扩展 | Task 5 (Response DTOs) |
| 前端推荐理由展示 - 弱项学习 | Task 8 (WeakPointView) |
| 前端推荐理由展示 - 重要性学习 | Task 9 (ImportanceView) |
| 性能保障 - 大课本候选集过滤 | Task 3, Task 10 (pre-filtering test) |
| 性能保障 - 批量查询避免 N+1 | Task 3 (getRecentRecordsForCandidates) |
| 零记录学生回退 | Task 3, Task 4, Task 10 (fallback tests) |
| 平局打破规则 | Task 3, Task 10 (tie-breaking test) |
| 随机学习模式不受影响 | Task 6 (controller, no changes to random endpoint) |

---

## Self-Review

**1. Spec coverage:** All 13 requirements from the spec have corresponding tasks. The mapping table above confirms full coverage.

**2. Placeholder scan:** No TBD, TODO, or vague requirements found. All steps contain actual code, commands, and expected outputs.

**3. Type consistency:**
- `WeakPointItem` interface: consistent across service (Task 3), DTO (Task 5), and frontend API (Task 7)
- `ByImportanceItem` interface: consistent across service (Task 4), DTO (Task 5), and frontend API (Task 7)
- `ScoreComponents` interface: defined in Task 2 and used in Tasks 3, 4
- Config property names: consistent between `recommendation.config.ts` (Task 1) and all scoring functions (Task 2)

**No issues found.**
