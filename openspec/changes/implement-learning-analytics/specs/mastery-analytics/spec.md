## ADDED Requirements

### Requirement: Mastery distribution
The system SHALL show distribution of mastery levels.

#### Scenario: Overall mastery
- **WHEN** viewing analytics
- **THEN** the system SHALL show count of A/B/C/D/E levels

#### Scenario: Mastery by textbook
- **WHEN** viewing analytics
- **THEN** the system SHALL show mastery distribution per textbook

### Requirement: Weak knowledge points
The system SHALL identify knowledge points needing attention.

#### Scenario: Weak points list
- **WHEN** viewing analytics
- **THEN** the system SHALL list points with mastery C, D, or E

#### Scenario: Never studied points
- **WHEN** viewing analytics
- **THEN** the system SHALL list points with no learning records

### Requirement: Progress tracking
The system SHALL show learning progress over time.

#### Scenario: Mastery improvement
- **WHEN** viewing analytics
- **THEN** the system SHALL show mastery level changes for revisited points
