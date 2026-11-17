## 1. Backend: Synchronize Markdown on knowledge point update

- [x] 1.1 Extend `UpdateKnowledgePointDto` to include `name` and `code` (if not already present) and ensure `code` change validation stays in `KnowledgePointService.update`.
- [x] 1.2 Add a private method in `KnowledgePointService` to rebuild a Markdown content block heading and body from the updated knowledge point fields.
- [x] 1.3 Call `TextbookService.updateContentInFile` (or equivalent) inside `KnowledgePointService.update` after the database update succeeds; handle missing Markdown block gracefully with a logged warning and a response flag.
- [x] 1.4 Wrap database update and file write in a transaction or compensating rollback so file write failures do not leave the database inconsistent.
- [x] 1.5 Update `knowledge-point.service.spec.ts` with tests for: successful DB+MD sync, missing MD block, duplicate code rejection.

## 2. Frontend: Extend `FrameworkPreview` with row actions

- [x] 2.1 Add optional props to `FrameworkPreview`: `canEdit`, `fileDiverged`, `onEdit(row)`, `onAddChild(row)`, `onDelete(row)`.
- [x] 2.2 Render action buttons in a new table column: "编辑概要", "新增子知识点", "删除"; disable them when `canEdit` is false or `fileDiverged` is true with tooltip explaining why.
- [x] 2.3 Determine leaf vs non-leaf from `rows` data to disable delete for parents; for level-3 rows disable add-child.
- [x] 2.4 Add/update `FrameworkPreview.test.tsx` to cover role-based visibility, disabled states, and click handlers.

## 3. Frontend: Integrate CRUD modals into `TextbookDetailPage`

- [x] 3.1 Import `EditKnowledgePointModal`, `AddChildKnowledgePointModal`, and related buttons into `TextbookDetailPage`.
- [x] 3.2 Map a clicked framework row to a knowledge point object by `code` using `knowledgePoints` already fetched in `useTextbookDetail`.
- [x] 3.3 Implement `onEdit` handler: open modal with current row data, call `knowledgeApi.updateKnowledgePoint`, then `fetchFiles()` and set `highlightedCodes`.
- [x] 3.4 Implement `onAddChild` handler: open modal, submit via `knowledgeApi.createKnowledgePoint`, refresh files, highlight new code.
- [x] 3.5 Implement `onDelete` handler: confirm via `Popconfirm`, call `knowledgeApi.deleteKnowledgePoint`, refresh files.
- [x] 3.6 Wire `canEdit` from user role and `fileDiverged` from mtime comparison already present in `TextbookDetailPage`.
- [x] 3.7 Update `TextbookDetailPage.test.tsx` to cover the new action flow.

## 4. Frontend: Refresh and highlight behavior

- [x] 4.1 Ensure `fetchFiles()` is called after every successful mutation so framework preview and Markdown preview reflect the latest disk state.
- [x] 4.2 Reuse the 3-second highlight timer already in `TextbookDetailPage` for expansion success.
- [x] 4.3 After update that changes `code`, ensure the new code (not the old one) is highlighted.

## 5. Validation and quality gates

- [x] 5.1 Run `tsc --noEmit` in both `web/` and `server/` and fix type errors.
- [x] 5.2 Run frontend tests (`pnpm test` in `web/`) and backend tests (`pnpm test` in `server/`) and fix failures.
- [x] 5.3 Verify manually that editing a knowledge point updates the Markdown file and refreshes the preview.
- [x] 5.4 Check that `AGENTS.md` and existing specs do not conflict with the new behavior; update if needed.

## 6. UI refinements: textbook info, row selection, and action toolbar

- [x] 6.1 Move knowledge-point action buttons (edit / add child / delete) out of the table row into a compact top toolbar to save horizontal space.
- [x] 6.2 Remove the row radio selection; use a single click on a framework row to select it, and color the selected row to indicate selection.
- [x] 6.3 Display the framework and content file storage locations (`iksm/<filename>`) in the textbook info card, each with a download button.
- [x] 6.4 Add a toggle button in the top button bar to show/hide the textbook info card, giving the file preview area more vertical space.
- [x] 6.5 Update `TextbookDetailPage.test.tsx` to cover the new info card toggle and download buttons.
- [x] 6.6 Auto-expand the file preview area height when the textbook info card is collapsed, and restore it when expanded.
- [x] 6.7 Move the knowledge-point action buttons into the preview card title bar so they stay visible while the table scrolls; lift row selection state from `FrameworkPreview` to `TextbookDetailPage` (controlled `selectedCode` + `hideToolbar` props).
- [x] 6.8 Make the right md pane editable: extract the selected knowledge point's content block (`extractMdBlockByCode`), edit inline in a textarea, and save via `knowledgeApi.saveKnowledgePointContent`.

---
*Version: 1.3*
