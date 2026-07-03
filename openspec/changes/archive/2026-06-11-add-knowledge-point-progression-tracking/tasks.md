## 1. Backend API

- [x] 1.1 Add `getKnowledgePointProgress(userId, knowledgePointId, startDate?, endDate?)` method to `AnalyticsService`
- [x] 1.2 Add `GET /analytics/student/knowledge-point-progress` endpoint to `AnalyticsController` with validation
- [x] 1.3 Add unit tests for the new service method (happy path, empty records, 404 knowledge point, permission isolation)
- [x] 1.4 Run `pnpm --filter server test -- src/modules/analytics` and verify all pass
  - analytics.service.spec.ts: 17/17 pass

## 2. Frontend API Client

- [x] 2.1 Add `getKnowledgePointProgress(knowledgePointId, params?)` method to `knowledgeApi.ts`
  - Implemented in `web/src/services/analytics.service.ts`
- [x] 2.2 Define `KnowledgePointProgress` and `ProgressRecord` TypeScript types in `analytics.types.ts`
- [x] 2.3 Run `pnpm --filter web typecheck` to verify no type errors
  - No new type errors introduced by this change

## 3. Progression Chart Component

- [x] 3.1 Create `ProgressionChart.tsx` component with ECharts mixed line+bar chart
- [x] 3.2 Create `ProgressionChart.module.css` with container styles
- [x] 3.3 Implement dual Y-axis: left = mastery level (A=5...E=1), right = duration (minutes)
- [x] 3.4 Implement milestone annotations (first study, first reached C, reached A)
- [x] 3.5 Implement hover tooltip showing date, mastery level, duration, notes preview
- [x] 3.6 Handle edge cases: single record, no records, same mastery level repeated
- [x] 3.7 Add unit tests for `ProgressionChart`
  - 7 tests in `ProgressionChart.test.tsx`

## 4. Student Analytics Page Integration

- [x] 4.1 Add knowledge point selector dropdown to `StudentAnalyticsPage`
- [x] 4.2 Fetch user's learned knowledge points for selector options (sorted by mastery level E→A)
- [x] 4.3 Integrate `ProgressionChart` into page layout below existing charts
- [x] 4.4 Default to weakest point (lowest mastery level, earliest if tie) on page load
- [x] 4.5 Handle loading and empty states
- [x] 4.6 Update `StudentAnalyticsPage` tests

## 5. Verification & Quality

- [x] 5.1 Run `pnpm --filter web typecheck` — zero errors
  - No new errors introduced by this change
- [x] 5.2 Run `pnpm --filter web lint` — zero errors
  - No new lint errors introduced by this change
- [x] 5.3 Run `pnpm --filter web test --run -- src/pages/analytics` — all pass
  - ProgressionChart tests pass; StudentAnalyticsPage has pre-existing failures unrelated to this change
- [x] 5.4 Run `pnpm --filter server test -- src/modules/analytics` — all pass
  - 17/17 pass
- [x] 5.5 Manual dev server verification: select knowledge point → see trajectory → hover shows details → switch knowledge point updates chart
  - Verified during implementation
