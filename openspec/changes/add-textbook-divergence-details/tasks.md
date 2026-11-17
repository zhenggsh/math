## 1. Backend: Add divergence comparison endpoint

- [x] 1.1 Add `DivergenceIssue` and `DivergenceReport` types to `server/src/modules/textbook/types/textbook.types.ts`.
- [x] 1.2 Implement `TextbookService.compareFrameworkWithDatabase(textbookId)` to read the framework file, query database knowledge points, and produce a divergence report with `missing-in-db`, `missing-in-file`, and `changed` issues.
- [x] 1.3 Add `GET /textbooks/:id/divergence` endpoint in `TextbookController` with TEACHER/ADMIN role guard.
- [x] 1.4 Add unit tests for `compareFrameworkWithDatabase` covering matching data, missing rows, changed fields, and parser-generated parent exclusion.

## 2. Frontend: Fetch and expose divergence report

- [x] 2.1 Add `getDivergenceReport(textbookId)` method to `web/src/services/textbook.service.ts`.
- [x] 2.2 Add `DivergenceIssue` and `DivergenceReport` types to `web/src/types/textbook.types.ts`.
- [x] 2.3 Extend `useTextbookDetail` hook to expose `divergenceReport` and a `fetchDivergence()` function.
- [x] 2.4 Call `fetchDivergence()` after `fetchFiles()` completes in `TextbookDetailPage`.

## 3. Frontend: Display divergence details in TextbookDetailPage

- [x] 3.1 Add a "查看差异" button next to the existing "文件与数据库不一致" tag.
- [x] 3.2 Implement a Drawer component that lists all divergence issues with file and database values side by side.
- [x] 3.3 Update the `diverged` derivation to use `divergenceReport.diverged` when available, falling back to the existing mtime comparison.

## 4. Frontend: Highlight divergence rows in FrameworkPreview

- [x] 4.1 Extend `FrameworkPreviewProps` to accept `divergenceIssues`.
- [x] 4.2 Apply distinct row styles for `missing-in-db`, `missing-in-file`, and `changed` issues.
- [x] 4.3 Add tooltips to highlighted rows summarizing the issue type and changed fields.
- [x] 4.4 Add/update `FrameworkPreview.test.tsx` to verify row highlighting and tooltips for each issue type.

## 5. Validation and quality gates

- [x] 5.1 Run `tsc --noEmit` in both `web/` and `server/` and fix type errors.
- [x] 5.2 Run frontend and backend tests related to the change and fix failures.
- [ ] 5.3 Manually verify that adding/removing/changing a row in the framework file produces the expected divergence report and UI highlighting.
