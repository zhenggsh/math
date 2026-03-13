## ADDED Requirements

### Requirement: Multi-pane layout
The system SHALL provide a flexible multi-pane layout similar to TRAE IDE.

#### Scenario: Four-pane layout
- **WHEN** viewing the learning page
- **THEN** the system SHALL display four panes: left (tree), center (content), right (AI sidebar), bottom (feedback)

#### Scenario: Resizable panes
- **WHEN** dragging pane dividers
- **THEN** pane sizes SHALL be adjustable

#### Scenario: Collapsible panes
- **WHEN** clicking collapse button
- **THEN** panes SHALL be hideable/showable

### Requirement: Markdown preview
The system SHALL render Markdown content with extensions.

#### Scenario: Basic markdown
- **WHEN** displaying knowledge point content
- **THEN** the system SHALL render headings, lists, code blocks, tables

#### Scenario: LaTeX math
- **WHEN** content contains $...$ or $$...$$
- **THEN** the system SHALL render math formulas using KaTeX

#### Scenario: Mermaid diagrams
- **WHEN** content contains mermaid code blocks
- **THEN** the system SHALL render diagrams

#### Scenario: Source view toggle
- **WHEN** clicking toggle button
- **THEN** the system SHALL switch between rendered and raw markdown
