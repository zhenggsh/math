## Why

The current "expand knowledge points" workflow is a black box: teachers upload an `.xlsx` framework and `.md` content file, and the system immediately tries to write to the database and append the original files. If the file is malformed, contains duplicate codes, or references a missing parent, the failure surfaces either as a cryptic backend error or as partial writes that silently corrupt the textbook. This change adds an explicit, repeatable validation step before any write happens, so teachers can see clear, actionable errors and only proceed once the files are clean.

## What Changes

- Add a new backend endpoint `POST /textbooks/:id/validate` that accepts the same `.xlsx` / `.csv` + `.md` upload as `POST /textbooks/:id/expand` and returns a structured `ValidationReport`.
- The report covers:
  - xlsx/csv: required columns, internal duplicate codes, DB code conflicts, parent-code existence in the current database, empty/non-framework files.
  - md: empty files, codes that are not in the uploaded xlsx/csv, incorrect heading levels for level-2 (`###`) and level-3 (`####`) knowledge points.
- Refactor the existing `expand` flow to share the same parsing/validation pipeline so the gate and the write path behave identically.
- Update the frontend "Expand Knowledge Points" modal with a 「开始校验」 button, a validation result panel, and a disabled 「确认扩充」 button until `report.valid === true`.
- Reset validation results whenever either file is changed.
- Add unit tests for the new validation service/controller and the updated modal/hook.
- Improve the readability of the validation UI by surfacing the `.xlsx`/`.csv` and `.md` validation rules in the modal, rendering the selected framework content as a preview table, rendering the selected `.md` content as a plain text preview, and presenting any validation failures as a clear, categorized list with actionable reasons.
- Rebuild the modal as a three-step guided wizard (上传文件 → 预览校验 → 确认扩充) with side-by-side previews, error-to-preview linkage, impact preview before submit, and clear upload feedback.
- Support `.csv` framework files in the validation modal to match the backend expansion capability.
- Add a 「扩充」 quick-action button in the textbook management list that opens the detail page with the modal auto-opened.
- Allow exporting validation error reports and preserving modal drafts across accidental closes.
- Adapt the modal to a full-screen drawer on narrow screens.

## Capabilities

### New Capabilities

- `textbook-expansion-validation`: Backend validation endpoint and shared validation pipeline used by both the validator and the existing expansion flow.
- `textbook-expansion-validation-ui`: Frontend validation controls and result panel in the "Expand Knowledge Points" modal.

### Modified Capabilities

- `textbook-expansion-validation-ui`: Enhanced to include a validation rule list, client-side `.xlsx`/`.csv` and `.md` previews, a three-step guided workflow, error-to-preview linkage, impact preview, upload feedback, CSV support, quick access from the textbook list, error export, draft preservation, and responsive drawer fallback.
- `textbook-management`: Enhanced with a quick-access 「扩充」 action button in the textbook table that opens the detail page with the expansion modal pre-opened.

## Impact

- Backend: `server/src/modules/textbook/textbook.controller.ts`, `server/src/modules/textbook/textbook.service.ts`, `server/src/modules/textbook/textbook-parser.service.ts`, and a new DTO file.
- Frontend: `web/src/services/textbook.service.ts`, `web/src/pages/TextbookDetail/hooks/useTextbookDetail.ts`, `web/src/pages/TextbookDetail/components/ExpandKnowledgePointsModal.tsx`, `web/src/pages/TextbookManage/components/TextbookTable.tsx`, and shared type files.
- No database schema changes. No new infrastructure. Temp-file handling is reused from `TextbookFileService`.
