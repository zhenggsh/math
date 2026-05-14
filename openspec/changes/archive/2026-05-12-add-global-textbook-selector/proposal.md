## Why

Currently, the learning page requires a `textbookId` URL parameter and defaults to the first textbook when navigating from the home page. There is no way for users to select which textbook(s) to study across different modules (learning, analytics, smart-learning). Users need a persistent, global way to choose textbooks that affects the entire application.

## What Changes

- Add a global `TextbookContext` for managing selected textbook state across the application
- Add a multi-select textbook selector in the top navigation bar (AppLayout)
- Persist selected textbooks to `localStorage`
- Update `LearningPage` to use the global context instead of relying solely on URL parameters
- Provide `TextbookContext` for future consumption by analytics, smart-learning, and exam modules

## Capabilities

### New Capabilities
- `global-textbook-selector`: Global textbook selection state management with multi-select UI in navigation bar

### Modified Capabilities
- `knowledge-tree`: LearningPage will read the active textbook from `TextbookContext` instead of only from URL params

## Impact

- **Frontend**: New `TextbookContext`, modifications to `AppLayout` (nav bar), `LearningPage` (textbook loading), `App.tsx` (provider wrapping)
- **State**: `localStorage` key `mathtong:selected-textbooks`
- **API**: Reuses existing `GET /textbooks` endpoint
- **User-facing**: New dropdown in top nav for textbook selection
