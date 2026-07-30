## 1. Prerequisite: xlsx round-trip validation

- [ ] T0.1 Add `serializeXlsxPreview` to `web/src/utils/textbookFilePreview.ts` and a server-side spec that parses the generated blob with `TextbookParserService`.
- [ ] T0.2 Verify column order, cell data types, and empty-string handling match between frontend serializer and backend parser.
- [ ] T0.3 If the round-trip fails, stop and re-evaluate Approach A before building UI.

## 2. Serialization utilities

- [ ] T1.1 Add `serializeXlsxPreview(rows, sheetName)` to produce an xlsx `Blob` from in-memory rows.
- [ ] T1.2 Add `makeXlsxFile(rows, fileName)` to wrap the blob as a `File`.
- [ ] T1.3 Add `makeMdFile(content, fileName)` to wrap Markdown content as a `File`.
- [ ] T1.4 Add unit tests for `serializeXlsxPreview` and `makeMdFile`.

## 3. Editing state hook

- [ ] T2.1 Create `web/src/pages/TextbookDetail/hooks/useExpansionEditor.ts` with state for `editMode`, `frameworkRows`, `mdContent`, `selectedCodes`, `originalParsedRows`, and `originalMdContent`.
- [ ] T2.2 Implement row add/delete/update handlers that keep `frameworkRows` and `mdContent` in sync via `KnowledgeBlock` helpers.
- [ ] T2.3 Implement `revalidateFiles()` that serializes current state into `File` objects and calls the existing `onValidate` callback.
- [ ] T2.4 Implement draft load/save/clear logic with original file fingerprinting in `sessionStorage`.
- [ ] T2.5 Add unit tests for `useExpansionEditor` reducer/state logic.

## 4. xlsx framework editor

- [ ] T3.1 Create `FrameworkEditor` component with editable Ant Design `Table`, row selection checkboxes, and inline cell editing (Enter save / Esc cancel).
- [ ] T3.2 Add row-level validation for `code` (required, numeric hierarchy format, unique across rows).
- [ ] T3.3 Add row actions: delete, insert above, insert below.
- [ ] T3.4 Add a sync-status column to warn when a row has no corresponding Markdown block.
- [ ] T3.5 Add component tests covering edit, insert, delete, validation, and selection.

## 5. Markdown editor

- [ ] T4.1 Create `MdEditor` component with a line-numbered `<textarea>` matching the existing read-only preview style.
- [ ] T4.2 Add a batch heading-level replacement control with source level, target level, and scope (all / selected codes).
- [ ] T4.3 Implement the replacement regex using escaped code patterns and negative lookahead to avoid prefix false matches.
- [ ] T4.4 Add a guard that disables editing when the Markdown file exceeds 1 MB and shows a localized message.
- [ ] T4.5 Add component tests for text change, batch replacement, selected-code scope, and missing-content states.

## 6. xlsx → Markdown sync helpers

- [x] T5.1 Create `web/src/utils/knowledgeBlocks.ts` with `parseKnowledgeBlocks(mdContent)` to split Markdown into blocks by `##` / `###` / `####` headings.
- [x] T5.2 Implement `updateBlockForRow(blocks, row, code)` to modify an existing block heading.
- [x] T5.3 Implement `deleteBlockForRow(blocks, rowId)` to remove a block.
- [x] T5.4 Implement `insertBlockForRow(blocks, row)` with parent-code lookup (parent, then grandparent, then append-to-end).
- [x] T5.5 Implement `serializeKnowledgeBlocks(blocks)` to reconstruct Markdown content.
- [x] T5.6 Add unit tests covering all sync cases: update, delete, insert under parent, insert under grandparent, append, and missing-parent warning.

## 7. Modal wiring

- [ ] T6.1 Extend `ExpandKnowledgePointsModal` to manage `editMode` and render `FrameworkEditor` / `MdEditor` in step 2 when active.
- [ ] T6.2 Add an "Enter edit mode" button that shows the multi-sheet warning or disables for CSV.
- [ ] T6.3 Clear `validationResult` whenever `frameworkRows` or `mdContent` change and enable a "Re-validate" button.
- [ ] T6.4 Pass serialized `File` objects from `useExpansionEditor` to `onSubmit` at the confirm step.
- [ ] T6.5 Add the one-way sync warning banner in edit mode.

## 8. Draft persistence extension

- [ ] T7.1 Extend the `ExpansionDraft` interface to store `editedFrameworkRows`, `editedMdContent`, and original file data-URL fingerprints.
- [ ] T7.2 On modal open, compare uploaded files to the draft fingerprint and restore edited state only when they match.
- [ ] T7.3 On modal close, prompt to save/discard/cancel when unsaved edits exist.
- [ ] T7.4 Add unit tests for draft restore, fingerprint mismatch, and discard flow.

## 9. Multi-sheet and large-file guards

- [ ] T8.1 Show a `Modal.confirm` before entering edit mode for multi-sheet xlsx files warning about lost sheets.
- [ ] T8.2 Disable the "Enter edit mode" button for CSV uploads with a tooltip.
- [ ] T8.3 Measure/confirm the 1 MB Markdown threshold and disable the textarea when exceeded.

## 10. Modal integration tests

- [ ] T9.1 Add integration tests for the full edit-mode flow: edit xlsx → sync md → batch replace → re-validate → confirm expand.
- [ ] T9.2 Cover CSV-disabled and multi-sheet-warning scenarios.
- [ ] T9.3 Verify that validation errors are cleared and re-validated after edits.

## 11. Code quality and final checks

- [ ] T10.1 Run `pnpm typecheck` and fix all errors.
- [ ] T10.2 Run `pnpm lint` and `pnpm format`.
- [ ] T10.3 Run `pnpm test` and ensure new tests pass (existing pre-existing failures may remain). 
- [ ] T10.4 Archive the existing `add-textbook-file-preview` change if it is now complete.
- [ ] T10.5 Mark `add-textbook-expansion-editor` ready for implementation via `openspec status`.
