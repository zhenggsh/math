# textbook-detail-knowledge-crud Specification

## Purpose

在教材详情文件预览页内，为教师提供对知识点框架的增删改查入口，操作结果同步刷新文件预览，使教材维护不再依赖跳转到学习页面。

## Requirements

### Requirement: Authorized users can edit a knowledge point from the framework preview

The system SHALL allow users with the TEACHER or ADMIN role to open an edit modal from a row in the framework preview on `TextbookDetailPage`. The system SHALL pre-fill the modal with the knowledge point's current `code`, `name`, `definition`, `characteristics`, and `importanceLevel`. After submission, the system SHALL update both the database record and the corresponding content block in the textbook Markdown file.

#### Scenario: Teacher edits a knowledge point from the preview page
- **WHEN** a teacher clicks the "编辑概要" action in the framework preview row for code `1.2.3`
- **THEN** the edit modal opens with the current values
- **WHEN** the teacher changes the name and submits
- **THEN** the database row is updated, the Markdown file block for `1.2.3` is rewritten with the new title, and the framework preview is refreshed with the updated row highlighted

#### Scenario: Student cannot see edit action
- **WHEN** a student views the framework preview on the textbook detail page
- **THEN** no edit action is rendered

### Requirement: Authorized users can add a child knowledge point from the framework preview

The system SHALL allow users with the TEACHER or ADMIN role to add a child knowledge point from a framework preview row. The system SHALL reject attempts to add children to a level-3 node. After creation, the system SHALL append a placeholder content block to the Markdown file and append a row to the framework file (xlsx only), then refresh the preview and highlight the new row.

#### Scenario: Teacher adds a child to a level-2 node
- **WHEN** a teacher clicks "新增子知识点" on a level-2 row `2.4`
- **THEN** the add-child modal opens with a proposed code `2.4.x` where `x` is the next available sibling index
- **WHEN** the teacher fills the form and submits
- **THEN** the child knowledge point is created in the database, a placeholder block is inserted into the Markdown file, the framework file is updated, and the preview highlights the new row

#### Scenario: Add-child action is disabled for level-3 nodes
- **WHEN** a teacher views a level-3 row `1.1.1`
- **THEN** the "新增子知识点" action is disabled

### Requirement: Authorized users can delete a leaf knowledge point from the framework preview

The system SHALL allow users with the TEACHER or ADMIN role to delete a leaf knowledge point from the framework preview row. The system SHALL reject deletion if the knowledge point has children. After confirmation, the system SHALL delete the database row and remove the corresponding content block from the Markdown file, then refresh the preview.

#### Scenario: Teacher deletes a leaf node
- **WHEN** a teacher clicks "删除" on a level-3 row `3.2.1` and confirms
- **THEN** the database row is deleted, the Markdown block is removed, the framework file is updated, and the preview refreshes

#### Scenario: Delete is disabled for non-leaf nodes
- **WHEN** a teacher views a row that has children
- **THEN** the delete action is disabled and shows a tooltip explaining why

### Requirement: Write actions are disabled when file and database are out of sync

The system SHALL compare the framework file's `mtime` with the textbook's `lastModifiedAt` in the database. If the absolute difference exceeds one second, the system SHALL display a warning and disable all framework write actions (add, edit, delete) on the textbook detail page until the user refreshes the file state.

#### Scenario: File modified outside the system
- **WHEN** the framework file or Markdown file is modified outside the application
- **THEN** the detail page shows a "文件与数据库不一致" warning tag
- **WHEN** the teacher hovers over a disabled write action
- **THEN** a tooltip explains that the file and database are out of sync and must be refreshed first

### Requirement: Framework preview refreshes and highlights after mutation

The system SHALL reload the framework file and Markdown file previews after any successful add, edit, or delete operation. The system SHALL highlight the affected row(s) for three seconds using the same highlight mechanism as the expansion success flow.

#### Scenario: Edit success highlights updated row
- **WHEN** a teacher successfully edits a knowledge point
- **THEN** the framework preview scrolls to and highlights the updated row for three seconds

## Interface

### TextbookDetailPage

```typescript
interface TextbookDetailPageProps {
  // no props; route param :id used
}
```

### FrameworkPreview extended props

```typescript
interface FrameworkPreviewProps {
  rows: XlsxPreviewRow[];
  errors: ValidationIssue[];
  highlightedCodes?: string[];
  emptyDescription?: string;
  onRowClick?: (code: string) => void;
  // new
  canEdit?: boolean;
  fileDiverged?: boolean;
  onEdit?: (row: XlsxPreviewRow) => void;
  onAddChild?: (row: XlsxPreviewRow) => void;
  onDelete?: (row: XlsxPreviewRow) => void;
}
```

## Test Cases

### T1: Edit from preview page
- **T1.1** Teacher role sees edit action; student role does not.
- **T1.2** Submitting valid changes updates DB and Markdown file content block.
- **T1.3** Framework preview refreshes and highlights updated row.

### T2: Add child from preview page
- **T2.1** Level-3 rows disable add-child action.
- **T2.2** Valid submission creates DB row, appends Markdown placeholder, updates framework file.
- **T2.3** Preview highlights new row.

### T3: Delete from preview page
- **T3.1** Leaf rows show active delete action; non-leaf rows show disabled delete action.
- **T3.2** Confirming delete removes DB row and Markdown block.
- **T3.3** Canceling delete leaves data unchanged.

### T4: Divergence guard
- **T4.1** When mtime differs from DB by more than 1s, write actions are disabled.
- **T4.2** Warning tag is visible when diverged.

---
*Version: 1.0*
*Capability: textbook-detail-knowledge-crud*
