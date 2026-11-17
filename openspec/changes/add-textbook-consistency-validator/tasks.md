## 1. Backend: Implement consistency validation endpoint

- [ ] 1.1 Add `POST /textbooks/:id/validate-consistency` endpoint in `TextbookController`, restricted to TEACHER/ADMIN.
- [ ] 1.2 Add `validateConsistency(textbookId: string): Promise<ValidationReport>` method in `TextbookService`.
- [ ] 1.3 In `validateConsistency`, read DB knowledge points for the textbook and build maps keyed by `code`.
- [ ] 1.4 Parse the current framework file from disk using `TextbookParserService.parseFrameworkFile` and extract explicit codes with their `name` and `importanceLevel`.
- [ ] 1.5 Read the current Markdown file from disk and extract all heading codes using `TextbookParserService.extractMdCodes` and heading titles.
- [ ] 1.6 Implement individual check functions returning `ValidationIssue[]`:
  - DB codes exist in framework
  - Framework codes exist in DB
  - Markdown codes exist in framework
  - Level-3 framework codes exist in Markdown
  - Markdown heading levels match code levels
  - Framework names match Markdown heading names
  - Framework importance levels are A/B/C
  - Framework codes have valid parents
- [ ] 1.7 Assemble checks into `ValidationReport` with `valid` determined by whether any check has errors.
- [ ] 1.8 Add unit tests in `textbook.service.spec.ts` covering all inconsistent scenarios and a fully consistent scenario.

## 2. Frontend: Add consistency validation drawer on TextbookDetailPage

- [ ] 2.1 Add "一致性校验" button to `TextbookDetailPage`, visible only for TEACHER/ADMIN.
- [ ] 2.2 Add `ConsistencyValidationDrawer` component (or inline in page) that opens from the right, reusing `ValidationRulesPanel`, `ErrorTag`, and the collapsible result list pattern from `ExpandKnowledgePointsModal`.
- [ ] 2.3 Extend `useTextbookDetail` hook with `validateConsistency(): Promise<ValidationReport | null>` and related loading/error states.
- [ ] 2.4 Add `textbook.service.ts` frontend service method `validateConsistency(textbookId)` calling the new endpoint.
- [ ] 2.5 Render the report inside the drawer with pass/fail indicators and error tags.
- [ ] 2.6 Implement error tag click handler: highlight framework row and locate Markdown line using existing `findMdLineByCode`.
- [ ] 2.7 Add "导出错误报告" button reusing `downloadErrorReport` utility.

## 3. Frontend: Reuse preview components for error linkage

- [ ] 3.1 Inside the drawer, display the existing `FrameworkPreview` and `MdPreview` (or read-only variants) populated from the current file previews already loaded on the detail page.
- [ ] 3.2 Bind `highlightedCodes` and `highlightedMdLine` state to the drawer’s error-click handler so clicking an error synchronously updates both previews.
- [ ] 3.3 Ensure the drawer closes and resets validation state when reopened.

## 4. Validation rules panel update

- [ ] 4.1 Either extend `ValidationRulesPanel` with an optional third panel for consistency rules, or create a dedicated `ConsistencyValidationRulesPanel` using the same visual style.
- [ ] 4.2 Document the new checks in the panel.

## 5. Quality gates and manual verification

- [ ] 5.1 Run `tsc --noEmit` in `server/` and `web/`.
- [ ] 5.2 Run backend and frontend test suites and fix failures.
- [ ] 5.3 Manually test: introduce a missing DB code, a missing Markdown heading, and a wrong heading level; verify the report catches them and the error tags navigate correctly.
- [ ] 5.4 Verify the validation endpoint does not modify any file or database record.

---
*Version: 1.0*
