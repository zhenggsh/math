## ADDED Requirements

### Requirement: Knowledge repository listing
The system SHALL display all knowledge repositories (textbooks).

#### Scenario: Repository list
- **WHEN** viewing the knowledge repository page
- **THEN** the system SHALL show all textbook names from iksm/ directory

### Requirement: File management
The system SHALL allow teachers to upload and delete files.

#### Scenario: File upload
- **GIVEN** a user with TEACHER or ADMIN role
- **WHEN** uploading a valid file
- **THEN** the file SHALL be saved to iksm/ directory

#### Scenario: File deletion
- **GIVEN** a user with TEACHER or ADMIN role
- **WHEN** deleting a file
- **THEN** the file SHALL be removed from iksm/ and associated knowledge points marked

### Requirement: Refresh mechanism
The system SHALL detect file changes and update knowledge points.

#### Scenario: Manual refresh
- **WHEN** clicking the refresh button
- **THEN** the system SHALL scan iksm/ for new/modified files and update the list

#### Scenario: File modification detection
- **WHEN** a file's modification time has changed
- **THEN** the system SHALL re-parse and update the knowledge points

### Requirement: Knowledge point display
The system SHALL display parsed knowledge points in a tree structure.

#### Scenario: Tree view
- **WHEN** selecting a textbook
- **THEN** the system SHALL display knowledge points in hierarchical tree (level1 → level2 → level3)
