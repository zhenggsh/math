## ADDED Requirements

### Requirement: Targeted learning mode
The system SHALL filter knowledge points based on poor mastery.

#### Scenario: Weak points filter
- **WHEN** selecting "Targeted Learning"
- **THEN** the system SHALL show only points with mastery C, D, or E

### Requirement: Importance-based learning
The system SHALL filter knowledge points by importance level.

#### Scenario: A-level first
- **WHEN** selecting "Importance Learning"
- **THEN** the system SHALL show A-level points first, then B, then C

### Requirement: Random learning
The system SHALL provide random knowledge point selection.

#### Scenario: Random mode
- **WHEN** selecting "Random Learning"
- **THEN** the system SHALL randomly select and display a knowledge point

#### Scenario: Random with constraints
- **GIVEN** selected textbook or importance filter
- **WHEN** in random mode
- **THEN** the system SHALL select randomly from filtered set
