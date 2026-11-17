## Context

The textbook detail page currently computes a coarse divergence flag by comparing the framework file `lastModifiedAt` with the database `textbook.lastModifiedAt`. When true, a warning tag is shown and inline CRUD actions are disabled, but the user receives no information about which rows or fields differ. This design adds a precise, code-level divergence report.

## Goals / Non-Goals

**Goals:**
- Provide a structured comparison of framework file rows vs. database knowledge points.
- Surface specific inconsistencies: missing rows, renamed/moved codes, and changed fields.
- Highlight affected rows in `FrameworkPreview` and show a readable issue list in the UI.
- Keep the comparison logic on the backend so it can reuse the existing parser and avoid duplicating parsing rules on the frontend.

**Non-Goals:**
- Automatic reconciliation (e.g., auto-import missing rows or overwrite the file). The UI only reports differences; the user decides to reload or re-expand.
- Comparing Markdown file content with the database. This change focuses on the framework file (xlsx/csv) vs. DB.
- Real-time diff updates while the user edits. The report is refreshed on demand or when files are reloaded.

## Decisions

1. **Backend comparison endpoint**
   - A new `GET /textbooks/:id/divergence` endpoint in `TextbookController` delegates to `TextbookService.compareFrameworkWithDatabase(textbookId)`.
   - Rationale: Reuses `TextbookParserService` and `TextbookService` file-reading logic, ensuring the file-side view matches what expansion/validation sees.

2. **Comparison key**
   - Use the framework file row's explicit code (via parser, which resolves inherited codes) as the primary key.
   - Rationale: Codes are the stable identity used throughout the system; a renamed row should appear as a removal + addition rather than a change.

3. **Issue types**
   - `missing-in-db`: file has a code the DB does not.
   - `missing-in-file`: DB has a code the file does not.
   - `changed`: same code exists in both but at least one comparable field differs.
   - Rationale: These three categories cover every actionable inconsistency and map cleanly to UI highlighting states.

4. **Field comparison**
   - Compare `name`, `level1`, `level2`, `level3`, `definition`, `characteristics`, `importanceLevel`.
   - Trim and normalize empty strings to empty for comparison.
   - Rationale: These are the fields visible in the framework preview and editable in the overview panel.

5. **UI presentation**
   - Keep the existing "文件与数据库不一致" tag.
   - Add a "查看差异" button that opens an Ant Design Drawer listing all issues with file/DB values side by side.
   - Pass `divergenceIssues` to `FrameworkPreview`; rows with issues get a colored left border and a tooltip summarizing the issue.
   - Rationale: A drawer provides enough space for field-level details without cluttering the main preview; row highlighting gives immediate visual feedback.

6. **Fallback behavior**
   - If the divergence endpoint fails or has not completed, keep the existing mtime-based boolean to disable inline actions.
   - Rationale: Preserves the existing safety guard during network errors.

## Risks / Trade-offs

- **[Risk]** Large frameworks with thousands of rows could make the report expensive to compute on every page load.  
  → **Mitigation:** Fetch the report on demand via the "查看差异" button, not automatically on page load. Cache the result until the next `fetchFiles()` call.

- **[Risk]** Parser-generated parent rows (L1/L2) may be flagged as missing in DB if the comparison naively compares all generated rows.  
  → **Mitigation:** Compare only explicit leaf rows from the parser output; generated parent nodes are ignored for the purpose of divergence detection, or marked separately if needed.

- **[Risk]** Field-level changes in the DB that are not stored in the framework file (e.g., long `definition` text) will always show as "changed".  
  → **Mitigation:** This is by design; the report makes it explicit which fields differ. Users can ignore non-actionable differences or reload the file.

## Migration Plan

No migration required. The new endpoint is additive and the existing mtime warning remains as a fallback.
