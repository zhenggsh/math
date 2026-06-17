# Redesign Student Analytics Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/analytics/student` as a textbook-scoped, 4-tab analytics dashboard using React Query, per-tab Error Boundaries, and new backend APIs, while adding `focusKnowledgePointId` auto-focus to `/smart-learning`.

**Architecture:** Backend extends 5 existing student analytics APIs with an optional `textbookId` filter, fixes `getMasteryDistribution` to use the latest record per knowledge point, and adds a new `GET /analytics/student/textbook-summary` endpoint. Frontend replaces the monolithic `StudentAnalyticsPage` with an Ant Design `Tabs` page that composes 4 dimension tab components, fetches data via a `useAnalytics` React Query hook, and isolates each tab behind an Error Boundary. A new `ComboChart` renders dual-axis line+bar behavior charts, and `SmartLearningPage` reads `focusKnowledgePointId` from the URL query string.

**Tech Stack:** NestJS + Prisma + PostgreSQL; React 19 + TypeScript + Vite + Ant Design 6 + @tanstack/react-query + ECharts.

---

## File Structure

### Backend

| File | Responsibility |
|---|---|
| `server/src/modules/analytics/dto/query-params.dto.ts` | Query DTOs: add `TextbookIdQueryDto` and optional `textbookId` to existing DTOs. |
| `server/src/modules/analytics/dto/textbook-summary.dto.ts` | Response DTO for `textbook-summary`. |
| `server/src/modules/analytics/interfaces/stats.interfaces.ts` | TypeScript interfaces for service returns; add `TextbookSummaryDto` and `lastTwoMasteryLevels`. |
| `server/src/modules/analytics/analytics.service.ts` | All aggregation logic, filtering by `knowledgePoint.textbookId`, raw SQL window function. |
| `server/src/modules/analytics/analytics.controller.ts` | HTTP routes, Swagger docs, parameter validation. |
| `server/src/modules/analytics/analytics.service.spec.ts` | Unit tests for service changes. |
| `server/prisma/schema.prisma` | Add `@@index([textbookId])` to `KnowledgePoint`. |

### Frontend

| File | Responsibility |
|---|---|
| `web/src/types/analytics.types.ts` | Frontend type definitions; add `TextbookSummary`, `lastTwoMasteryLevels`, request params. |
| `web/src/services/analytics.service.ts` | API client functions; add `textbookId` params and `getTextbookSummary`. |
| `web/src/components/analytics/utils.ts` | Shared ordering helpers: `getMasteryLevelOrder`, `getImportanceLevelOrder`. |
| `web/src/components/analytics/TabErrorFallback.tsx` | Reusable Error Boundary fallback UI with retry. |
| `web/src/components/analytics/TextbookHeader.tsx` | Header showing current textbook or empty state. |
| `web/src/components/analytics/TextbookDimensionTab.tsx` | Textbook overview stats + pie chart + importance distribution. |
| `web/src/components/analytics/ComboChart.tsx` | Dual Y-axis ECharts line+bar combo chart. |
| `web/src/components/analytics/BehaviorDimensionTab.tsx` | Behavior stats cards + combo chart + 7/30/90 day switch. |
| `web/src/components/analytics/KnowledgePointDimensionTab.tsx` | Knowledge point selector, progression chart, weak point list, filters. |
| `web/src/components/analytics/summaryTemplates.ts` | Rule-based Chinese summary templates. |
| `web/src/components/analytics/SummaryTab.tsx` | Renders generated summary. |
| `web/src/hooks/useAnalytics.ts` | React Query hooks for all analytics endpoints. |
| `web/src/pages/analytics/StudentAnalyticsPage.tsx` | Tabs composition, empty state, query orchestration. |
| `web/src/pages/analytics/StudentAnalyticsPage.module.css` | Tabs layout styles. |
| `web/src/pages/smart-learning/SmartLearningPage.tsx` | Read `focusKnowledgePointId` and auto-focus. |

---

## Task 1: Add `textbookId` query DTO

**Files:**
- Modify: `server/src/modules/analytics/dto/query-params.dto.ts`

- [ ] **Step 1: Add reusable `TextbookIdQueryDto`**

```typescript
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TextbookIdQueryDto {
  @ApiPropertyOptional({ description: '教材ID', example: 'textbook-123' })
  @IsOptional()
  @IsUUID()
  textbookId?: string;
}
```

- [ ] **Step 2: Extend existing DTOs to inherit `TextbookIdQueryDto`**

```typescript
export class LearningTrendQueryDto extends TextbookIdQueryDto {
  @ApiPropertyOptional({ description: '查询天数（默认30天）', example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class WeakPointsQueryDto extends TextbookIdQueryDto {
  @ApiPropertyOptional({ description: '返回数量限制（默认10）', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/analytics/dto/query-params.dto.ts
git commit -m "feat(server): add textbookId query DTO for analytics endpoints"
```

---

## Task 2: Add textbook-summary response DTO

**Files:**
- Create: `server/src/modules/analytics/dto/textbook-summary.dto.ts`

- [ ] **Step 1: Create the DTO class**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class MasteryDistributionSummaryItemDto {
  @ApiProperty({ enum: ['A', 'B', 'C', 'D', 'E'] })
  level: 'A' | 'B' | 'C' | 'D' | 'E';

  @ApiProperty()
  count: number;

  @ApiProperty()
  percentage: number;
}

export class ImportanceDistributionSummaryItemDto {
  @ApiProperty({ enum: ['A', 'B', 'C'] })
  level: 'A' | 'B' | 'C';

  @ApiProperty()
  count: number;
}

export class TextbookSummaryResponseDto {
  @ApiProperty()
  textbookId: string;

  @ApiProperty()
  textbookName: string;

  @ApiProperty()
  totalKnowledgePoints: number;

  @ApiProperty()
  learnedKnowledgePoints: number;

  @ApiProperty()
  unlearnedKnowledgePoints: number;

  @ApiProperty({ type: [MasteryDistributionSummaryItemDto] })
  masteryDistribution: MasteryDistributionSummaryItemDto[];

  @ApiProperty({ type: [ImportanceDistributionSummaryItemDto] })
  importanceDistribution: ImportanceDistributionSummaryItemDto[];
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/dto/textbook-summary.dto.ts
git commit -m "feat(server): add textbook-summary response DTO"
```

---

## Task 3: Update stats interfaces

**Files:**
- Modify: `server/src/modules/analytics/interfaces/stats.interfaces.ts`

- [ ] **Step 1: Add new interfaces**

```typescript
export interface TextbookSummaryDto {
  textbookId: string;
  textbookName: string;
  totalKnowledgePoints: number;
  learnedKnowledgePoints: number;
  unlearnedKnowledgePoints: number;
  masteryDistribution: MasteryDistributionItem[];
  importanceDistribution: Array<{ level: 'A' | 'B' | 'C'; count: number }>;
}

export interface LearnedKnowledgePointDto {
  knowledgePointId: string;
  code: string;
  name: string;
  lastMasteryLevel: 'A' | 'B' | 'C' | 'D' | 'E';
  lastLearningDate: string;
  lastTwoMasteryLevels: [string, string];
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/interfaces/stats.interfaces.ts
git commit -m "feat(server): add TextbookSummaryDto and lastTwoMasteryLevels interface"
```

---

## Task 4: Add KnowledgePoint textbookId index and migrate

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add index to `KnowledgePoint` model**

```prisma
model KnowledgePoint {
  // ... existing fields ...

  @@unique([code, textbookId], name: "idx_knowledge_point_code_textbook")
  @@index([textbookId], name: "idx_knowledge_point_textbook")
  @@index([importanceLevel], name: "idx_knowledge_point_importance")
  @@map("knowledge_points")
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
pnpm --filter server prisma migrate dev --name add_knowledge_point_textbook_index
pnpm --filter server prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add textbookId index to KnowledgePoint"
```

---

## Task 5: Add shared helper `formatKnowledgePointName`

**Files:**
- Create: `server/src/modules/analytics/analytics.utils.ts`

- [ ] **Step 1: Create helper**

```typescript
export function formatKnowledgePointName(
  level1: string,
  level2?: string | null,
  level3?: string | null,
): string {
  return [level1, level2, level3].filter(Boolean).join(' > ');
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.utils.ts
git commit -m "feat(server): add formatKnowledgePointName helper"
```

---

## Task 6: Update `getStudentOverview` with textbook filter

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Update function signature and where clauses**

```typescript
async getStudentOverview(
  userId: string,
  textbookId?: string,
): Promise<StudentOverviewDto> {
  this.logger.log(`Getting student overview for user: ${userId}, textbook: ${textbookId || 'all'}`);

  const recordWhere: Record<string, unknown> = { userId };
  if (textbookId) {
    recordWhere.knowledgePoint = { textbookId };
  }

  const [totalResult, uniqueKpResult] = await Promise.all([
    this.prisma.learningRecord.aggregate({
      where: recordWhere,
      _count: { id: true },
      _sum: { durationMinutes: true },
    }),
    this.prisma.learningRecord.groupBy({
      by: ['knowledgePointId'],
      where: recordWhere,
      _count: { knowledgePointId: true },
    }),
  ]);

  return {
    totalLearningCount: totalResult._count.id || 0,
    totalDurationMinutes: totalResult._sum.durationMinutes || 0,
    uniqueKnowledgePoints: uniqueKpResult.length,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts
git commit -m "feat(server): filter student overview by textbookId"
```

---

## Task 7: Fix `getMasteryDistribution` semantics

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Replace implementation with latest-record-per-knowledge-point logic**

```typescript
async getMasteryDistribution(
  userId: string,
  textbookId?: string,
): Promise<MasteryDistributionDto> {
  this.logger.log(`Getting mastery distribution for user: ${userId}, textbook: ${textbookId || 'all'}`);

  const where: Record<string, unknown> = { userId };
  if (textbookId) {
    where.knowledgePoint = { textbookId };
  }

  const latestRecords = await this.prisma.learningRecord.findMany({
    where,
    distinct: ['knowledgePointId'],
    orderBy: { startTime: 'desc' },
    select: { masteryLevel: true },
  });

  const levelCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const record of latestRecords) {
    levelCounts[record.masteryLevel]++;
  }

  const total = latestRecords.length;
  const levels: MasteryLevel[] = ['A', 'B', 'C', 'D', 'E'];

  return {
    distribution: levels.map((level) => {
      const count = levelCounts[level] || 0;
      return {
        level,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    }),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts
git commit -m "fix(server): mastery distribution uses latest record per knowledge point"
```

---

## Task 8: Fix `getLearningTrend` to use `startTime`

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Update date filter and ordering**

```typescript
async getLearningTrend(
  userId: string,
  days: number,
  textbookId?: string,
): Promise<LearningTrendDto> {
  this.logger.log(`Getting learning trend for user: ${userId}, days: ${days}, textbook: ${textbookId || 'all'}`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = {
    userId,
    startTime: { gte: startDate },
  };
  if (textbookId) {
    where.knowledgePoint = { textbookId };
  }

  const records = await this.prisma.learningRecord.findMany({
    where,
    select: {
      durationMinutes: true,
      startTime: true,
    },
    orderBy: { startTime: 'asc' },
  });

  const trendMap = new Map<string, { durationMinutes: number; count: number }>();

  for (const record of records) {
    const date = record.startTime.toISOString().split('T')[0];
    const current = trendMap.get(date) || { durationMinutes: 0, count: 0 };
    trendMap.set(date, {
      durationMinutes: current.durationMinutes + record.durationMinutes,
      count: current.count + 1,
    });
  }

  const trend: LearningTrendDto['trend'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const data = trendMap.get(dateStr) || { durationMinutes: 0, count: 0 };
    trend.push({ date: dateStr, ...data });
  }

  return { trend };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts
git commit -m "fix(server): use startTime for learning trend aggregation"
```

---

## Task 9: Fix `getWeakPoints` to use `startTime` and textbook filter

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`
- Modify: `server/src/modules/analytics/analytics.utils.ts` (import helper)

- [ ] **Step 1: Update implementation**

```typescript
import { formatKnowledgePointName } from './analytics.utils';

async getWeakPoints(
  userId: string,
  limit: number,
  textbookId?: string,
): Promise<WeakPointsDto> {
  this.logger.log(`Getting weak points for user: ${userId}, limit: ${limit}, textbook: ${textbookId || 'all'}`);

  const where: Record<string, unknown> = {
    userId,
    masteryLevel: { in: [MasteryLevel.D, MasteryLevel.E] },
  };
  if (textbookId) {
    where.knowledgePoint = { textbookId };
  }

  const latestRecords = await this.prisma.learningRecord.findMany({
    where,
    distinct: ['knowledgePointId'],
    orderBy: { startTime: 'desc' },
    take: limit,
    include: {
      knowledgePoint: {
        select: {
          id: true,
          code: true,
          level1: true,
          level2: true,
          level3: true,
          importanceLevel: true,
        },
      },
    },
  });

  const weakPoints = latestRecords.map((record) => ({
    knowledgePointId: record.knowledgePoint.id,
    code: record.knowledgePoint.code,
    name: formatKnowledgePointName(
      record.knowledgePoint.level1,
      record.knowledgePoint.level2,
      record.knowledgePoint.level3,
    ),
    importanceLevel: record.knowledgePoint.importanceLevel,
    lastMasteryLevel: record.masteryLevel as 'D' | 'E',
    lastLearningDate: record.startTime.toISOString(),
  }));

  const importanceOrder = { A: 0, B: 1, C: 2 };
  weakPoints.sort(
    (a, b) => importanceOrder[a.importanceLevel] - importanceOrder[b.importanceLevel],
  );

  return { weakPoints };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts server/src/modules/analytics/analytics.utils.ts
git commit -m "feat(server): filter weak points by textbookId and order by startTime"
```

---

## Task 10: Extend `getLearnedKnowledgePoints` with `lastTwoMasteryLevels`

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Add raw SQL helper type and update service method**

```typescript
interface RawLastTwoRecord {
  knowledge_point_id: string;
  code: string;
  level1: string;
  level2: string | null;
  level3: string | null;
  mastery_level: string;
  rn: bigint;
}

async getLearnedKnowledgePoints(
  userId: string,
  textbookId?: string,
): Promise<LearnedKnowledgePointsDto> {
  this.logger.log(`Getting learned knowledge points for user: ${userId}, textbook: ${textbookId || 'all'}`);

  const textbookFilter = textbookId ? `AND kp."textbook_id" = ${textbookId}` : '';

  const rawRows = await this.prisma.$queryRaw<RawLastTwoRecord[]>`
    WITH ranked AS (
      SELECT
        lr."knowledge_point_id",
        kp.code,
        kp.level1,
        kp.level2,
        kp.level3,
        lr.mastery_level,
        ROW_NUMBER() OVER (
          PARTITION BY lr."knowledge_point_id"
          ORDER BY lr.start_time DESC
        ) AS rn
      FROM learning_records lr
      JOIN knowledge_points kp ON kp.id = lr."knowledge_point_id"
      WHERE lr.user_id = ${userId}
        ${textbookFilter}
    )
    SELECT *
    FROM ranked
    WHERE rn <= 2
    ORDER BY "knowledge_point_id", rn ASC
  `;

  const grouped = new Map<string, RawLastTwoRecord[]>();
  for (const row of rawRows) {
    const list = grouped.get(row.knowledge_point_id) || [];
    list.push(row);
    grouped.set(row.knowledge_point_id, list);
  }

  const learnedPoints: LearnedKnowledgePointDto[] = [];
  for (const [, records] of grouped) {
    if (records.length === 0) continue;
    const latest = records[records.length - 1];
    const previous = records.length > 1 ? records[records.length - 2] : latest;
    learnedPoints.push({
      knowledgePointId: latest.knowledge_point_id,
      code: latest.code,
      name: formatKnowledgePointName(latest.level1, latest.level2, latest.level3),
      lastMasteryLevel: latest.mastery_level as 'A' | 'B' | 'C' | 'D' | 'E',
      lastLearningDate: latest.start_time.toISOString(),
      lastTwoMasteryLevels: [previous.mastery_level, latest.mastery_level],
    });
  }

  const levelOrder = { E: 0, D: 1, C: 2, B: 3, A: 4 };
  learnedPoints.sort(
    (a, b) => levelOrder[a.lastMasteryLevel] - levelOrder[b.lastMasteryLevel],
  );

  return { learnedKnowledgePoints: learnedPoints };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts
git commit -m "feat(server): return lastTwoMasteryLevels via window function SQL"
```

---

## Task 11: Add `getTextbookSummary`

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.ts`

- [ ] **Step 1: Implement method**

```typescript
async getTextbookSummary(
  userId: string,
  textbookId: string,
): Promise<TextbookSummaryDto> {
  this.logger.log(`Getting textbook summary for user: ${userId}, textbook: ${textbookId}`);

  const textbook = await this.prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { id: true, name: true },
  });

  if (!textbook) {
    throw new NotFoundException(`教材 ${textbookId} 不存在`);
  }

  const [totalKnowledgePoints, learnedAgg, importanceAgg] = await Promise.all([
    this.prisma.knowledgePoint.count({ where: { textbookId } }),
    this.prisma.learningRecord.groupBy({
      by: ['knowledgePointId'],
      where: { userId, knowledgePoint: { textbookId } },
      _count: { knowledgePointId: true },
    }),
    this.prisma.knowledgePoint.groupBy({
      by: ['importanceLevel'],
      where: { textbookId },
      _count: { id: true },
    }),
  ]);

  const learnedKnowledgePoints = learnedAgg.length;
  const masteryDistribution = await this.getMasteryDistribution(userId, textbookId);

  const importanceDistribution = [
    { level: 'A' as const, count: 0 },
    { level: 'B' as const, count: 0 },
    { level: 'C' as const, count: 0 },
  ];
  for (const item of importanceAgg) {
    const target = importanceDistribution.find((d) => d.level === item.importanceLevel);
    if (target) {
      target.count = item._count.id;
    }
  }

  return {
    textbookId: textbook.id,
    textbookName: textbook.name,
    totalKnowledgePoints,
    learnedKnowledgePoints,
    unlearnedKnowledgePoints: totalKnowledgePoints - learnedKnowledgePoints,
    masteryDistribution: masteryDistribution.distribution,
    importanceDistribution,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.service.ts
git commit -m "feat(server): add getTextbookSummary service method"
```

---

## Task 12: Update `AnalyticsController`

**Files:**
- Modify: `server/src/modules/analytics/analytics.controller.ts`
- Modify: `server/src/modules/analytics/interfaces/stats.interfaces.ts` (already done)

- [ ] **Step 1: Update imports and 5 student endpoints**

```typescript
import { TextbookIdQueryDto } from './dto/query-params.dto';
import { TextbookSummaryResponseDto } from './dto/textbook-summary.dto';
import type { TextbookSummaryDto } from './interfaces/stats.interfaces';

@Get('student/overview')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '学生学习概览' })
@ApiQuery({ name: 'textbookId', required: false, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功' })
async getStudentOverview(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true })) query: TextbookIdQueryDto,
): Promise<{ success: boolean; data: StudentOverviewDto }> {
  const data = await this.service.getStudentOverview(userId, query.textbookId);
  return { success: true, data };
}

@Get('student/mastery-distribution')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '掌握程度分布' })
@ApiQuery({ name: 'textbookId', required: false, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功' })
async getMasteryDistribution(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true })) query: TextbookIdQueryDto,
): Promise<{ success: boolean; data: MasteryDistributionDto }> {
  const data = await this.service.getMasteryDistribution(userId, query.textbookId);
  return { success: true, data };
}

@Get('student/learning-trend')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '学习趋势' })
@ApiQuery({ name: 'days', required: false, description: '查询天数' })
@ApiQuery({ name: 'textbookId', required: false, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功' })
async getLearningTrend(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true }))
  query: LearningTrendQueryDto,
): Promise<{ success: boolean; data: LearningTrendDto }> {
  const data = await this.service.getLearningTrend(userId, query.days || 30, query.textbookId);
  return { success: true, data };
}

@Get('student/weak-points')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '薄弱知识点' })
@ApiQuery({ name: 'limit', required: false, description: '返回数量限制' })
@ApiQuery({ name: 'textbookId', required: false, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功' })
async getWeakPoints(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true })) query: WeakPointsQueryDto,
): Promise<{ success: boolean; data: WeakPointsDto }> {
  const data = await this.service.getWeakPoints(userId, query.limit || 10, query.textbookId);
  return { success: true, data };
}

@Get('student/learned-knowledge-points')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '已学知识点列表' })
@ApiQuery({ name: 'textbookId', required: false, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功' })
async getLearnedKnowledgePoints(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true })) query: TextbookIdQueryDto,
): Promise<{ success: boolean; data: LearnedKnowledgePointsDto }> {
  const data = await this.service.getLearnedKnowledgePoints(userId, query.textbookId);
  return { success: true, data };
}

@Get('student/textbook-summary')
@Roles(Role.STUDENT)
@ApiOperation({ summary: '教材维度总览' })
@ApiQuery({ name: 'textbookId', required: true, description: '教材ID' })
@ApiResponse({ status: 200, description: '获取成功', type: TextbookSummaryResponseDto })
@ApiResponse({ status: 404, description: '教材不存在' })
async getTextbookSummary(
  @CurrentUser('userId') userId: string,
  @Query(new ValidationPipe({ transform: true })) query: TextbookIdQueryDto,
): Promise<{ success: boolean; data: TextbookSummaryDto }> {
  if (!query.textbookId) {
    throw new BadRequestException('textbookId 不能为空');
  }
  const data = await this.service.getTextbookSummary(userId, query.textbookId);
  return { success: true, data };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/analytics/analytics.controller.ts
git commit -m "feat(server): add textbookId param and textbook-summary endpoint"
```

---

## Task 13: Update backend tests

**Files:**
- Modify: `server/src/modules/analytics/analytics.service.spec.ts`

- [ ] **Step 1: Add `$queryRaw` to mock Prisma and fix existing type issue**

```typescript
useValue: {
  learningRecord: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  knowledgePoint: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  textbook: {
    findUnique: jest.fn(),
  },
  $queryRaw: jest.fn(),
  user: {
    count: jest.fn(),
    findUnique: jest.fn(),
  },
},
```

- [ ] **Step 2: Add a test for textbook filtering**

```typescript
it('should filter overview by textbookId', async () => {
  jest.spyOn(prismaService.learningRecord, 'aggregate').mockResolvedValue({
    _count: { id: 5 },
    _sum: { durationMinutes: 100 },
  } as never);
  jest.spyOn(prismaService.learningRecord, 'groupBy').mockResolvedValue([
    { knowledgePointId: 'kp-1', _count: { knowledgePointId: 1 } },
  ] as never);

  await service.getStudentOverview(mockUserId, 'tb-1');

  expect(prismaService.learningRecord.aggregate).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        userId: mockUserId,
        knowledgePoint: { textbookId: 'tb-1' },
      }),
    }),
  );
});
```

- [ ] **Step 3: Add test for `getTextbookSummary` 404**

```typescript
describe('getTextbookSummary', () => {
  it('should throw NotFoundException when textbook does not exist', async () => {
    jest.spyOn(prismaService.textbook, 'findUnique').mockResolvedValue(null as never);

    await expect(service.getTextbookSummary(mockUserId, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/analytics/analytics.service.spec.ts
git commit -m "test(server): add textbook filtering and textbook-summary tests"
```

---

## Task 14: Update frontend analytics types

**Files:**
- Modify: `web/src/types/analytics.types.ts`

- [ ] **Step 1: Add new types and update existing ones**

```typescript
export interface TextbookSummary {
  textbookId: string
  textbookName: string
  totalKnowledgePoints: number
  learnedKnowledgePoints: number
  unlearnedKnowledgePoints: number
  masteryDistribution: MasteryDistributionItem[]
  importanceDistribution: Array<{ level: 'A' | 'B' | 'C'; count: number }>
}

export interface LearnedKnowledgePoint {
  knowledgePointId: string
  code: string
  name: string
  lastMasteryLevel: 'A' | 'B' | 'C' | 'D' | 'E'
  lastLearningDate: string
  lastTwoMasteryLevels: [string, string]
}

export interface AnalyticsRequestParams {
  textbookId?: string
  days?: number
  limit?: number
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/types/analytics.types.ts
git commit -m "feat(web): add TextbookSummary and lastTwoMasteryLevels types"
```

---

## Task 15: Update frontend analytics service

**Files:**
- Modify: `web/src/services/analytics.service.ts`

- [ ] **Step 1: Update all student methods to accept `textbookId`**

```typescript
export async function getStudentOverview(textbookId?: string): Promise<StudentOverview> {
  const response = await api.get<ApiResponse<StudentOverview>>('/analytics/student/overview', {
    params: textbookId ? { textbookId } : undefined,
  })
  return response.data.data
}

export async function getMasteryDistribution(textbookId?: string): Promise<MasteryDistribution> {
  const response = await api.get<ApiResponse<MasteryDistribution>>(
    '/analytics/student/mastery-distribution',
    { params: textbookId ? { textbookId } : undefined },
  )
  return response.data.data
}

export async function getLearningTrend(days = 30, textbookId?: string): Promise<LearningTrend> {
  const params: Record<string, unknown> = { days }
  if (textbookId) params.textbookId = textbookId
  const response = await api.get<ApiResponse<LearningTrend>>('/analytics/student/learning-trend', {
    params,
  })
  return response.data.data
}

export async function getWeakPoints(limit = 10, textbookId?: string): Promise<WeakPoints> {
  const params: Record<string, unknown> = { limit }
  if (textbookId) params.textbookId = textbookId
  const response = await api.get<ApiResponse<WeakPoints>>('/analytics/student/weak-points', {
    params,
  })
  return response.data.data
}

export async function getLearnedKnowledgePoints(textbookId?: string): Promise<LearnedKnowledgePoints> {
  const response = await api.get<ApiResponse<LearnedKnowledgePoints>>(
    '/analytics/student/learned-knowledge-points',
    { params: textbookId ? { textbookId } : undefined },
  )
  return response.data.data
}

export async function getTextbookSummary(textbookId: string): Promise<TextbookSummary> {
  const response = await api.get<ApiResponse<TextbookSummary>>(
    '/analytics/student/textbook-summary',
    { params: { textbookId } },
  )
  return response.data.data
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/services/analytics.service.ts
git commit -m "feat(web): pass textbookId through analytics service and add getTextbookSummary"
```

---

## Task 16: Create shared analytics component utils

**Files:**
- Create: `web/src/components/analytics/utils.ts`

- [ ] **Step 1: Add ordering helpers**

```typescript
export function getMasteryLevelOrder(level: string): number {
  const order: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4 }
  return order[level] ?? 5
}

export function getImportanceLevelOrder(level: string): number {
  const order: Record<string, number> = { A: 0, B: 1, C: 2 }
  return order[level] ?? 3
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/analytics/utils.ts
git commit -m "feat(web): add mastery and importance level ordering helpers"
```

---

## Task 17: Create `TabErrorFallback`

**Files:**
- Create: `web/src/components/analytics/TabErrorFallback.tsx`
- Create: `web/src/components/analytics/TabErrorFallback.module.css`

- [ ] **Step 1: Implement fallback UI**

```typescript
import React from 'react'
import { Button, Result } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import styles from './TabErrorFallback.module.css'

export interface TabErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const TabErrorFallback: React.FC<TabErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <Result
      status="error"
      title="该维度数据加载失败"
      subTitle={error.message || '请稍后重试'}
      extra={
        <Button type="primary" icon={<ReloadOutlined />} onClick={resetErrorBoundary}>
          重试
        </Button>
      }
      className={styles.fallback}
    />
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.fallback {
  padding: 24px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/TabErrorFallback.tsx web/src/components/analytics/TabErrorFallback.module.css
git commit -m "feat(web): add TabErrorFallback component"
```

---

## Task 18: Create `TextbookHeader`

**Files:**
- Create: `web/src/components/analytics/TextbookHeader.tsx`
- Create: `web/src/components/analytics/TextbookHeader.module.css`

- [ ] **Step 1: Implement component**

```typescript
import React from 'react'
import { Empty, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import styles from './TextbookHeader.module.css'

export interface TextbookHeaderProps {
  textbookName?: string
}

export const TextbookHeader: React.FC<TextbookHeaderProps> = ({ textbookName }) => {
  if (!textbookName) {
    return (
      <Empty
        description="请先在全局教材选择器中选择一本教材"
        className={styles.empty}
      />
    )
  }

  return (
    <div className={styles.header}>
      <BookOutlined className={styles.icon} />
      <Typography.Title level={4} className={styles.title}>
        当前分析教材：{textbookName}
      </Typography.Title>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.icon {
  font-size: 24px;
  color: #1890ff;
}

.title {
  margin: 0 !important;
}

.empty {
  margin: 48px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/TextbookHeader.tsx web/src/components/analytics/TextbookHeader.module.css
git commit -m "feat(web): add TextbookHeader component"
```

---

## Task 19: Create `TextbookDimensionTab`

**Files:**
- Create: `web/src/components/analytics/TextbookDimensionTab.tsx`
- Create: `web/src/components/analytics/TextbookDimensionTab.module.css`

- [ ] **Step 1: Implement component**

```typescript
import React from 'react'
import { Card, Row, Col, Statistic, Empty } from 'antd'
import { BookOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { PieChart } from '../features/analytics'
import type { TextbookSummary } from '../../types/analytics.types'
import { getImportanceLevelOrder } from './utils'
import styles from './TextbookDimensionTab.module.css'

export interface TextbookDimensionTabProps {
  data: TextbookSummary | null
  loading: boolean
}

export const TextbookDimensionTab: React.FC<TextbookDimensionTabProps> = ({ data, loading }) => {
  const masteryPieData =
    data?.masteryDistribution.map((item) => ({
      name: `${item.level}级 (${item.count})`,
      value: item.count,
    })) || []

  const importanceData =
    data?.importanceDistribution
      .slice()
      .sort((a, b) => getImportanceLevelOrder(a.level) - getImportanceLevelOrder(b.level))
      .map((item) => ({
        name: `${item.level}级 (${item.count})`,
        value: item.count,
      })) || []

  return (
    <div className={styles.container}>
      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="知识点总数"
              value={data?.totalKnowledgePoints || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="已学习"
              value={data?.learnedKnowledgePoints || 0}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="未学习"
              value={data?.unlearnedKnowledgePoints || 0}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className={styles.chartsRow}>
        <Col xs={24} lg={12}>
          <Card title="掌握度分布" loading={loading} className={styles.chartCard}>
            {masteryPieData.length > 0 ? (
              <PieChart data={masteryPieData} donut showLegend />
            ) : (
              <Empty description="暂无已学知识点" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="重要性分布" loading={loading} className={styles.chartCard}>
            {importanceData.length > 0 ? (
              <PieChart data={importanceData} showLegend />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.container {
  padding-top: 8px;
}

.statsRow {
  margin-bottom: 24px;
}

.chartsRow {
  margin-bottom: 24px;
}

.chartCard {
  margin-bottom: 16px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/TextbookDimensionTab.tsx web/src/components/analytics/TextbookDimensionTab.module.css
git commit -m "feat(web): add TextbookDimensionTab component"
```

---

## Task 20: Create `ComboChart`

**Files:**
- Create: `web/src/components/analytics/ComboChart.tsx`

- [ ] **Step 1: Implement dual-axis combo chart**

```typescript
import React from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { EChartsWrapper } from '../features/analytics/EChartsWrapper'
import { ANT_DESIGN_COLORS } from '../../types/analytics.types'

export interface ComboChartDataPoint {
  date: string
  durationMinutes: number
  count: number
}

export interface ComboChartProps {
  data: ComboChartDataPoint[]
  loading?: boolean
}

export const ComboChart: React.FC<ComboChartProps> = ({ data, loading = false }) => {
  const option: EChartsCoreOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['学习时长', '学习次数'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value)
          return `${date.getMonth() + 1}/${date.getDate()}`
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '时长(分钟)',
        position: 'left',
      },
      {
        type: 'value',
        name: '次数',
        position: 'right',
        minInterval: 1,
      },
    ],
    series: [
      {
        name: '学习时长',
        type: 'line',
        data: data.map((d) => d.durationMinutes),
        smooth: true,
        itemStyle: { color: ANT_DESIGN_COLORS.primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
            ],
          },
        },
      },
      {
        name: '学习次数',
        type: 'bar',
        yAxisIndex: 1,
        data: data.map((d) => d.count),
        itemStyle: {
          color: 'rgba(250, 173, 20, 0.7)',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  return <EChartsWrapper option={option} loading={loading} />
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/analytics/ComboChart.tsx
git commit -m "feat(web): add ComboChart dual-axis line-bar component"
```

---

## Task 21: Create `BehaviorDimensionTab`

**Files:**
- Create: `web/src/components/analytics/BehaviorDimensionTab.tsx`
- Create: `web/src/components/analytics/BehaviorDimensionTab.module.css`

- [ ] **Step 1: Implement component**

```typescript
import React from 'react'
import { Card, Row, Col, Statistic, Radio, Empty } from 'antd'
import { ClockCircleOutlined, BookOutlined, CalendarOutlined } from '@ant-design/icons'
import type { LearningTrend } from '../../types/analytics.types'
import { ComboChart } from './ComboChart'
import styles from './BehaviorDimensionTab.module.css'

export interface BehaviorDimensionTabProps {
  data: LearningTrend | null
  loading: boolean
  days: number
  onDaysChange: (days: number) => void
}

export const BehaviorDimensionTab: React.FC<BehaviorDimensionTabProps> = ({
  data,
  loading,
  days,
  onDaysChange,
}) => {
  const totalDuration = data?.trend.reduce((sum, item) => sum + item.durationMinutes, 0) || 0
  const totalCount = data?.trend.reduce((sum, item) => sum + item.count, 0) || 0
  const avgDuration = data?.trend.length ? Math.round(totalDuration / data.trend.length) : 0

  const hasData = data?.trend.some((t) => t.count > 0)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Radio.Group value={days} onChange={(e) => onDaysChange(e.target.value)}>
          <Radio.Button value={7}>近7天</Radio.Button>
          <Radio.Button value={30}>近30天</Radio.Button>
          <Radio.Button value={90}>近90天</Radio.Button>
        </Radio.Group>
      </div>

      <Row gutter={16} className={styles.statsRow}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="总学习时长" value={totalDuration} suffix="分钟" prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="总学习次数" value={totalCount} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="日均学习时长" value={avgDuration} suffix="分钟" prefix={<CalendarOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title="每日学习行为" loading={loading} className={styles.chartCard}>
        {hasData ? (
          <ComboChart data={data?.trend || []} loading={loading} />
        ) : (
          <Empty description="该时间段暂无学习记录" />
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.container {
  padding-top: 8px;
}

.toolbar {
  margin-bottom: 16px;
  text-align: right;
}

.statsRow {
  margin-bottom: 24px;
}

.chartCard {
  margin-bottom: 16px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/BehaviorDimensionTab.tsx web/src/components/analytics/BehaviorDimensionTab.module.css
git commit -m "feat(web): add BehaviorDimensionTab with combo chart and day switch"
```

---

## Task 22: Create `KnowledgePointDimensionTab`

**Files:**
- Create: `web/src/components/analytics/KnowledgePointDimensionTab.tsx`
- Create: `web/src/components/analytics/KnowledgePointDimensionTab.module.css`

- [ ] **Step 1: Implement component**

```typescript
import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Select, Radio, Button, Empty, Tag } from 'antd'
import { RiseOutlined, FallOutlined, MinusOutlined, BookOutlined } from '@ant-design/icons'
import { ProgressionChart } from '../features/analytics'
import type { LearnedKnowledgePoints, WeakPoints, KnowledgePointProgress } from '../../types/analytics.types'
import { getMasteryLevelOrder } from './utils'
import styles from './KnowledgePointDimensionTab.module.css'

type FilterType = 'all' | 'progressing' | 'regressing' | 'weak'

export interface KnowledgePointDimensionTabProps {
  learned: LearnedKnowledgePoints | null
  weakPoints: WeakPoints | null
  progress: KnowledgePointProgress | null
  progressLoading: boolean
  selectedId: string
  onSelect: (id: string) => void
}

const TREND_ICONS = {
  progressing: <RiseOutlined />,
  regressing: <FallOutlined />,
  flat: <MinusOutlined />,
}

const TREND_LABELS = {
  progressing: '进步中',
  regressing: '退步中',
  flat: '持平',
}

export const KnowledgePointDimensionTab: React.FC<KnowledgePointDimensionTabProps> = ({
  learned,
  weakPoints,
  progress,
  progressLoading,
  selectedId,
  onSelect,
}) => {
  const navigate = useNavigate()
  const [filter, setFilter] = React.useState<FilterType>('all')

  const weakIds = useMemo(() => new Set(weakPoints?.weakPoints.map((p) => p.knowledgePointId) || []), [weakPoints])

  const trend = (levels: [string, string]): keyof typeof TREND_LABELS => {
    const previous = getMasteryLevelOrder(levels[0])
    const latest = getMasteryLevelOrder(levels[1])
    if (latest > previous) return 'progressing'
    if (latest < previous) return 'regressing'
    return 'flat'
  }

  const filteredPoints = useMemo(() => {
    const points = learned?.learnedKnowledgePoints || []
    if (filter === 'all') return points
    if (filter === 'weak') return points.filter((p) => weakIds.has(p.knowledgePointId))
    return points.filter((p) => trend(p.lastTwoMasteryLevels) === filter)
  }, [learned, filter, weakIds])

  const selectedPoint = learned?.learnedKnowledgePoints.find((p) => p.knowledgePointId === selectedId)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)}>
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="progressing">进步中</Radio.Button>
          <Radio.Button value="regressing">退步中</Radio.Button>
          <Radio.Button value="weak">薄弱点</Radio.Button>
        </Radio.Group>
      </div>

      <Card
        title="知识点掌握度轨迹"
        className={styles.progressionCard}
        extra={
          filteredPoints.length > 0 ? (
            <Select
              style={{ width: 280 }}
              placeholder="选择知识点"
              value={selectedId || undefined}
              onChange={onSelect}
              options={filteredPoints.map((kp) => ({
                value: kp.knowledgePointId,
                label: `${kp.code} ${kp.name}`,
              }))}
            />
          ) : null
        }
      >
        {progressLoading ? (
          <div>加载中...</div>
        ) : progress && progress.progressRecords.length > 0 ? (
          <ProgressionChart records={progress.progressRecords} title={progress.title} />
        ) : (
          <Empty description="选择知识点以查看掌握度轨迹" />
        )}
      </Card>

      <Card title="薄弱知识点列表" className={styles.weakPointsCard}>
        {weakPoints?.weakPoints.length ? (
          <div className={styles.weakPointsList}>
            {weakPoints.weakPoints.map((point) => (
              <div key={point.knowledgePointId} className={styles.weakPointItem}>
                <div className={styles.pointInfo}>
                  <span className={styles.pointCode}>{point.code}</span>
                  <span className={styles.pointName}>{point.name}</span>
                  <Tag color={point.importanceLevel === 'A' ? 'red' : point.importanceLevel === 'B' ? 'orange' : 'default'}>
                    {point.importanceLevel}
                  </Tag>
                </div>
                <div className={styles.pointStats}>
                  <span className={styles.masteryLevel}>{point.lastMasteryLevel}</span>
                  <span className={styles.learnDate}>{new Date(point.lastLearningDate).toLocaleDateString('zh-CN')}</span>
                  <Button
                    type="link"
                    icon={<BookOutlined />}
                    onClick={() => navigate(`/smart-learning?focusKnowledgePointId=${point.knowledgePointId}`)}
                  >
                    去学习
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="太棒了！没有薄弱知识点" />
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.container {
  padding-top: 8px;
}

.toolbar {
  margin-bottom: 16px;
  text-align: right;
}

.progressionCard {
  margin-bottom: 24px;
}

.weakPointsCard {
  margin-bottom: 24px;
}

.weakPointsList {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weakPointItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.pointInfo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.pointCode {
  font-family: monospace;
  font-weight: 600;
  color: #1890ff;
  min-width: 60px;
}

.pointName {
  flex: 1;
  color: #262626;
}

.pointStats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.masteryLevel {
  font-weight: 600;
  font-size: 16px;
}

.learnDate {
  color: #8c8c8c;
  font-size: 13px;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/KnowledgePointDimensionTab.tsx web/src/components/analytics/KnowledgePointDimensionTab.module.css
git commit -m "feat(web): add KnowledgePointDimensionTab with filters and weak point list"
```

---

## Task 23: Create `summaryTemplates.ts`

**Files:**
- Create: `web/src/components/analytics/summaryTemplates.ts`

- [ ] **Step 1: Implement templates**

```typescript
export interface SummaryInput {
  textbookName: string
  totalKnowledgePoints: number
  learnedCount: number
  weakPointCount: number
  totalDurationMinutes: number
  mostRecentLearningDate?: string
  topWeakPointName?: string
}

export function generateSummary(input: SummaryInput): string {
  const {
    textbookName,
    totalKnowledgePoints,
    learnedCount,
    weakPointCount,
    totalDurationMinutes,
    mostRecentLearningDate,
    topWeakPointName,
  } = input

  if (totalKnowledgePoints === 0) {
    return `《${textbookName}》暂无知识点数据，请确认教材内容是否已正确导入。`
  }

  const coverage = totalKnowledgePoints > 0 ? Math.round((learnedCount / totalKnowledgePoints) * 100) : 0
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60
  const durationText = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`

  let summary = `你在《${textbookName}》的学习覆盖率为 ${coverage}%（${learnedCount}/${totalKnowledgePoints}），累计学习时长约 ${durationText}。`

  if (mostRecentLearningDate) {
    summary += `最近一次学习发生在 ${mostRecentLearningDate}。`
  }

  if (weakPointCount > 0 && topWeakPointName) {
    summary += `目前共有 ${weakPointCount} 个薄弱知识点，建议优先复习「${topWeakPointName}」，巩固基础后再推进新内容。`
  } else {
    summary += `当前没有明显薄弱知识点，学习状态良好，建议保持节奏并定期复习已学内容。`
  }

  return summary
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/analytics/summaryTemplates.ts
git commit -m "feat(web): add rule-based summary templates"
```

---

## Task 24: Create `SummaryTab`

**Files:**
- Create: `web/src/components/analytics/SummaryTab.tsx`
- Create: `web/src/components/analytics/SummaryTab.module.css`

- [ ] **Step 1: Implement component**

```typescript
import React from 'react'
import { Card, Empty, Typography } from 'antd'
import type { TextbookSummary, WeakPoints, LearningTrend } from '../../types/analytics.types'
import { generateSummary } from './summaryTemplates'
import styles from './SummaryTab.module.css'

export interface SummaryTabProps {
  summary: TextbookSummary | null
  weakPoints: WeakPoints | null
  learningTrend: LearningTrend | null
  loading: boolean
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  summary,
  weakPoints,
  learningTrend,
  loading,
}) => {
  const mostRecentDate = React.useMemo(() => {
    if (!learningTrend?.trend) return undefined
    for (let i = learningTrend.trend.length - 1; i >= 0; i--) {
      if (learningTrend.trend[i].count > 0) {
        return learningTrend.trend[i].date
      }
    }
    return undefined
  }, [learningTrend])

  const text = React.useMemo(() => {
    if (!summary) return ''
    return generateSummary({
      textbookName: summary.textbookName,
      totalKnowledgePoints: summary.totalKnowledgePoints,
      learnedCount: summary.learnedKnowledgePoints,
      weakPointCount: weakPoints?.weakPoints.length || 0,
      totalDurationMinutes: 0,
      mostRecentLearningDate: mostRecentDate,
      topWeakPointName: weakPoints?.weakPoints[0]?.name,
    })
  }, [summary, weakPoints, mostRecentDate])

  return (
    <Card title="学习总结与建议" loading={loading} className={styles.card}>
      {text ? (
        <Typography.Paragraph className={styles.summary}>{text}</Typography.Paragraph>
      ) : (
        <Empty description="暂无足够数据生成总结" />
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.card {
  margin-top: 8px;
}

.summary {
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/analytics/SummaryTab.tsx web/src/components/analytics/SummaryTab.module.css
git commit -m "feat(web): add SummaryTab component"
```

---

## Task 25: Create `useAnalytics` hook

**Files:**
- Create: `web/src/hooks/useAnalytics.ts`

- [ ] **Step 1: Implement React Query hooks**

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  getStudentOverview,
  getMasteryDistribution,
  getLearningTrend,
  getWeakPoints,
  getLearnedKnowledgePoints,
  getTextbookSummary,
  getKnowledgePointProgress,
} from '../services/analytics.service'

export function useTextbookSummary(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'textbook-summary', textbookId],
    queryFn: () => getTextbookSummary(textbookId!),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStudentOverview(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'overview', textbookId],
    queryFn: () => getStudentOverview(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMasteryDistribution(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'mastery-distribution', textbookId],
    queryFn: () => getMasteryDistribution(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearningTrend(days: number, textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'learning-trend', textbookId, days],
    queryFn: () => getLearningTrend(days, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useWeakPoints(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'weak-points', textbookId],
    queryFn: () => getWeakPoints(50, textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLearnedKnowledgePoints(textbookId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'learned-knowledge-points', textbookId],
    queryFn: () => getLearnedKnowledgePoints(textbookId),
    enabled: Boolean(textbookId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useKnowledgePointProgress(knowledgePointId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'knowledge-point-progress', knowledgePointId],
    queryFn: () => getKnowledgePointProgress(knowledgePointId!),
    enabled: Boolean(knowledgePointId),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/useAnalytics.ts
git commit -m "feat(web): add useAnalytics React Query hooks"
```

---

## Task 26: Refactor `StudentAnalyticsPage`

**Files:**
- Modify: `web/src/pages/analytics/StudentAnalyticsPage.tsx`
- Modify: `web/src/pages/analytics/StudentAnalyticsPage.module.css`

- [ ] **Step 1: Replace page with Tabs composition**

```typescript
import React, { useState, useMemo } from 'react'
import { Tabs, Spin } from 'antd'
import { ErrorBoundary } from 'react-error-boundary'
import { useTextbook } from '../../hooks/useTextbook'
import {
  useTextbookSummary,
  useLearningTrend,
  useWeakPoints,
  useLearnedKnowledgePoints,
  useKnowledgePointProgress,
} from '../../hooks/useAnalytics'
import { TextbookHeader } from '../../components/analytics/TextbookHeader'
import { TextbookDimensionTab } from '../../components/analytics/TextbookDimensionTab'
import { BehaviorDimensionTab } from '../../components/analytics/BehaviorDimensionTab'
import { KnowledgePointDimensionTab } from '../../components/analytics/KnowledgePointDimensionTab'
import { SummaryTab } from '../../components/analytics/SummaryTab'
import { TabErrorFallback } from '../../components/analytics/TabErrorFallback'
import { getMasteryLevelOrder } from '../../components/analytics/utils'
import styles from './StudentAnalyticsPage.module.css'

const TABS = [
  { key: 'textbook', label: '教材维度' },
  { key: 'behavior', label: '学习行为维度' },
  { key: 'knowledge', label: '知识点维度' },
  { key: 'summary', label: '总结与建议' },
]

export const StudentAnalyticsPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('textbook')
  const [days, setDays] = useState(30)
  const { selectedTextbookIds } = useTextbook()
  const textbookId = selectedTextbookIds[0]

  const summaryQuery = useTextbookSummary(textbookId)
  const trendQuery = useLearningTrend(days, textbookId)
  const weakQuery = useWeakPoints(textbookId)
  const learnedQuery = useLearnedKnowledgePoints(textbookId)

  const defaultKnowledgePointId = useMemo(() => {
    const weakIds = new Set(weakQuery.data?.weakPoints.map((p) => p.knowledgePointId) || [])
    const points = learnedQuery.data?.learnedKnowledgePoints || []
    const weakPoint = points.find((p) => weakIds.has(p.knowledgePointId))
    if (weakPoint) return weakPoint.knowledgePointId
    return points[0]?.knowledgePointId
  }, [weakQuery.data, learnedQuery.data])

  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<string>('')

  React.useEffect(() => {
    if (defaultKnowledgePointId && !selectedKnowledgePointId) {
      setSelectedKnowledgePointId(defaultKnowledgePointId)
    }
  }, [defaultKnowledgePointId, selectedKnowledgePointId])

  const progressQuery = useKnowledgePointProgress(selectedKnowledgePointId)

  if (!textbookId) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>学习分析</h1>
        <TextbookHeader />
      </div>
    )
  }

  const isInitialLoading =
    summaryQuery.isLoading ||
    trendQuery.isLoading ||
    weakQuery.isLoading ||
    learnedQuery.isLoading

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>学习分析</h1>
      <TextbookHeader textbookName={summaryQuery.data?.textbookName} />

      {isInitialLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" description="加载分析数据..." />
        </div>
      ) : (
        <Tabs activeKey={activeKey} onChange={setActiveKey} items={TABS} className={styles.tabs}>
          <Tabs.TabPane tab="教材维度" key="textbook">
            <ErrorBoundary FallbackComponent={TabErrorFallback} onReset={summaryQuery.refetch}>
              <TextbookDimensionTab data={summaryQuery.data || null} loading={summaryQuery.isLoading} />
            </ErrorBoundary>
          </Tabs.TabPane>

          <Tabs.TabPane tab="学习行为维度" key="behavior">
            <ErrorBoundary FallbackComponent={TabErrorFallback} onReset={trendQuery.refetch}>
              <BehaviorDimensionTab
                data={trendQuery.data || null}
                loading={trendQuery.isLoading}
                days={days}
                onDaysChange={setDays}
              />
            </ErrorBoundary>
          </Tabs.TabPane>

          <Tabs.TabPane tab="知识点维度" key="knowledge">
            <ErrorBoundary FallbackComponent={TabErrorFallback} onReset={learnedQuery.refetch}>
              <KnowledgePointDimensionTab
                learned={learnedQuery.data || null}
                weakPoints={weakQuery.data || null}
                progress={progressQuery.data || null}
                progressLoading={progressQuery.isLoading}
                selectedId={selectedKnowledgePointId}
                onSelect={setSelectedKnowledgePointId}
              />
            </ErrorBoundary>
          </Tabs.TabPane>

          <Tabs.TabPane tab="总结与建议" key="summary">
            <ErrorBoundary FallbackComponent={TabErrorFallback} onReset={summaryQuery.refetch}>
              <SummaryTab
                summary={summaryQuery.data || null}
                weakPoints={weakQuery.data || null}
                learningTrend={trendQuery.data || null}
                loading={summaryQuery.isLoading}
              />
            </ErrorBoundary>
          </Tabs.TabPane>
        </Tabs>
      )}
    </div>
  )
}

export default StudentAnalyticsPage
```

- [ ] **Step 2: Update CSS**

```css
.container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  margin-bottom: 24px;
  font-size: 24px;
  font-weight: 600;
}

.loadingContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.tabs > .ant-tabs-content-holder {
  padding-top: 16px;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
}
```

- [ ] **Step 3: Install `react-error-boundary` if not present**

```bash
pnpm --filter web add react-error-boundary
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/analytics/StudentAnalyticsPage.tsx web/src/pages/analytics/StudentAnalyticsPage.module.css web/package.json pnpm-lock.yaml
git commit -m "feat(web): refactor StudentAnalyticsPage with Tabs and React Query"
```

---

## Task 27: Add `focusKnowledgePointId` auto-focus to `SmartLearningPage`

**Files:**
- Modify: `web/src/pages/smart-learning/SmartLearningPage.tsx`

- [ ] **Step 1: Read URL query param and auto-focus**

```typescript
import { useSearchParams } from 'react-router-dom'

const SmartLearningPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focusKnowledgePointId')

  // existing state declarations ...
  const [mode, setMode] = useState<RecommendationMode>('weak')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { items, isLoading, isError, error, refetch } = useRecommendations(mode)

  useEffect(() => {
    if (!focusId || isLoading || items.length === 0) return

    const exists = items.some((item) => item.id === focusId)
    if (exists) {
      setSelectedId(focusId)
      const element = document.querySelector(`[data-kp-id="${focusId}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (mode !== 'weak') {
      setMode('weak')
      return
    }

    message.info('该知识点不在当前推荐列表中')
  }, [focusId, items, isLoading, mode, message])

  // rest of component ...
}
```

- [ ] **Step 2: Add `data-kp-id` attribute to recommendation item render in `SmartLearningNav`**

In `web/src/components/smart-learning/SmartLearningNav.tsx`, add `data-kp-id={item.id}` to each selectable item element.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/smart-learning/SmartLearningPage.tsx web/src/components/smart-learning/SmartLearningNav.tsx
git commit -m "feat(web): auto-focus knowledge point from focusKnowledgePointId query param"
```

---

## Task 28: Add unit tests for Tab components

**Files:**
- Create: `web/src/components/analytics/__tests__/TextbookDimensionTab.test.tsx`
- Create: `web/src/components/analytics/__tests__/BehaviorDimensionTab.test.tsx`
- Create: `web/src/components/analytics/__tests__/KnowledgePointDimensionTab.test.tsx`
- Create: `web/src/components/analytics/__tests__/SummaryTab.test.tsx`

- [ ] **Step 1: TextbookDimensionTab test**

```typescript
import { render, screen } from '@testing-library/react'
import { TextbookDimensionTab } from '../TextbookDimensionTab'
import type { TextbookSummary } from '../../../types/analytics.types'

const mockSummary: TextbookSummary = {
  textbookId: 'tb-1',
  textbookName: 'Test Book',
  totalKnowledgePoints: 10,
  learnedKnowledgePoints: 6,
  unlearnedKnowledgePoints: 4,
  masteryDistribution: [
    { level: 'A', count: 2, percentage: 33.3 },
    { level: 'B', count: 2, percentage: 33.3 },
    { level: 'C', count: 2, percentage: 33.3 },
    { level: 'D', count: 0, percentage: 0 },
    { level: 'E', count: 0, percentage: 0 },
  ],
  importanceDistribution: [
    { level: 'A', count: 4 },
    { level: 'B', count: 3 },
    { level: 'C', count: 3 },
  ],
}

it('renders overview stats', () => {
  render(<TextbookDimensionTab data={mockSummary} loading={false} />)
  expect(screen.getByText('10')).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
  expect(screen.getByText('4')).toBeInTheDocument()
})

it('renders empty state when no mastery data', () => {
  render(<TextbookDimensionTab data={{ ...mockSummary, masteryDistribution: [] }} loading={false} />)
  expect(screen.getByText('暂无已学知识点')).toBeInTheDocument()
})
```

- [ ] **Step 2: BehaviorDimensionTab test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { BehaviorDimensionTab } from '../BehaviorDimensionTab'
import type { LearningTrend } from '../../../types/analytics.types'

const mockTrend: LearningTrend = {
  trend: [
    { date: '2026-06-15', durationMinutes: 30, count: 1 },
    { date: '2026-06-16', durationMinutes: 45, count: 2 },
  ],
}

it('switches days range', () => {
  const onDaysChange = vi.fn()
  render(<BehaviorDimensionTab data={mockTrend} loading={false} days={30} onDaysChange={onDaysChange} />)
  fireEvent.click(screen.getByText('近7天'))
  expect(onDaysChange).toHaveBeenCalledWith(7)
})

it('shows empty state when no data', () => {
  render(<BehaviorDimensionTab data={{ trend: [] }} loading={false} days={7} onDaysChange={vi.fn()} />)
  expect(screen.getByText('该时间段暂无学习记录')).toBeInTheDocument()
})
```

- [ ] **Step 3: KnowledgePointDimensionTab test**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { KnowledgePointDimensionTab } from '../KnowledgePointDimensionTab'
import type { LearnedKnowledgePoints, WeakPoints } from '../../../types/analytics.types'

const mockLearned: LearnedKnowledgePoints = {
  learnedKnowledgePoints: [
    { knowledgePointId: 'kp-1', code: '1.1', name: 'A', lastMasteryLevel: 'E', lastLearningDate: '2026-06-01', lastTwoMasteryLevels: ['D', 'E'] },
    { knowledgePointId: 'kp-2', code: '1.2', name: 'B', lastMasteryLevel: 'A', lastLearningDate: '2026-06-02', lastTwoMasteryLevels: ['B', 'A'] },
  ],
}

const mockWeak: WeakPoints = {
  weakPoints: [
    { knowledgePointId: 'kp-1', code: '1.1', name: 'A', importanceLevel: 'A', lastMasteryLevel: 'E', lastLearningDate: '2026-06-01' },
  ],
}

it('navigates to smart-learning on 去学习 click', () => {
  render(
    <KnowledgePointDimensionTab
      learned={mockLearned}
      weakPoints={mockWeak}
      progress={null}
      progressLoading={false}
      selectedId="kp-1"
      onSelect={vi.fn()}
    />,
  )
  expect(screen.getByText('去学习')).toHaveAttribute('href', '/smart-learning?focusKnowledgePointId=kp-1')
})
```

- [ ] **Step 4: SummaryTab test**

```typescript
import { render, screen } from '@testing-library/react'
import { SummaryTab } from '../SummaryTab'
import type { TextbookSummary, WeakPoints, LearningTrend } from '../../../types/analytics.types'

const mockSummary: TextbookSummary = {
  textbookId: 'tb-1',
  textbookName: 'Test Book',
  totalKnowledgePoints: 10,
  learnedKnowledgePoints: 6,
  unlearnedKnowledgePoints: 4,
  masteryDistribution: [],
  importanceDistribution: [],
}

it('renders encouraging text when no weak points', () => {
  render(<SummaryTab summary={mockSummary} weakPoints={{ weakPoints: [] }} learningTrend={null} loading={false} />)
  expect(screen.getByText(/学习状态良好/)).toBeInTheDocument()
})
```

- [ ] **Step 5: Commit**

```bash
git add web/src/components/analytics/__tests__/
git commit -m "test(web): add unit tests for analytics tab components"
```

---

## Task 29: Add `StudentAnalyticsPage` integration tests

**Files:**
- Create: `web/src/pages/analytics/__tests__/StudentAnalyticsPage.test.tsx`

- [ ] **Step 1: Write integration test**

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TextbookProvider } from '../../../contexts/TextbookContext'
import StudentAnalyticsPage from '../StudentAnalyticsPage'
import * as analyticsService from '../../../services/analytics.service'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

vi.mock('../../../services/analytics.service', () => ({
  getTextbookSummary: vi.fn(),
  getLearningTrend: vi.fn(),
  getWeakPoints: vi.fn(),
  getLearnedKnowledgePoints: vi.fn(),
  getKnowledgePointProgress: vi.fn(),
}))

it('shows empty state when no textbook selected', () => {
  render(
    <QueryClientProvider client={queryClient}>
      <TextbookProvider>
        <StudentAnalyticsPage />
      </TextbookProvider>
    </QueryClientProvider>,
  )
  expect(screen.getByText('请先在全局教材选择器中选择一本教材')).toBeInTheDocument()
})

it('defaults to textbook dimension tab', async () => {
  vi.mocked(analyticsService.getTextbookSummary).mockResolvedValue({
    textbookId: 'tb-1',
    textbookName: 'Math',
    totalKnowledgePoints: 10,
    learnedKnowledgePoints: 5,
    unlearnedKnowledgePoints: 5,
    masteryDistribution: [],
    importanceDistribution: [],
  })
  vi.mocked(analyticsService.getLearningTrend).mockResolvedValue({ trend: [] })
  vi.mocked(analyticsService.getWeakPoints).mockResolvedValue({ weakPoints: [] })
  vi.mocked(analyticsService.getLearnedKnowledgePoints).mockResolvedValue({ learnedKnowledgePoints: [] })

  render(
    <QueryClientProvider client={queryClient}>
      <TextbookProvider>
        <StudentAnalyticsPage />
      </TextbookProvider>
    </QueryClientProvider>,
  )

  await waitFor(() => {
    expect(screen.getByText('知识点总数')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/analytics/__tests__/StudentAnalyticsPage.test.tsx
git commit -m "test(web): add StudentAnalyticsPage integration tests"
```

---

## Task 30: Run quality gates and fix issues

**Files:**
- All modified files

- [ ] **Step 1: Type check**

```bash
pnpm typecheck
```

Expected: zero errors. Fix any TypeScript errors that appear.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: zero errors. Run `pnpm lint -- --fix` for auto-fixable issues; manually fix the rest.

- [ ] **Step 3: Test**

```bash
pnpm test
```

Expected: all tests pass. Fix failing tests before final commit.

- [ ] **Step 4: Format**

```bash
pnpm format
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: quality gates pass for redesign-student-analytics-tabs"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| 分析页面按教材聚焦 | Task 26 |
| 多维度标签布局 | Task 26 |
| 教材维度展示 | Tasks 18-19 |
| 学习行为维度展示 | Tasks 20-21 |
| 知识点维度展示 | Task 22 |
| 总结与建议生成 | Tasks 23-24 |
| 学生端分析 API 支持教材过滤 | Tasks 1, 6-12 |
| 教材维度总览 API | Tasks 2, 11 |
| `focusKnowledgePointId` 自动定位 | Task 27 |
| 测试与质量门禁 | Tasks 28-30 |

### Placeholder scan

- No `TBD`, `TODO`, or "implement later" strings.
- Every task includes exact file paths and runnable commands.
- Code blocks show concrete implementations.

### Type consistency

- `textbookId` is consistently `string | undefined` on frontend and optional `string` on backend.
- `lastTwoMasteryLevels` is consistently `[string, string]`.
- Query keys consistently use `['analytics', <endpoint>, textbookId, days?]`.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-17-redesign-student-analytics-tabs.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
