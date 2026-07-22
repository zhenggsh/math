## ADDED Requirements

### Requirement: Authorized users can edit a knowledge point's overview metadata

The system SHALL allow users with the TEACHER or ADMIN role to edit a knowledge point's `definition`, `characteristics`, and `importanceLevel` from the knowledge point overview panel. The system SHALL persist changes only to the database and SHALL NOT modify the textbook markdown file.

#### Scenario: Teacher updates importance and definition
- **WHEN** a teacher selects a knowledge point, opens the edit modal, changes the importance level to A and updates the definition, and submits
- **THEN** the system updates the corresponding row in the `KnowledgePoint` table and refreshes the overview panel with the new values

#### Scenario: Student cannot edit
- **WHEN** a student views the knowledge point overview panel
- **THEN** the edit button is disabled or hidden

#### Scenario: Edit modal pre-fills current values
- **WHEN** a teacher opens the edit modal for a knowledge point
- **THEN** the form fields are pre-filled with the current `definition`, `characteristics`, and `importanceLevel` values

### Requirement: Validation prevents invalid edit submissions

The system SHALL validate that the submitted `definition`, `characteristics`, and `importanceLevel` are non-empty and that `importanceLevel` is one of the allowed enum values (A, B, C).

#### Scenario: Submit with empty required fields
- **WHEN** a teacher clears a required field and submits the edit form
- **THEN** the system displays a validation error and does not persist the change

#### Scenario: Invalid importance level
- **WHEN** a teacher selects an invalid importance level
- **THEN** the system rejects the submission and shows a validation error
