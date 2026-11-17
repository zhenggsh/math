## ADDED Requirements

### Requirement: Framework preview visually indicates rows involved in a divergence issue

The system SHALL allow `FrameworkPreview` to receive a list of divergence issues. For each row whose code matches an issue, the system SHALL render a visual indicator that distinguishes the issue type: missing in database, missing in file, or changed.

#### Scenario: Row missing in database is highlighted

- **WHEN** a divergence issue of type `missing-in-db` exists for code `1.2.3`
- **THEN** the framework preview row for `1.2.3` is rendered with a distinct style indicating it is not yet in the database

#### Scenario: Row missing in file is highlighted

- **WHEN** a divergence issue of type `missing-in-file` exists for code `1.2.3`
- **THEN** the framework preview row for `1.2.3` is rendered with a distinct style indicating it no longer exists in the file

#### Scenario: Changed row is highlighted

- **WHEN** a divergence issue of type `changed` exists for code `1.2.3`
- **THEN** the framework preview row for `1.2.3` is rendered with a distinct style indicating one or more fields differ from the database

### Requirement: Divergence row indicator includes a summary tooltip

The system SHALL show a tooltip when the user hovers over a highlighted row, summarizing the divergence issue type and, for `changed` issues, the names of the fields that differ.

#### Scenario: User hovers over a changed row

- **WHEN** the user hovers over a row with a `changed` divergence issue
- **THEN** a tooltip appears listing the fields that differ between the file and the database

#### Scenario: User hovers over a missing row

- **WHEN** the user hovers over a row with a `missing-in-db` or `missing-in-file` issue
- **THEN** a tooltip appears explaining that the row is missing in the database or in the file
