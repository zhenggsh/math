## ADDED Requirements

### Requirement: Backend can validate uploaded expansion files without writing
The system SHALL expose a `POST /textbooks/:id/validate` endpoint that accepts the same `framework` (`.xlsx` or `.csv`) and `content` (`.md`) files as `POST /textbooks/:id/expand` and returns a `ValidationReport` without modifying the database or the textbook files.

#### Scenario: Valid files pass validation
- **WHEN** a teacher uploads a valid `.xlsx` and `.md` for a textbook
- **THEN** the endpoint returns `{ success: true, data: { valid: true, errors: [] } }`

#### Scenario: Missing framework file
- **WHEN** a request omits the `framework` file or the file is not `.xlsx` or `.csv`
- **THEN** the endpoint returns HTTP 400 with `BadRequestException`

#### Scenario: Missing content file
- **WHEN** a request omits the `content` file or the file is not `.md`
- **THEN** the endpoint returns HTTP 400 with `BadRequestException`

#### Scenario: Textbook does not exist
- **WHEN** the request targets a textbook ID that is not in the database
- **THEN** the endpoint returns HTTP 404 with `NotFoundException`

#### Scenario: framework file has no valid data
- **WHEN** the uploaded `.xlsx` is empty or has no worksheet containing knowledge framework data, or the uploaded `.csv` is empty or unparsable
- **THEN** the report contains an error with `type: 'xlsx'` and `message` describing the problem

#### Scenario: framework file missing required columns
- **WHEN** the uploaded `.xlsx` or `.csv` does not contain a column for code (`知识点编号`/`编号`/`code`) or level1 (`一级知识点`/`一级`/`level1`)
- **THEN** the report contains a corresponding `xlsx` error

#### Scenario: framework row missing code or level1
- **WHEN** a non-empty xlsx/csv row has no code or no level1 after inheritance/auto-generation rules are applied
- **THEN** the report contains a `xlsx` error locating the row

#### Scenario: framework explicit code is not a numeric hierarchy
- **WHEN** an explicit code does not begin with a numeric dot-separated pattern such as `1.1` or `1.1.1`
- **THEN** the report contains a `xlsx` error with that code

#### Scenario: framework contains duplicate explicit codes
- **WHEN** two or more non-empty xlsx/csv rows share the same explicit code
- **THEN** the report contains a `xlsx` error listing the duplicate code and the affected rows

#### Scenario: framework explicit code conflicts with database
- **WHEN** an explicit code from the xlsx/csv upload already exists in the current textbook's knowledge points
- **THEN** the report contains a `xlsx` error with that code

#### Scenario: framework explicit code has no parent in database
- **WHEN** an explicit code from the xlsx/csv upload has a parent (e.g., `1.1` for `1.1.1`) that does not exist in the current textbook's knowledge points
- **THEN** the report contains a `xlsx` error with that code

#### Scenario: md file is empty
- **WHEN** the uploaded `.md` file contains no content
- **THEN** the report contains an `md` error

#### Scenario: md code not in framework file
- **WHEN** the `.md` file contains a knowledge-point code that is not among the explicit codes in the uploaded `.xlsx` or `.csv`
- **THEN** the report contains an `md` error with that code

#### Scenario: md level-2 heading uses wrong level
- **WHEN** a line contains a level-2 code (e.g., `1.1`) but is headed with `####` instead of `###`
- **THEN** the report contains an `md` error with the row number

#### Scenario: md level-3 heading uses wrong level
- **WHEN** a line contains a level-3 code (e.g., `1.1.1`) but is headed with `###` instead of `####`
- **THEN** the report contains an `md` error with the row number

### Requirement: Validation and expansion share the same parsing and validation rules
The system SHALL use a shared validation pipeline for both the validation endpoint and the existing expansion endpoint so that the validation gate and the write path produce the same results for the same files.

#### Scenario: Refactored expand uses shared helper
- **WHEN** the expansion endpoint processes a file
- **THEN** it calls the same parsing/validation helper as the validation endpoint before performing writes

#### Scenario: Validation fails and expansion is blocked by UI
- **WHEN** the validation endpoint returns `valid: false`
- **THEN** the frontend disables the submit button and the backend does not need to repeat validation before returning its own errors

### Requirement: Validation report uses a consistent structure
The system SHALL return validation errors using the `ValidationIssue` / `ValidationReport` structure for all business-level failures.

#### Scenario: Report contains xlsx error
- **WHEN** an xlsx problem is found
- **THEN** the error has `type: 'xlsx'`, a `location` with `file: 'xlsx'` and either `row` or `code`, and a human-readable `message`

#### Scenario: Report contains md error
- **WHEN** an md problem is found
- **THEN** the error has `type: 'md'`, a `location` with `file: 'md'` and `row`, and a human-readable `message`
