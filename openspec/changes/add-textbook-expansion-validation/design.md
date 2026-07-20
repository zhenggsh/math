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
- In-browser editing or preview of the `.xlsx` / `.md` content.
- Support for CSV expansion validation (only `.xlsx` for this cycle).
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

## UI Redesign Proposal: Linked Editor Layout (2026-07-20)

### Motivation

The current validation MVP (implemented above) exposes rules, previews, and errors in a single vertical column. Teachers report that the modal becomes too tall, the two previews are hard to compare, and the error list does not point back to the offending rows in the preview. This section proposes a next-phase UI improvement to address those issues without changing the backend validation pipeline.

### Proposed Layout

Switch the modal body to a two-column, linked-editor layout:

- **Top bar**: Title + description + a "查看校验规则" button that opens a `Drawer` with the existing `ValidationRulesPanel`.
- **Left column (50%)**: Framework file upload + xlsx preview table.
- **Right column (50%)**: Content file upload + md preview with line numbers.
- **Bottom panel**: Validation result error tags. Clicking a tag scrolls the corresponding preview row into view and highlights it.
- **Footer**: Cancel / Validate / Submit buttons, same states as today.

### Key Interactions

1. **Inline error highlighting**
   - xlsx preview adds a "状态" column; error rows are tinted red and show `✗ 原因`.
   - md preview renders each line with a line number; error lines are tinted red and a `✗ 原因` annotation is inserted below the offending line.
2. **Error-preview linkage**
   - Each error tag carries its `location.code` or `location.row`.
   - On click, the matching row/line in the corresponding preview is scrolled into view and briefly pulsed.
3. **Rule panel收纳**
   - The validation rules are not rendered by default; they are shown in a Drawer triggered by the top-bar button. This frees vertical space for the previews.
4. **md preview rendering**
   - Use a plain-text + line-number view initially because accurate row mapping is more important than Markdown rendering for this task. Markdown rendering can be added later if needed.

### Files Likely to Change

| File | Change |
|------|--------|
| `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx` | Switch to two-column layout; add error-to-preview mapping; integrate `MdPreview` and `ErrorTag` components. |
| `web/src/pages/TextbookDetail/components/ValidationRulesPanel.tsx` | Keep content, but render inside a Drawer triggered by the modal. |
| `web/src/pages/TextbookDetail/components/MdPreview.tsx` (new) | Render md text with line numbers and optional highlight lines. |
| `web/src/pages/TextbookDetail/components/ErrorTag.tsx` (new) | Render an error tag that calls `onClick(location)`. |

### Trade-offs

| Pros | Cons |
|------|------|
| Teachers can see both previews at once. | Requires more horizontal space; needs a responsive fallback on narrow screens. |
| Errors point directly to the offending rows. | Requires maintaining a code/row index and scroll-to-line logic. |
| First-screen information density is lower. | Slightly more complex component state than the current single-column modal. |

### Next Step

If approved, this proposal should be turned into an implementation plan via the `superpowers:writing-plans` skill. The backend validation endpoint and data types remain unchanged; the work is purely frontend UI/UX.

