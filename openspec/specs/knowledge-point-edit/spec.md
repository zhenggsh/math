# knowledge-point-edit Specification

## Purpose

Allow authorized users to edit a knowledge point's metadata and, when editing from the textbook detail context, synchronize the change to the corresponding Markdown content block so the database and file content remain consistent.

## Requirements

### Requirement: Authorized users can edit a knowledge point's overview metadata

The system SHALL allow users with the TEACHER or ADMIN role to edit a knowledge point's `code`, `name`, `definition`, `characteristics`, and `importanceLevel` from the edit modal. The system SHALL validate that the submitted `code` is unique within the textbook and that `importanceLevel` is one of the allowed enum values (A, B, C).

#### Scenario: Teacher updates importance and definition

- **WHEN** a teacher selects a knowledge point, opens the edit modal, changes the importance level to A and updates the definition, and submits
- **THEN** the system updates the corresponding row in the `KnowledgePoint` table, refreshes the overview panel with the new values, and synchronizes the Markdown content block when applicable

#### Scenario: Student cannot edit

- **WHEN** a student views the knowledge point overview panel
- **THEN** the edit button is disabled or hidden

#### Scenario: Edit modal pre-fills current values

- **WHEN** a teacher opens the edit modal for a knowledge point
- **THEN** the form fields are pre-filled with the current `code`, `name`, `definition`, `characteristics`, and `importanceLevel` values

### Requirement: Editing from the textbook detail page synchronizes the Markdown file

When the edit action is triggered from the textbook detail page, the system SHALL update the database row and then locate the Markdown content block identified by the original knowledge point code. If the block is found, the system SHALL rewrite the block heading and body using the updated fields and write the change back to the textbook Markdown file. If the block is missing, the system SHALL still update the database row and return a response flag indicating that the Markdown file was not updated.

#### Scenario: Teacher edits from the textbook detail page and Markdown block exists

- **WHEN** a teacher edits a knowledge point from the textbook detail page and the Markdown file contains a matching content block
- **THEN** the system updates the database row and rewrites the Markdown content block with the new values

#### Scenario: Teacher edits from the textbook detail page and Markdown block is missing

- **WHEN** a teacher edits a knowledge point from the textbook detail page but the Markdown file does not contain a matching content block
- **THEN** the system still updates the database row, logs a warning, and returns a flag indicating the Markdown block was not found

#### Scenario: Markdown write failure rolls back the database change

- **WHEN** the Markdown file write fails after the database row is updated
- **THEN** the system reverts the database row to its previous state and returns an error

### Requirement: Validation prevents invalid edit submissions

The system SHALL validate that the submitted `name`, `definition`, `characteristics`, and `importanceLevel` are non-empty, that `importanceLevel` is one of the allowed enum values (A, B, C), and that the submitted `code` is unique within the textbook.

#### Scenario: Submit with empty required fields

- **WHEN** a teacher clears a required field and submits the edit form
- **THEN** the system displays a validation error and does not persist the change

#### Scenario: Invalid importance level

- **WHEN** a teacher selects an invalid importance level
- **THEN** the system rejects the submission and shows a validation error

#### Scenario: Duplicate code within the textbook

- **WHEN** a teacher submits a code that already belongs to another knowledge point in the same textbook
- **THEN** the system rejects the submission and shows a validation error

