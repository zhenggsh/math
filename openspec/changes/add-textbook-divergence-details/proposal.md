## Why

The textbook detail page currently only shows a boolean "文件与数据库不一致" warning when the framework file mtime differs from the database `lastModifiedAt`. Teachers cannot see *what* is out of sync (missing rows, renamed codes, or changed fields), which makes it hard to decide whether to reload, edit, or re-expand the framework. This change adds a detailed divergence report so inconsistencies are visible and actionable directly in the UI.

## What Changes

- Add a backend endpoint `GET /textbooks/:id/divergence` that compares the current framework file (xlsx/csv) rows with the database `KnowledgePoint` records.
- Report specific issues: rows present in the file but missing in the DB, rows present in the DB but missing in the file, and rows with matching codes but differing fields (`name`, `level1`, `level2`, `level3`, `definition`, `characteristics`, `importanceLevel`).
- Update the textbook detail page to fetch and display the divergence report instead of relying solely on mtime comparison.
- Add a "查看差异" summary next to the existing divergence tag, opening a drawer or modal that lists all issues with file vs. DB values.
- Extend `FrameworkPreview` to highlight rows involved in a divergence issue (added, removed, changed) using distinct visual markers.
- Keep the existing behavior of disabling inline CRUD actions while the framework is diverged, but base it on the new report when available.

## Capabilities

### New Capabilities

- `textbook-divergence-detection`: Compare framework file rows with database knowledge points and produce a structured divergence report.
- `framework-preview-divergence`: Render visual indicators on framework preview rows that are involved in a divergence issue.

### Modified Capabilities

None.

## Impact

- Backend: `TextbookService` (new comparison method), `TextbookController` (new endpoint), shared types.
- Frontend: `textbook.service.ts` (API client), `useTextbookDetail` hook, `TextbookDetailPage`, `FrameworkPreview`.
- No breaking API changes; the existing mtime-based warning remains as a fallback when the report has not been loaded.
