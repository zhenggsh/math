## ADDED Requirements

### Requirement: Modal provides a validation button
The system SHALL add a 「开始校验」 button to the existing "Expand Knowledge Points" modal that is enabled only when both an `.xlsx` framework file and a `.md` content file have been selected.

#### Scenario: Button disabled before files selected
- **WHEN** the modal is opened and no files are selected
- **THEN** the 「开始校验」 button is disabled

#### Scenario: Button enabled after files selected
- **WHEN** both files are selected
- **THEN** the 「开始校验」 button is enabled

### Requirement: Modal displays validation results
The system SHALL show the validation result in the modal after the validation endpoint returns.

#### Scenario: Validation succeeds
- **WHEN** the endpoint returns `valid: true`
- **THEN** the modal shows a success message and enables the 「确认扩充」 button

#### Scenario: Validation fails
- **WHEN** the endpoint returns `valid: false`
- **THEN** the modal shows the list of errors grouped by file/type and keeps the 「确认扩充」 button disabled

### Requirement: Validation state resets on file changes
The system SHALL clear any previous validation result and disable the 「确认扩充」 button whenever either the framework file or the content file is changed or removed.

#### Scenario: Replace framework file after success
- **WHEN** a teacher changes the framework file after validation has passed
- **THEN** the previous validation result disappears and the submit button becomes disabled

#### Scenario: Remove content file after success
- **WHEN** a teacher removes the content file after validation has passed
- **THEN** the previous validation result disappears and the submit button becomes disabled

### Requirement: Hook exposes validation state and action
The system SHALL extend `useTextbookDetail` to expose a `validate` function and state for loading, result, and error.

#### Scenario: Hook calls validation endpoint
- **WHEN** `validate(frameworkFile, contentFile)` is invoked
- **THEN** it POSTs the files to `/textbooks/:id/validate` and returns the report

#### Scenario: Hook tracks loading state
- **WHEN** validation is in progress
- **THEN** the hook exposes `validating: true` and clears the previous result/error

#### Scenario: Hook tracks validation error
- **WHEN** the validation request fails with an HTTP error
- **THEN** the hook exposes `validationError` and sets `validating: false`

### Requirement: Frontend service calls validation endpoint
The system SHALL add a `validateTextbook` function in `web/src/services/textbook.service.ts` that mirrors the existing `expandTextbook` upload pattern.

#### Scenario: Service uploads files and returns report
- **WHEN** `validateTextbook(textbookId, frameworkFile, contentFile)` is called
- **THEN** it sends a `multipart/form-data` POST to `/textbooks/:textbookId/validate` and returns the `ValidationReport`

### Requirement: Modal displays validation rules
The system SHALL show the `.xlsx` and `.md` validation rules in the "Expand Knowledge Points" modal so the teacher understands what is being checked before uploading.

#### Scenario: Rules visible when modal opens
- **WHEN** the modal is opened
- **THEN** a rules panel or section lists the key requirements for the `.xlsx` framework (required columns, allowed code patterns, no duplicate/conflicting codes, parent codes must exist) and the `.md` content (empty file not allowed, headings must match the level of the code, every code must be present in the `.xlsx`)

### Requirement: Modal previews selected xlsx as a table
The system SHALL render the selected `.xlsx` framework file as a compact preview table before validation.

#### Scenario: xlsx preview appears after file selection
- **WHEN** a valid `.xlsx` file is selected
- **THEN** the modal displays a table containing the parsed rows (e.g., `code`, `level1`, `level2`, `level3`, `importanceLevel`) so the teacher can review the content

#### Scenario: xlsx preview hidden when file is removed
- **WHEN** the framework file is removed or changed
- **THEN** the previous preview is cleared

### Requirement: Modal previews selected md content as text
The system SHALL render the selected `.md` content file as plain text before validation.

#### Scenario: md preview appears after file selection
- **WHEN** a valid `.md` file is selected
- **THEN** the modal displays the file content as plain text (or a read-only text block) so the teacher can review the headings and content

#### Scenario: md preview hidden when file is removed
- **WHEN** the content file is removed or changed
- **THEN** the previous preview is cleared

### Requirement: Validation failures are clearly listed with reasons
The system SHALL present validation failures in a way that makes each problem and its fix obvious.

#### Scenario: xlsx failures show file, row/code, and reason
- **WHEN** the validation report contains `xlsx` errors
- **THEN** each error is shown with the affected file type, row or code, and a human-readable reason, grouped under the "框架文件 (xlsx)" section

#### Scenario: md failures show file, row/code, and reason
- **WHEN** the validation report contains `md` errors
- **THEN** each error is shown with the affected file type, row or code, and a human-readable reason, grouped under the "内容文件 (md)" section

### Requirement: Modal guides the teacher through a step-by-step workflow
The system SHALL present the expansion flow as a three-step wizard: 上传文件 → 预览校验 → 确认扩充.

#### Scenario: Step 1 shows file selection
- **WHEN** the modal is opened
- **THEN** step 1 is active and only the framework and content file selectors are enabled

#### Scenario: Step 2 requires both files
- **WHEN** the teacher clicks 「下一步」 in step 1 without selecting both files
- **THEN** the modal stays on step 1 and shows a hint that both files are required

#### Scenario: Step 3 requires passed validation
- **WHEN** the teacher clicks 「下一步」 in step 2 while validation has not passed
- **THEN** the modal stays on step 2 and keeps the 「确认扩充」 button disabled

#### Scenario: Teacher can navigate back
- **WHEN** the teacher clicks 「上一步」 in step 2 or step 3
- **THEN** the modal returns to the previous step and preserves the current file selections and validation result

### Requirement: Previews are side-by-side and linked to errors
The system SHALL render the framework and content previews in a two-column layout and link each validation error to the offending row or line.

#### Scenario: Framework preview shows status column
- **WHEN** the validation report contains an xlsx error for a specific row or code
- **THEN** the corresponding row in the framework preview table is tinted red and shows the reason in a 状态 column

#### Scenario: Content preview highlights error lines
- **WHEN** the validation report contains an md error for a specific row
- **THEN** the corresponding line in the md preview is tinted red and shows an inline annotation with the reason

#### Scenario: Clicking an error scrolls to the source
- **WHEN** the teacher clicks an error tag in the bottom error panel
- **THEN** the corresponding row or line in the linked preview is scrolled into view and briefly highlighted

### Requirement: Impact preview is shown before final submission
The system SHALL show a read-only summary of what will be added before the teacher confirms the expansion.

#### Scenario: Impact preview displays new-point count
- **WHEN** the teacher reaches step 3 after validation has passed
- **THEN** the modal shows the total number of new knowledge points to be added

#### Scenario: Impact preview shows code range and distribution
- **WHEN** the impact preview is rendered
- **THEN** it shows example codes (first and last few explicit codes) and the distribution by level-1 and level-2 knowledge points

### Requirement: Upload feedback is clear and blocking
The system SHALL give explicit feedback during and after the expansion upload.

#### Scenario: Uploading blocks interaction
- **WHEN** the teacher clicks 「确认扩充」 and the upload is in progress
- **THEN** the submit button shows `loading`, all other buttons are disabled, and the modal cannot be closed by backdrop click or ESC

#### Scenario: Upload success shows count and refreshes
- **WHEN** the expansion succeeds
- **THEN** the system shows `message.success('成功扩充 XX 个知识点')`, closes the modal, and refreshes the knowledge-point list

#### Scenario: New point is highlighted after refresh
- **WHEN** the knowledge-point list refreshes after a successful expansion
- **THEN** the first newly added knowledge point is scrolled into view and briefly highlighted

#### Scenario: Upload failure keeps modal open
- **WHEN** the expansion fails with a backend error
- **THEN** the system shows `message.error` and keeps the modal open so the teacher can retry

### Requirement: Framework file preview supports both xlsx and csv
The system SHALL accept and preview both `.xlsx` and `.csv` framework files in the validation modal.

#### Scenario: csv file is parsed and previewed
- **WHEN** a `.csv` framework file is selected
- **THEN** the modal parses the CSV and renders a compact preview table with the same columns as the xlsx preview

#### Scenario: csv validation uses the same rules
- **WHEN** a `.csv` file is validated
- **THEN** the same required-column, code-format, duplicate, conflict, and parent-existence checks are applied

### Requirement: Textbook list provides quick access to expansion
The system SHALL add an 「扩充」 action button to each row in the textbook management list.

#### Scenario: Quick access opens detail with modal
- **WHEN** the teacher clicks the 「扩充」 button in `TextbookTable`
- **THEN** the system navigates to `/teacher/textbooks/:id` and automatically opens the expansion modal

### Requirement: Validation errors can be exported
The system SHALL allow the teacher to download the validation error report.

#### Scenario: Export button appears on failure
- **WHEN** the validation report contains errors
- **THEN** the error panel shows an 「导出错误报告」 button

#### Scenario: Export contains grouped issues
- **WHEN** the teacher clicks the export button
- **THEN** a file is downloaded containing all issues grouped by file type, with row/code and reason

### Requirement: Modal preserves draft state
The system SHALL allow the teacher to preserve selected files and validation state when closing the modal.

#### Scenario: Prompt before close with draft
- **WHEN** the teacher attempts to close the modal after selecting files but before uploading
- **THEN** the modal asks whether to keep the draft

#### Scenario: Draft is restored on reopen
- **WHEN** the teacher chooses to keep the draft and reopens the modal for the same textbook
- **THEN** the selected files, previews, and validation result are restored, but the teacher must re-run validation before submitting

#### Scenario: Draft is cleared after success
- **WHEN** the expansion succeeds
- **THEN** the preserved draft for that textbook is cleared

### Requirement: Modal adapts to narrow screens
The system SHALL switch the expansion modal to a full-screen drawer on narrow screens.

#### Scenario: Desktop shows two-column modal
- **WHEN** the viewport width is at least 768px
- **THEN** the expansion UI is shown as a `Modal` with a two-column preview layout

#### Scenario: Mobile shows full-screen drawer
- **WHEN** the viewport width is less than 768px
- **THEN** the expansion UI is shown as a full-screen `Drawer` with previews stacked vertically
