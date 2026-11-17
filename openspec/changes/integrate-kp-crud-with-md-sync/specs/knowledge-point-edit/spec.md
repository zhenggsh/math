# knowledge-point-edit Delta Specification

## MODIFIED Requirements

### Requirement: Authorized users can edit a knowledge point's overview metadata

The system SHALL allow users with the TEACHER or ADMIN role to edit a knowledge point's `code`, `name`, `definition`, `characteristics`, and `importanceLevel` from the knowledge point overview panel or the textbook detail framework preview. The system SHALL persist changes to the database and SHALL ALSO update the corresponding content block in the textbook Markdown file, preserving the overall file structure.

#### Scenario: Teacher updates importance and definition
- **WHEN** a teacher selects a knowledge point, opens the edit modal, changes the importance level to A and updates the definition, and submits
- **THEN** the system updates the corresponding row in the `KnowledgePoint` table, rewrites the Markdown content block with the new title and body, and refreshes the view with the new values

#### Scenario: Student cannot edit
- **WHEN** a student views the knowledge point overview panel or the textbook detail framework preview
- **THEN** the edit button is disabled or hidden

#### Scenario: Edit modal pre-fills current values
- **WHEN** a teacher opens the edit modal for a knowledge point
- **THEN** the form fields are pre-filled with the current `code`, `name`, `definition`, `characteristics`, and `importanceLevel` values

#### Scenario: Markdown file is updated when code or name changes
- **WHEN** a teacher changes the knowledge point code from `1.2.3` to `1.2.4` and submits
- **THEN** the system updates the database row and renames the Markdown heading accordingly, preserving the original body content

### Requirement: Validation prevents invalid edit submissions

The system SHALL validate that the submitted `code`, `name`, `definition`, `characteristics`, and `importanceLevel` are non-empty, that `code` is unique within the textbook, that `code` follows the numeric hierarchy format, and that `importanceLevel` is one of the allowed enum values (A, B, C).

#### Scenario: Submit with empty required fields
- **WHEN** a teacher clears a required field and submits the edit form
- **THEN** the system displays a validation error and does not persist the change

#### Scenario: Invalid importance level
- **WHEN** a teacher selects an invalid importance level
- **THEN** the system rejects the submission and shows a validation error

#### Scenario: Duplicate code within textbook
- **WHEN** a teacher changes the code to one already used by another knowledge point in the same textbook
- **THEN** the system rejects the submission and shows a conflict error

## ADDED Requirements

### Requirement: Markdown content block is rewritten atomically with the database update

The system SHALL, within the update operation, locate the content block for the edited knowledge point in the textbook Markdown file and replace its heading and body with the new values. If the content block cannot be located, the system SHALL log a warning, still update the database, and return a response indicating that the Markdown file was not updated.

#### Scenario: Markdown block exists and is updated
- **WHEN** a teacher edits a knowledge point whose Markdown block exists
- **THEN** the system replaces the old block with a new heading and body while preserving all other blocks

#### Scenario: Markdown block is missing
- **WHEN** a teacher edits a knowledge point whose Markdown block cannot be found
- **THEN** the database row is still updated, a warning is logged, and the response includes a message that the Markdown file was not updated

---
*Version: 1.0*
*Capability: knowledge-point-edit*
