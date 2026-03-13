## ADDED Requirements

### Requirement: Knowledge tree view
The system SHALL display knowledge points in a hierarchical tree.

#### Scenario: Tree structure
- **WHEN** viewing the left pane
- **THEN** the system SHALL show expandable tree (level1 → level2 → level3)

#### Scenario: Selection sync
- **WHEN** clicking a knowledge point in tree
- **THEN** the center pane SHALL display its content

### Requirement: Mind map view
The system SHALL provide a mind map visualization.

#### Scenario: View switching
- **WHEN** clicking view toggle
- **THEN** the system SHALL switch between tree and mind map

#### Scenario: Mind map interaction
- **WHEN** viewing mind map
- **THEN** nodes SHALL be clickable to navigate

### Requirement: Context display
The system SHALL show current knowledge point with context.

#### Scenario: Context mode
- **WHEN** enabling context mode
- **THEN** the system SHALL display current point with parent/children points
