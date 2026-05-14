# Proposal: AI Sidebar to Floating Action Button

## Problem

The current `AISidebar` occupies the right panel of the LearningPage as a permanent fixture. It displays three AI feature buttons (Explain, Quiz, Summarize) that are pure placeholders — clicking them only logs to console. The "AI features coming soon" message has been present for an extended period, creating an impression of an incomplete product while consuming valuable screen real estate.

## Solution

Replace the right-panel `AISidebar` with a **Floating Action Button (FAB)** anchored to the bottom-right corner. When activated, the FAB expands into a chat-style panel where users can:

1. See auto-generated prompt suggestions based on the current knowledge point name
2. Click a suggestion to trigger a mock LLM response display
3. Collapse the panel back to the FAB

This approach eliminates the permanent placeholder UI while preserving future AI extensibility.

## Scope

- Remove `AISidebar` from the right panel of `LearningPage`
- Create new `AIFab` component with floating button + expandable panel
- Implement prompt suggestion generation based on `knowledgePointTitle`
- Implement mock LLM response UI (no actual backend integration)
- Remove or repurpose `AISidebar.tsx` and its styles
- Update `LearningPage` to no longer render a right panel

## Out of Scope

- Actual LLM API integration
- Backend changes
- Chat history persistence
- Real streaming responses

## Acceptance Criteria

- [ ] FAB is visible at bottom-right of LearningPage
- [ ] Clicking FAB expands a panel with prompt suggestions
- [ ] Prompt suggestions are dynamically generated from current knowledge point name
- [ ] Clicking a suggestion shows a mock response in the panel
- [ ] Panel can be closed, returning to FAB state
- [ ] Right panel is removed from LearningPage layout
- [ ] No console errors or TypeScript errors
- [ ] Tests pass
