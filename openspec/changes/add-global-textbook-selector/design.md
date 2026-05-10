## Context

Currently, `LearningPage` obtains the active textbook via URL parameter (`/learning/:textbookId`). The home page's "Knowledge Learning" card automatically navigates to the first textbook. There is no mechanism for users to explicitly select which textbook(s) to study, and this selection does not carry across modules (learning, analytics, smart-learning).

The project already uses React Context for auth state (`AuthContext`) and Ant Design components throughout. The `getTextbooks()` API exists and returns all available textbooks.

## Goals / Non-Goals

**Goals:**
- Provide a persistent, global textbook selection mechanism
- Allow multi-select of textbooks in the navigation bar
- Persist selection to `localStorage` across sessions
- Update `LearningPage` to use the global context as primary source

**Non-Goals:**
- Modifying analytics, smart-learning, or exam modules to consume the context (they will be updated in future changes)
- Changing the textbook data model or backend API
- Supporting drag-and-drop reordering of selected textbooks

## Decisions

### Decision: React Context over Zustand/Redux
**Rationale:** The project already uses React Context for `AuthContext`. Adding another state management library introduces inconsistency and dependency bloat. Context is sufficient for this use case (textbook list + selected IDs) which updates infrequently.

### Decision: Multi-select with single-active behavior in LearningPage
**Rationale:** The selector supports multi-select for future analytics (compare across textbooks). However, `LearningPage` displays a single knowledge tree, so it uses `selectedTextbookIds[0]` as the active textbook. This provides forward compatibility without over-engineering now.

### Decision: Keep URL `textbookId` as transient fallback
**Rationale:** Direct links to `/learning/:textbookId` should still work for sharing. If URL param exists but context is empty, the URL `textbookId` is used for the current page load only. It does NOT update the global context or localStorage — this preserves the user's explicit selection state and avoids surprising side effects when following a shared link.

### Decision: localStorage over sessionStorage
**Rationale:** Users expect their textbook selection to persist across browser sessions, not just the current tab.

## Risks / Trade-offs

- **[Risk]** Context re-renders could affect performance if many components consume it.
  → **Mitigation:** Split context into `TextbookContext` (stable) and use `useMemo` for derived values. Only nav bar and page-level components consume it.

- **[Risk]** User clears localStorage and loses selection.
  → **Mitigation:** Default to first textbook on fresh load. Non-critical UX issue.

- **[Risk]** `getTextbooks()` requires authentication and may return 401 if called before auth state is ready.
  → **Mitigation:** The provider will gate the fetch on auth token availability. If the request fails, `isLoading` becomes false and the selector shows an empty disabled state without crashing.

- **[Trade-off]** Multi-select UI is slightly more complex than single-select.
  → **Acceptance:** Ant Design `Select mode="multiple"` handles this natively with minimal code.

## Migration Plan

No migration needed. This is a new feature that coexists with existing URL-based navigation.

**Routing note:** The existing `/learning/:textbookId` route is preserved as-is. The `textbookId` URL parameter becomes optional in practice — `LearningPage` will use context first and fall back to the URL param. No route definition changes are required in `App.tsx`.

## Open Questions

None resolved during design.

**Clarifications:**
- "First textbook" refers to the first item in the API response array (API return order).
- "Cleared selection" (empty array) is persisted to localStorage and respected on next load — the system does NOT auto-revert to the first textbook in this case.
