## ADDED Requirements

### Requirement: Rich node hover Popover

The system SHALL display a rich Popover when hovering over knowledge tree nodes in both TreeView and MindMapView.

#### Scenario: TreeView node hover
- **GIVEN** the user is in tree view
- **WHEN** the user hovers over a knowledge tree node
- **THEN** after a 300ms delay, a Popover SHALL appear
- **AND** the Popover SHALL display:
  - The knowledge point title
  - The importance level (A/B/C with color)
  - The definition (up to 6 lines, truncated with "..." if longer)
  - The learning status icon (if user is logged in)

#### Scenario: MindMapView node hover
- **GIVEN** the user is in mind map view
- **WHEN** the user hovers over a mind map node
- **THEN** after a 300ms delay, a Popover SHALL appear
- **AND** the Popover SHALL display the same information as in TreeView

#### Scenario: Popover with no definition
- **GIVEN** a knowledge point has no definition
- **WHEN** the user hovers over that node
- **THEN** the Popover SHALL display "暂无定义" in the definition section

#### Scenario: Popover dismiss
- **GIVEN** a Popover is visible
- **WHEN** the user moves the mouse away from the node
- **THEN** the Popover SHALL disappear immediately

#### Scenario: Popover click-through
- **GIVEN** a Popover is visible
- **WHEN** the user clicks the node
- **THEN** the click SHALL still trigger node selection
- **AND** the Popover SHALL not intercept the click event
