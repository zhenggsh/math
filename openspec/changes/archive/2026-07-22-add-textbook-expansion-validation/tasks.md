## 1. Backend shared validation pipeline

- [x] 1.1 Add `rawRecords` to `TextbookParserService.parseFrameworkFile` return value and update `ParseResult` type.
- [x] 1.2 Move `extractMdCodes` from `TextbookService` to `TextbookParserService` as a public method.
- [x] 1.3 Refactor `TextbookService.expandKnowledgePoints` to call a new shared helper `validateExpansionFiles` (or equivalent private method) for parsing and validation, then perform writes only when valid.
- [x] 1.4 Ensure the shared helper returns a `ValidationReport` and does not modify the database or files.

## 2. Backend validation endpoint

- [x] 2.1 Create DTO `ValidateKnowledgePointsResponse` in `server/src/modules/textbook/dto/`.
- [x] 2.2 Add `POST /textbooks/:id/validate` handler in `TextbookController`, using `FileFieldsInterceptor` and role guards matching `POST /textbooks/:id/expand`.
- [x] 2.3 Wire the controller to call `TextbookService.validateExpansionFiles` and return `{ success: true, data: report }` for business errors; throw `BadRequestException` only for missing/invalid files.
- [x] 2.4 Return `NotFoundException` when the textbook ID does not exist.

## 3. Frontend service and hook

- [x] 3.1 Add `ValidationReport` and `ValidationIssue` types to `web/src/types/textbook.types.ts`.
- [x] 3.2 Add `validateTextbook` function in `web/src/services/textbook.service.ts`.
- [x] 3.3 Extend `useTextbookDetail` with `validating`, `validationResult`, `validationError`, and a `validate` action that clears state before each call.

## 4. Frontend modal UI

- [x] 4.1 Add a 「开始校验」 button to `ExpandKnowledgePointsModal` that is enabled only when both files are selected.
- [x] 4.2 Add loading and result panels for validation (success / error list).
- [x] 4.3 Gate the 「确认扩充」 button so it is enabled only when `validationResult?.valid === true`.
- [x] 4.4 Reset validation result and disable submit when either file changes or is removed.

## 5. Tests

- [x] 5.1 Add backend unit tests for `TextbookService.validateExpansionFiles` covering all xlsx and md error scenarios, plus the happy path.
- [x] 5.2 Add backend tests for `TextbookController` validation endpoint (missing files, wrong extensions, not-found, and success cases).
- [x] 5.3 Update/expand `TextbookService` tests for the refactored `expandKnowledgePoints` to prove it still works and uses the shared helper.
- [x] 5.4 Add frontend tests for `useTextbookDetail` validation state transitions.
- [x] 5.5 Add/update tests for `ExpandKnowledgePointsModal` covering file selection, validation flow, result display, and submit gating.

## 6. Quality gates

- [x] 6.1 Run `pnpm typecheck` and fix any type errors.
- [x] 6.2 Run `pnpm lint` and fix any lint errors.
- [x] 6.3 Run `pnpm test` and ensure all tests pass.
- [x] 6.4 Run `openspec status --change add-textbook-expansion-validation` to confirm all artifacts are complete and the change is ready for archive.

## 7. Readability / UX enhancements

- [x] 7.1 Add a validation rules panel in `ExpandKnowledgePointsModal` that clearly lists the `.xlsx` and `.md` validation requirements.
- [x] 7.2 Add a client-side preview of the selected `.xlsx` framework rendered as a compact table (e.g., `code`, `level1`, `level2`, `level3`, `importanceLevel`).
- [x] 7.3 Add a client-side preview of the selected `.md` content rendered as plain text.
- [x] 7.4 Improve the validation failure display so each issue is shown with its affected file type, row/code, and a human-readable reason, grouped under "框架文件 (xlsx)" and "内容文件 (md)".
- [x] 7.5 Add or update tests for the new rules panel, `.xlsx` preview table, `.md` text preview, and improved error list.
- [x] 7.6 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` after the readability changes.
- [x] 7.7 Run `openspec status --change add-textbook-expansion-validation` to confirm all artifacts are complete and the change is ready for archive.

## 8. Guided workflow and interaction upgrades

- [x] 8.1 Rebuild `ExpandKnowledgePointsModal` as a three-step wizard: 上传文件 → 预览校验 → 确认扩充, using Ant Design `Steps` and keeping the existing footer button logic per step.
- [x] 8.2 Move `ValidationRulesPanel` into a `Drawer` triggered from the modal top bar, and remove it from the default modal body.
- [x] 8.3 Switch the modal body to a two-column layout (framework preview left, md preview right) with `FrameworkPreview` and `MdPreview` components.
- [x] 8.4 Add error-to-preview linkage: each `ErrorTag` carries `location` and scrolls/pulses the corresponding row or line in the linked preview on click.
- [x] 8.5 Add an `ImpactPreview` step showing new-point count, code range examples, and level distribution before the final submit.
- [x] 8.6 Add clear action feedback: upload `loading`, disable-close while uploading, `message.success` with new-point count, and scroll-to-first-new-point after refresh.
- [x] 8.7 Support `.csv` framework files in the validation modal (extension detection, client-side CSV parsing via `papaparse`, and preview rendering).
- [x] 8.8 Add a 「导出错误报告」 button in the validation error panel that downloads a grouped error list as `.txt` or `.csv`.
- [x] 8.9 Add draft preservation: prompt before close when files are selected, save to `sessionStorage` keyed by `textbookId`, and restore on reopen.
- [x] 8.10 Add a 「扩充」 quick-action button in `TextbookTable` that navigates to the detail page and auto-opens the expansion modal.
- [x] 8.11 Add responsive fallback: on screens `<768px`, replace the modal with a full-screen `Drawer` and stack previews vertically.
- [x] 8.12 Add or update tests for step navigation, CSV parsing, error linkage, impact preview, draft restore, quick access, and responsive behavior.
- [x] 8.13 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` after the UX upgrades.
- [x] 8.14 Run `openspec status --change add-textbook-expansion-validation` to confirm all artifacts are complete and the change is ready for archive.
