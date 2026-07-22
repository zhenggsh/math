## ADDED Requirements

### Requirement: Authorized users can delete a knowledge point from the overview panel

The system SHALL allow users with the TEACHER or ADMIN role to delete a knowledge point from the overview panel. The system SHALL remove the row from the `KnowledgePoint` table and remove the corresponding content block from the textbook markdown file.

#### Scenario: Teacher deletes a leaf knowledge point
- **WHEN** a teacher selects a leaf knowledge point, clicks delete, confirms the action, and the node has no children
- **THEN** the system deletes the database row and removes the corresponding content block from the textbook markdown file

#### Scenario: Student cannot delete
- **WHEN** a student views the knowledge point overview panel
- **THEN** the delete button is disabled or hidden

#### Scenario: Delete is disabled for non-leaf nodes
- **WHEN** a teacher selects a knowledge point that has child nodes
- **THEN** the delete button is disabled or the system rejects the delete request with a clear error message

### Requirement: Deletion keeps the database and markdown file consistent

The system SHALL, after deleting the database row, locate the content block for the deleted knowledge point in the textbook markdown file and rewrite the file without that block. The system SHALL preserve all other content blocks and the overall file structure.

#### Scenario: Markdown file is rewritten without the deleted block
- **WHEN** a knowledge point is successfully deleted
- **THEN** the system reads the textbook markdown file, removes the heading range that corresponds to the deleted code, and writes the remaining content back to the same file

#### Scenario: Delete is rejected if the markdown block cannot be located
- **WHEN** the system cannot find a content block for the knowledge point in the markdown file
- **THEN** the system still deletes the database row but logs a warning and returns a response indicating the markdown block was not found

### Requirement: Delete action requires explicit confirmation

The system SHALL require the user to confirm a delete action before removing the knowledge point and its markdown block.

#### Scenario: Teacher cancels delete
- **WHEN** a teacher clicks delete but cancels the confirmation dialog
- **THEN** no data is modified

#### Scenario: Teacher confirms delete
- **WHEN** a teacher clicks delete and confirms the confirmation dialog
- **THEN** the system proceeds with the database and markdown deletion
