## ADDED Requirements

### Requirement: Loading states
The system SHALL show loading indicators during async operations.

#### Scenario: Data loading
- **WHEN** fetching data from API
- **THEN** a loading spinner or skeleton SHALL be shown

#### Scenario: Progress indication
- **WHEN** uploading large files
- **THEN** a progress bar SHALL be displayed

### Requirement: Error boundaries
The system SHALL gracefully handle errors.

#### Scenario: Component error
- **WHEN** a component throws error
- **THEN** an error fallback UI SHALL be shown without crashing the app

#### Scenario: API error
- **WHEN** API request fails
- **THEN** a user-friendly error message SHALL be shown with retry option

### Requirement: Keyboard shortcuts
The system SHALL support keyboard navigation.

#### Scenario: Navigation shortcuts
- **WHEN** pressing arrow keys
- **THEN** the user SHALL navigate through knowledge points

#### Scenario: Action shortcuts
- **WHEN** pressing keyboard shortcuts
- **THEN** common actions (save, toggle view) SHALL be triggered

### Requirement: Empty states
The system SHALL show helpful messages for empty data.

#### Scenario: No knowledge points
- **WHEN** no knowledge points exist
- **THEN** a message SHALL guide user to upload files

#### Scenario: No learning records
- **WHEN** user has no learning history
- **THEN** a message SHALL encourage starting to learn
