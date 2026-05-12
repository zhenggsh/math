## ADDED Requirements

### Requirement: Textbook selection state management

The system SHALL provide a global context for managing textbook selection state.

#### Scenario: Context initialization
- **WHEN** the application mounts
- **THEN** the system SHALL load the textbook list via `GET /textbooks`
- **AND** restore previously selected textbooks from `localStorage` key `mathtong:selected-textbooks`
- **AND** validate each restored ID against the API response list
- **AND** remove any IDs that no longer exist in the API response
- **AND** persist the validated (filtered) selection back to `localStorage`
- **AND** if no previous selection exists (first visit), select the first textbook from the API response by default
- **AND** if no textbooks exist in the API response, maintain an empty selection
- **AND** if the user has previously cleared the selection (empty array in localStorage), maintain an empty selection
- **AND** if all restored IDs were invalid (deleted), select the first textbook from the API response by default

#### Scenario: Select a textbook
- **GIVEN** the textbook list is loaded
- **WHEN** user selects a textbook from the selector
- **THEN** the textbook ID SHALL be added to the selected set
- **AND** the selection SHALL persist to `localStorage`

#### Scenario: Deselect a textbook
- **GIVEN** multiple textbooks are selected
- **WHEN** user removes a textbook from the selector
- **THEN** the textbook ID SHALL be removed from the selected set
- **AND** the selection SHALL persist to `localStorage`

#### Scenario: Clear all selections
- **GIVEN** textbooks are selected
- **WHEN** user clears the selector
- **THEN** all textbook IDs SHALL be removed from the selected set
- **AND** the selection SHALL persist to `localStorage`
- **AND** the system SHALL NOT auto-revert to the first textbook

#### Scenario: API failure on load
- **GIVEN** the application is loading the textbook list
- **WHEN** the `GET /textbooks` request fails
- **THEN** the system SHALL set `isLoading` to false
- **AND** the selector SHALL display an empty disabled state
- **AND** the system SHALL NOT crash

### Requirement: Textbook selector UI

The system SHALL display a multi-select textbook selector in the top navigation bar.

#### Scenario: Selector visibility
- **GIVEN** the user is logged in
- **WHEN** the textbook list is loaded
- **THEN** the selector SHALL appear in the top navigation bar
- **AND** it SHALL display to the left of the user avatar

#### Scenario: Selector display
- **GIVEN** the selector is visible
- **THEN** it SHALL display selected textbooks as tags
- **AND** it SHALL show a maximum of 2 tags, with "+N" for overflow
- **AND** it SHALL display a dropdown with all available textbooks
- **AND** each option SHALL display the textbook name

#### Scenario: Loading state
- **GIVEN** the textbook list is loading
- **THEN** the selector SHALL display a loading spinner
- **AND** it SHALL be disabled until loading completes

#### Scenario: Empty state
- **GIVEN** no textbooks exist in the system
- **THEN** the selector SHALL display a placeholder indicating no textbooks available
- **AND** it SHALL be disabled

### Requirement: LearningPage integration

The system SHALL integrate the global textbook selection with the learning page.

#### Scenario: Load from context
- **GIVEN** user navigates to the learning page
- **WHEN** textbooks are selected in the global context
- **THEN** the learning page SHALL use `selectedTextbookIds[0]` as the active textbook
- **AND** it SHALL load the knowledge tree for that textbook

#### Scenario: URL drives context on entry
- **GIVEN** user navigates to the learning page with URL `/learning/:textbookId`
- **WHEN** the page loads
- **THEN** the system SHALL display the textbook from the URL parameter
- **AND** it SHALL synchronize that textbook ID into the global context
- **AND** it SHALL persist the selection to `localStorage`
- **AND** it SHALL load the knowledge tree for that textbook

#### Scenario: Entry without URL param
- **GIVEN** user navigates to `/learning` (no textbookId in URL)
- **WHEN** the page loads
- **THEN** the system SHALL use `selectedTextbookIds[0]` from Context as the active textbook
- **AND** it SHALL load the knowledge tree for that textbook
- **AND** it SHALL update the URL to `/learning/${textbookId}` via replace navigation

#### Scenario: Context drives URL on selector change
- **GIVEN** user is on the learning page
- **WHEN** user changes the global textbook selection
- **THEN** the system SHALL update the URL to `/learning/${newTextbookId}`
- **AND** it SHALL use `replace` navigation (not push)
- **AND** it SHALL reload the knowledge tree for the new textbook

#### Scenario: Context-only navigation
- **GIVEN** user is NOT on the learning page
- **WHEN** user changes the global textbook selection
- **THEN** the system SHALL update the global context
- **AND** it SHALL persist to `localStorage`
- **AND** it SHALL NOT modify the current URL

#### Scenario: No textbook selected
- **GIVEN** no textbooks are selected
- **AND** URL has no `textbookId`
- **WHEN** user navigates to the learning page
- **THEN** the system SHALL display a message prompting user to select a textbook

### Requirement: Navigation entry points

The system SHALL update all navigation entry points to use the global textbook selection.

#### Scenario: AppLayout "学习" menu navigation
- **GIVEN** user clicks the "学习" menu item in the navigation bar
- **WHEN** textbooks are selected in the global context
- **THEN** the system SHALL navigate to `/learning/${selectedTextbookIds[0]}`
- **AND** it SHALL NOT directly fetch the textbook list to determine the target

#### Scenario: HomePage "知识学习" card navigation
- **GIVEN** user clicks the "知识学习" feature card on the home page
- **WHEN** textbooks are selected in the global context
- **THEN** the system SHALL navigate to `/learning/${selectedTextbookIds[0]}`
- **AND** it SHALL NOT directly fetch the textbook list to determine the target

## Types

```typescript
interface TextbookContextType {
  selectedTextbookIds: string[];
  textbooks: Textbook[];
  isLoading: boolean;
  selectTextbook: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  clearSelection: () => void;
}

// localStorage format:
// key: "mathtong:selected-textbooks"
// value: JSON.stringify(string[])  // e.g. '["abc-123", "def-456"]'
```
