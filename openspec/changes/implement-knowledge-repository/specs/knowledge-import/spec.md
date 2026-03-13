## ADDED Requirements

### Requirement: Excel file parsing
The system SHALL parse xlsx files containing knowledge point frameworks.

#### Scenario: Valid Excel file
- **WHEN** uploading a valid xlsx file
- **THEN** the system SHALL extract columns: level1, level2, level3, definition, characteristics, code, importance

#### Scenario: CSV support
- **WHEN** uploading a csv file
- **THEN** the system SHALL parse it identically to xlsx

### Requirement: Markdown file reading
The system SHALL read md files containing knowledge point details.

#### Scenario: Markdown content
- **WHEN** reading a md file with the same name as xlsx
- **THEN** the system SHALL parse it and associate with knowledge points

### Requirement: File validation
The system SHALL validate uploaded files before processing.

#### Scenario: Invalid file type
- **WHEN** uploading a non-xlsx/csv/md file
- **THEN** the system SHALL reject with error "Invalid file type"

#### Scenario: Malformed Excel
- **WHEN** uploading a corrupted xlsx file
- **THEN** the system SHALL return error "Failed to parse file"

### Requirement: Knowledge point storage
The system SHALL store parsed knowledge points in database.

#### Scenario: New knowledge points
- **WHEN** parsing a new file
- **THEN** the system SHALL create KnowledgePoint records

#### Scenario: Update existing
- **WHEN** re-uploading a modified file
- **THEN** the system SHALL update existing records and add new ones
