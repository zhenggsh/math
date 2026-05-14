# mindmap-eagle-eye Specification

## Purpose
TBD - created by archiving change enhance-mindmap-interaction. Update Purpose after archive.
## Requirements
### Requirement: MiniMap panel

The system SHALL provide a collapsible MiniMap panel for eagle-eye navigation of the mind map.

#### Scenario: MiniMap display
- **GIVEN** the user is in mind map view
- **THEN** the MiniMap panel SHALL display in the bottom-right corner
- **AND** it SHALL show a scaled-down view of the entire mind map
- **AND** it SHALL display a semi-transparent rectangle indicating the current viewport

#### Scenario: MiniMap collapse
- **GIVEN** the MiniMap panel is expanded
- **WHEN** the user clicks the collapse button
- **THEN** the panel SHALL collapse to a small floating button
- **AND** the button SHALL display an eye icon

#### Scenario: MiniMap expand
- **GIVEN** the MiniMap panel is collapsed
- **WHEN** the user clicks the floating button
- **THEN** the panel SHALL expand to its full size

#### Scenario: Navigate via MiniMap
- **GIVEN** the MiniMap panel is expanded
- **WHEN** the user clicks on a location within the MiniMap
- **THEN** the main view SHALL center on that location
- **AND** the viewport rectangle SHALL update to reflect the new position

#### Scenario: MiniMap sync with pan/zoom
- **GIVEN** the user pans or zooms the main canvas
- **THEN** the MiniMap viewport rectangle SHALL update in real-time
- **AND** it SHALL accurately reflect the visible area

### Requirement: MiniMap simplified rendering

The MiniMap SHALL use a simplified representation of the mind map to ensure performance.

#### Scenario: Simplified node rendering
- **GIVEN** the MiniMap is rendering
- **THEN** nodes SHALL be rendered as simple rectangles
- **AND** node text labels SHALL be omitted
- **AND** fold/expand buttons SHALL be omitted
- **AND** only the node rectangle and connection lines SHALL be rendered

#### Scenario: Simplified connection rendering
- **GIVEN** the MiniMap is rendering connections
- **THEN** connections SHALL be rendered as simple lines (not Bezier curves)
- **AND** connection styles SHALL match the main view colors

