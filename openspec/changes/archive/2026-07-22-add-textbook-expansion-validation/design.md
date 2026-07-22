## Context

The current "expand knowledge points" feature lets teachers upload a `.xlsx` framework and `.md` content file to append new knowledge points to a textbook. The existing flow in `TextbookService.expandKnowledgePoints` parses the files, runs a few checks, and then immediately writes to the database and appends the original files. When files are malformed or contain duplicate codes, the failure is either an opaque backend error or a partial write that leaves the database and files inconsistent.

This design adds a read-only validation step that runs before any write. The same files are uploaded to `POST /textbooks/:id/validate`, the system checks all common error conditions, and returns a structured report. The frontend uses that report to enable or disable the final 「确认扩充」 button. The design is the validation-only MVP (Approach A); in-browser editing and preview are deferred to a later phase.

## Goals / Non-Goals

**Goals:**
- Provide a repeatable, explicit validation step for `.xlsx` + `.md` uploads.
- Surface clear, per-row/per-code error messages in the frontend before any database write or file append.
- Reuse the existing parsing and validation logic so the validation gate and the actual expansion write path behave identically.
- Gate the 「确认扩充」 button so it is only enabled when `report.valid === true`.
- Reset validation results whenever the teacher changes either file.
- Add unit tests for the new validation paths and the updated frontend state.
- Surface the validation rules and a client-side preview of the selected `.xlsx` and `.md` files so teachers can verify the upload contents before validating.

**Non-Goals:**
- In-browser editing of the `.xlsx` / `.csv` / `.md` content (previews remain read-only).
- Persistent validation history or server-side notifications.
- Exact original Excel row numbers in error messages (use parser array index for now).
- Adding, deleting, or reordering existing knowledge points.

## Decisions

1. **Shared validation pipeline**  
   Extract a single helper in `TextbookService` that both `validate` and `expand` use for parsing and validation. This avoids duplicating rules and prevents drift where the validator passes but the writer fails.
   - *Alternative considered:* Copy the validation logic into a new endpoint. Rejected because it creates a maintenance burden and reintroduces the exact inconsistency this change is trying to fix.

2. **Validation result format**  
   Return `{ success: true, data: { valid, errors } }` for all business-level validation failures. HTTP 400/500 responses are reserved for missing files, malformed multipart uploads, or server errors. This lets the frontend render all teacher-fixable problems in one place.
   - *Alternative considered:* Throw `BadRequestException` on parse failures, matching the existing `expand` endpoint. Rejected because it would force the frontend to handle both HTTP errors and report errors.

3. **Database conflict scope**  
   Only explicit codes from the uploaded xlsx are checked for conflicts with existing database codes. Auto-generated parent codes (`1`, `1.1`) that already exist in the database are treated as expected and are skipped, not reported as errors. This matches the existing expansion behavior and allows teachers to add children under existing chapters.
   - *Alternative considered:* Treat every generated parent code as a conflict. Rejected because it would block valid expansions where the parent already exists.

4. **Parent existence check**  
   For each explicit code with a parent (`a.b` or `a.b.c`), the parent codes must already exist in the current database. Generated parents from this upload are not counted as existing parents for this check.

5. **md code extraction**  
   Move `extractMdCodes` from `TextbookService` to `TextbookParserService` as a public method so both validation and expansion use the same regex rules.

6. **Raw-record column validation**  
   `TextbookParserService.parseFrameworkFile` will return raw parsed records alongside the transformed points. `validateRequiredColumns` will run on the raw records, eliminating the current hack in `expand` where a fake record is reconstructed from the transformed point array.

7. **Validation rule visibility**  
   The modal should display the `.xlsx` and `.md` validation rules up front so teachers know what is being checked before they upload. Rules are static copy derived from the shared validation pipeline; keeping them visible reduces trial-and-error and makes the error messages easier to understand.

8. **Client-side file preview**  
   The modal should render the selected `.xlsx` as a compact preview table and the selected `.md` as plain text before the teacher clicks 「开始校验」. Previews are generated client-side from the selected `File` objects so no extra backend request or API change is required. They are read-only and bounded to a reasonable row/character limit to keep the UI responsive.

9. **Clear failure presentation**  
   When validation fails, errors should be shown as a categorized list (xlsx vs. md) with each issue's message, affected row/code, and a fix hint when available. The list should be visually distinct from the preview and use the same terminology as the validation rule panel.

## Risks / Trade-offs

- **Stale validation result** → If two teachers validate/expand near the same time, the first validation result may become stale. The existing `expand` endpoint already uses an advisory lock and its own conflict check, so the write side is still protected. This is acceptable for the MVP; a future improvement could add an advisory lock around validation as well.
- **Generated parent name mismatch** → If a generated parent already exists in the database but with a different `level1`/`level2` name, the validator will not flag it. The existing expansion simply skips the parent, so behavior is preserved. A stricter name-consistency check is out of scope for this MVP.
- **Array index vs. Excel row number** → Error messages currently use the parser's array index, not the original Excel row number. This is a known limitation and will be addressed in a follow-up parser enhancement.
- **Temporary file cleanup** → Temp files are saved and deleted in a `try/finally` block. If deletion fails, the leak is bounded to one temp file per failed request.

## Migration Plan

No migration needed. This is a pure additive feature and refactor. Existing textbooks and knowledge points are untouched. The only behavioral change is that the frontend now requires validation before enabling the submit button; the backend `expand` endpoint still performs its own checks and can be called independently by other clients.

## Open Questions

- None at design time. The review decisions (D1–D6) resolved the open questions from the original design doc.

---

## UI/UX Enhancement Design: Guided Expansion Workflow (2026-07-20)

### Motivation

The validation MVP exposes rules, previews, and errors in a single vertical column. Teachers report that the modal becomes too tall, the two previews are hard to compare, the error list does not point back to the offending rows in the preview, and there is no final confirmation of what will actually be added before writing to the database. This section turns the previous UI Redesign Proposal into a formal, comprehensive UX upgrade that keeps the backend validation pipeline unchanged.

### Goals

- Reduce cognitive load by guiding the teacher through a clear, step-by-step workflow.
- Keep both file previews visible at once and link errors directly to the offending rows.
- Give teachers a final impact preview before they commit the expansion.
- Provide clear success feedback and make it easy to correct and retry failed uploads.
- Support both `.xlsx` and `.csv` framework files consistently with the backend expansion endpoint.
- Make the feature efficient to access from the textbook list and resilient to accidental modal closes.

### Key Design Decisions

10. **Guided step workflow**
    The modal becomes a three-step wizard instead of a single scrollable form:
    1. **上传文件**: Select framework file (`.xlsx` or `.csv`) and content file (`.md`).
    2. **预览校验**: Review previews, run validation, inspect errors.
    3. **确认扩充**: See an impact preview of what will be added, then confirm.
    - *Alternative considered:* Keep the single modal with all sections. Rejected because it overloads the teacher with too much information at once and increases the chance of skipping the validation step.

11. **Two-column linked editor layout**
    The modal body uses a two-column layout so teachers can compare framework and content previews side by side:
    - **Top bar**: Title + description + a "查看校验规则" button that opens a `Drawer` with the existing `ValidationRulesPanel`.
    - **Left column (50%)**: Framework file upload + xlsx/csv preview table.
    - **Right column (50%)**: Content file upload + md preview with line numbers.
    - **Bottom panel**: Validation result error tags. Clicking a tag scrolls the corresponding preview row into view and highlights it.
    - **Footer**: Cancel / Validate / Submit buttons, same states as today.
    - *Alternative considered:* Use `Tabs` to switch between previews. Rejected because it prevents side-by-side comparison of framework rows and md headings.

12. **Inline error highlighting and preview linkage**
    - xlsx/csv preview adds a "状态" column; error rows are tinted red and show `✗ 原因`.
    - md preview renders each line with a line number; error lines are tinted red and a `✗ 原因` annotation is inserted below the offending line.
    - Each error tag carries its `location.code` or `location.row`; on click, the matching row/line in the corresponding preview is scrolled into view and briefly pulsed.
    - *Alternative considered:* Show errors only in the bottom list without linking. Rejected because teachers have to manually locate the problem in large files.

13. **Impact preview before final confirmation**
    Step 3 shows a read-only summary before the final submit:
    - Total number of new knowledge points to be added.
    - Code range examples (first 5 and last 5 explicit codes).
    - Distribution by level-1 and level-2 knowledge points.
    - Reconfirmation that all codes passed validation.
    - *Alternative considered:* Let teachers submit directly after validation passes. Rejected because a large upload can accidentally add hundreds of unwanted points.

14. **Clear action feedback**
    - Upload in progress: 「确认扩充」 button shows `loading`, all buttons are disabled, and the modal cannot be closed by backdrop click or ESC.
    - Upload success: `message.success('成功扩充 XX 个知识点')`, then the modal closes and the knowledge-point list refreshes.
    - After refresh, the first newly added knowledge point is scrolled into view and briefly highlighted.
    - Upload failure: `message.error` with the backend message; the modal stays open so the teacher can retry.

15. **Consistent framework file type support**
    The validation modal accepts both `.xlsx` and `.csv` framework files, matching the backend `expand` endpoint's capability. The file type is detected from the extension and parsed accordingly.
    - *Alternative considered:* Keep `.xlsx` only for validation. Rejected because it forces teachers to convert existing `.csv` frameworks before validating.

16. **Quick access from textbook list**
    `TextbookTable` gains an 「扩充」 action button that navigates directly to the textbook detail page and opens the expansion modal.
    - *Alternative considered:* Keep the entry only inside the detail page. Rejected because it adds an unnecessary navigation step for a common teacher task.

17. **Error report export**
    When validation fails, the error panel provides an 「导出错误报告」 button that downloads a plain-text or CSV report containing all issues, grouped by file type, with row/code and reason. This lets teachers fix the source files offline without keeping the modal open.

18. **Draft preservation**
    When the teacher attempts to close the modal after selecting files but before uploading, the modal asks whether to keep the draft. If yes, the next open restores the selected files, previews, and validation state (but still requires re-validation before submit).
    - *Alternative considered:* Always clear state on close. Rejected because accidental closes force teachers to re-select and re-preview large files.

19. **Responsive adaptation**
    - Desktop (`≥768px`): two-column layout inside a `Modal` with `width={900}`.
    - Tablet / narrow screen (`<768px`): the modal switches to a full-screen `Drawer` with a vertical stack (framework preview above content preview).
    - *Alternative considered:* Keep the two-column layout and allow horizontal scrolling. Rejected because it breaks usability on small screens.

### Files Likely to Change

| File | Change |
|------|--------|
| `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` | Rebuild as step wizard; two-column linked layout; error-to-preview mapping; impact preview; draft preservation; responsive switch to Drawer. |
| `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx` | Keep content, but render inside a Drawer triggered by the modal. |
| `web/src/pages/TextbookDetail/components/FrameworkPreview.tsx` (new) | Render `.xlsx` / `.csv` as a compact table with status column and error highlighting. |
| `web/src/pages/TextbookDetail/components/MdPreview.tsx` (new) | Render md text with line numbers and optional highlight lines. |
| `web/src/pages/TextbookDetail/components/ErrorTag.tsx` (new) | Render an error tag that calls `onClick(location)`. |
| `web/src/pages/TextbookDetail/components/ImpactPreview.tsx` (new) | Show new-point count, code range, and distribution before final submit. |
| `web/src/pages/TextbookManage/components/TextbookTable.tsx` | Add 「扩充」 action button that opens the detail page with modal auto-open. |
| `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts` | Extend with draft save/restore, CSV parsing, and success-scroll logic. |
| `web/src/services/textbook.service.ts` | Update `validateTextbook` to accept both `.xlsx` and `.csv`. |

### Trade-offs

| Pros | Cons |
|------|------|
| Teachers can see both previews at once. | Requires more horizontal space; needs a responsive fallback on narrow screens. |
| Errors point directly to the offending rows. | Requires maintaining a code/row index and scroll-to-line logic. |
| Step-by-step flow reduces cognitive load. | Slightly more clicks than a single modal for very small uploads. |
| Impact preview prevents accidental bulk additions. | Adds one extra step before submit. |
| CSV support matches backend capability. | CSV parsing preview is less rich than xlsx (no formatting metadata). |
| Draft preservation avoids repeated work. | Stale drafts may confuse teachers if the underlying textbook was changed by someone else. |

### Migration / Compatibility

- Backend validation endpoint and data types remain unchanged; the work is purely frontend UI/UX plus the optional quick-access button in the list page.
- The step wizard and linked previews are additive; existing validation rules and error structures are reused without modification.
- CSV support is implemented by reusing the existing `papaparse` parser already used for CSV framework uploads in the initial textbook import flow.
- Draft preservation stores state in `sessionStorage` keyed by `textbookId`; it is cleared after a successful expansion or when the teacher explicitly discards it.

