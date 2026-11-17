# textbook-consistency-validation Specification

## Purpose

对当前教材在数据库、`iksm/` 框架文件和 `iksm/` Markdown 文件三方的知识点数据进行内容级一致性校验，并在教材详情页以与扩充知识点弹窗一致的风格展示校验结果、联动定位差异位置。

## Requirements

### Requirement: Authorized users can trigger consistency validation for the current textbook

The system SHALL allow users with the TEACHER or ADMIN role to click a "一致性校验" button on `TextbookDetailPage` to trigger a consistency validation. The system SHALL read the current framework file and Markdown file from disk, compare them with the database records, and return a structured validation report.

#### Scenario: Teacher triggers consistency validation
- **WHEN** a teacher views the textbook detail page and clicks the "一致性校验" button
- **THEN** a side drawer opens showing the validation result with pass/fail status per check

#### Scenario: Student cannot trigger validation
- **WHEN** a student views the textbook detail page
- **THEN** the "一致性校验" button is not visible

### Requirement: Validation report covers database, framework file, and Markdown file consistency

The system SHALL produce the following checks in the validation report:
- All knowledge point codes in the database exist in the framework file.
- All explicit knowledge point codes in the framework file exist in the database.
- All knowledge point codes referenced in the Markdown file exist in the framework file.
- All explicit knowledge point codes in the framework file that are level-3 are referenced in the Markdown file (optional/severity configurable).
- Heading levels in Markdown match the code level: level-1 uses `##`, level-2 uses `###`, level-3 uses `####`.
- Names in the framework file match the names in Markdown headings (allowing minor whitespace differences).
- Importance levels in the framework file are valid (`A`, `B`, or `C`).
- Every code in the framework file has a valid parent code present in the database or the framework file.

#### Scenario: Database has a code missing from framework file
- **WHEN** the database contains `1.2.3` but the framework file does not
- **THEN** the report marks the "DB codes exist in framework" check as failed with an issue referencing code `1.2.3`

#### Scenario: Framework has a code missing from Markdown
- **WHEN** the framework file contains level-3 code `1.2.3` but the Markdown file has no `#### 知识点 1.2.3` heading
- **THEN** the report marks the "Level-3 framework codes exist in Markdown" check as failed with an issue referencing code `1.2.3`

#### Scenario: Markdown heading level is wrong
- **WHEN** the Markdown file contains `### 知识点 1.2.3` for a level-3 code
- **THEN** the report marks the "Heading levels match code levels" check as failed and points to the Markdown line

### Requirement: Validation result UI follows the expansion modal style

The system SHALL render the validation result using the same components and interaction patterns as the "Expand Knowledge Points" modal: a collapsible check list, green/red pass-fail indicators, clickable error tags, and an export error report button. The report panel SHALL be placed inside a right-side drawer on the textbook detail page.

#### Scenario: Clicking an error highlights the affected location
- **WHEN** a teacher clicks an error tag that references framework code `1.2.3`
- **THEN** the framework preview highlights and scrolls to row `1.2.3`, and the Markdown preview highlights and scrolls to the corresponding heading line if available

#### Scenario: Validation result can be exported
- **WHEN** a teacher clicks the "导出错误报告" button in the validation drawer
- **THEN** a text file containing all failed checks and issues is downloaded

### Requirement: Validation is read-only and does not modify data

The system SHALL NOT modify the database, framework file, or Markdown file when running consistency validation. The system SHALL only read the current state and report differences.

#### Scenario: Validation does not change files
- **WHEN** a teacher triggers validation on a textbook with known inconsistencies
- **THEN** the framework file and Markdown file on disk remain unchanged after validation completes

## Interface

### TextbookController

```typescript
@Controller('textbooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TextbookController {
  @Post(':id/validate-consistency')
  @Roles(Role.TEACHER, Role.ADMIN)
  async validateConsistency(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: ValidationReport }>;
}
```

### ValidationReport

```typescript
interface ValidationReport {
  valid: boolean;
  checks: ValidationCheck[];
  errors: ValidationIssue[];
}

interface ValidationCheck {
  key: string;
  label: string;
  passed: boolean;
  errors: ValidationIssue[];
}

interface ValidationIssue {
  type: 'db' | 'xlsx' | 'md';
  location: {
    file?: 'db' | 'xlsx' | 'md';
    code?: string;
    row?: number;
    knowledgePointId?: string;
  };
  message: string;
  severity?: 'error' | 'warning';
}
```

## Test Cases

### T1: Endpoint and permissions
- **T1.1** Teacher/Admin can trigger validation and receive a report.
- **T1.2** Student receives 403 when attempting to trigger validation.
- **T1.3** Validation endpoint does not write to disk or database.

### T2: Consistency checks
- **T2.1** Report fails when DB has code not in framework file.
- **T2.2** Report fails when framework file has code not in DB.
- **T2.3** Report fails when Markdown references code not in framework file.
- **T2.4** Report fails when level-3 framework code has no matching Markdown heading.
- **T2.5** Report fails when Markdown heading level does not match code level.
- **T2.6** Report fails when framework name and Markdown heading name differ.
- **T2.7** Report fails when framework importance level is invalid.
- **T2.8** Report fails when framework code parent is missing.

### T3: Frontend integration
- **T3.1** Button opens the validation drawer.
- **T3.2** Clicking an error tag highlights the framework row.
- **T3.3** Clicking an error tag with a Markdown row scrolls the Markdown preview.
- **T3.4** Export error report produces a downloadable file.

---
*Version: 1.0*
*Capability: textbook-consistency-validation*
