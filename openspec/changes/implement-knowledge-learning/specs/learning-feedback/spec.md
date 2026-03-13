## ADDED Requirements

### Requirement: Learning session recording
The system SHALL record learning sessions with timestamps.

#### Scenario: Session start
- **WHEN** opening a knowledge point
- **THEN** the system SHALL record start time

#### Scenario: Session end
- **WHEN** leaving a knowledge point or closing page
- **THEN** the system SHALL calculate and record duration

### Requirement: Mastery level rating
The system SHALL allow users to rate their mastery level.

#### Scenario: Mastery selection
- **WHEN** completing a learning session
- **THEN** the user SHALL select mastery level: A(excellent), B(good), C(average), D(poor), E(very poor)

#### Scenario: Notes input
- **WHEN** rating mastery
- **THEN** the user MAY add text notes

### Requirement: Learning history
The system SHALL display learning history for each knowledge point.

#### Scenario: History display
- **WHEN** viewing a knowledge point
- **THEN** the system SHALL show all previous learning records
