## Context

The "Expand Knowledge Points" feature lets teachers upload a framework file (xlsx/csv) and an optional Markdown file to append new knowledge points to an existing textbook. The current flow is: upload → preview/validate → confirm. When validation fails, teachers must return to local editors, fix the files, and re-upload. This design adds an in-browser editing layer inside the same modal so the fix/validate loop can stay entirely in the browser.

## Goals / Non-Goals

**Goals:**
- Allow teachers to edit xlsx framework rows directly in the browser after upload.
- Synchronize xlsx row changes (add/delete/modify) to the corresponding Markdown content blocks.
- Allow direct Markdown text editing and batch heading-level replacement (`##` ↔ `###` ↔ `####`).
- Require re-validation after any edit before the confirmation step.
- Preserve the edited state across accidental modal close via `sessionStorage` draft persistence.
- Keep backend endpoints unchanged; reuse `POST /textbooks/:id/validate` and `POST /textbooks/:id/expand` by re-serializing edited state back to `File` objects.

**Non-Goals:**
- CSV online editing in this iteration.
- Editing existing textbook knowledge points outside the expansion modal.
- Bidirectional sync from Markdown back to xlsx.
- Undo/redo beyond draft restore and re-uploading the original files.
- Rich-text/WYSIWYG Markdown editing; only source textarea editing is supported.

## Decisions

1. **Approach: in-memory editing with browser-side re-serialization.**
   - *Rationale*: The editing scope is intentionally limited to the expansion modal. Reusing the existing validate/expand endpoints avoids backend changes and keeps the feature lightweight. The alternative server-side draft approach would introduce temporary-file lifecycle management and new APIs that are out of proportion for a modal-only feature.
2. **One-way sync: xlsx → Markdown only.**
   - *Rationale*: xlsx is the canonical structure for knowledge-point codes and hierarchy. Markdown only stores content blocks. Keeping sync one-way keeps the data model simple and prevents edit conflicts. Teachers are warned in the UI that xlsx edits will update Markdown headings but will not overwrite Markdown body text.
3. **Front-end re-generates xlsx from plain rows using `xlsx` library.**
   - *Rationale*: `xlsx` is already a web dependency. The generated workbook contains only the first sheet with a header row and data rows, which is exactly what `TextbookParserService` expects. A prerequisite round-trip test (T0) must prove that the backend parser can read the frontend-generated workbook before any UI code is built on top of it.
4. **Extract editing state into a `useExpansionEditor` hook.**
   - *Rationale*: `ExpandKnowledgePointsModal` is already a large orchestration component. Moving row/content state, sync logic, validation clearing, and draft persistence into a hook keeps the modal readable and testable.
5. **Stable internal `rowId` for row ↔ block mapping.**
   - *Rationale*: Using a generated `rowId` lets us track which xlsx row maps to which Markdown block even when the row's `code` changes. New rows receive new `rowId`s; deleted rows remove their mapped block.
6. **Draft persistence keyed to original file data URLs.**
   - *Rationale*: Saving the original file contents as data URLs allows the modal to detect when the user has uploaded different files. If the fingerprint changes, edited state is discarded to avoid applying stale edits to a new upload.
7. **Multi-sheet and large-file guards.**
   - *Rationale*: The editor only reads the first sheet, so multi-sheet workbooks would lose data on save. A confirm dialog warns the teacher before entering edit mode. Very large Markdown files can degrade textarea performance, so editing is disabled above a 1 MB threshold.

## Risks / Trade-offs

- **Original xlsx styling/formatting is lost on re-serialization.** → Mitigation: warn the teacher before entering edit mode. The parser only needs header + data rows, so functionally the content is preserved.
- **Frontend-generated xlsx might not be parseable by the backend.** → Mitigation: T0 is a hard prerequisite round-trip test; if it fails, the approach must be re-evaluated before building UI.
- **Markdown edits diverge from xlsx structure.** → Mitigation: one-way sync policy is clearly communicated; re-validation catches structural mismatches before any write happens.
- **Textarea performance on large files.** → Mitigation: 1 MB guard; if a file is too large the teacher is asked to edit locally.
- **Session storage draft size.** → Mitigation: draft stores only the original file data URLs plus edited rows/content; if files are large the modal falls back to the original file-only draft.

## Open Questions

- Should undo/redo be added in a later iteration? (Out of scope for now.)
- Is a 1 MB Markdown threshold sufficient for the expected high-school math textbook files? (Spike via T0/T8 will confirm.)
- How should the editor behave when a content file is missing? (Initial implementation: disable Markdown editing and show a clear message; the xlsx editor remains available for structure-only uploads.)

