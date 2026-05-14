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

### Decision: URL-Context bidirectional synchronization
**Rationale:** The URL and global context must stay in sync to ensure consistent behavior across refresh, share, and navigation. The policy is:

1. **Entering LearningPage with URL param** (`/learning/A`): Display textbook A and **synchronize A into the global context** (so refresh and other modules see A). This makes shared links work intuitively.

2. **Entering LearningPage without URL param** (`/learning`): Use Context's `selectedTextbookIds[0]`. If Context is empty, show empty state.

3. **Global selector change while on LearningPage**: `navigate(/learning/${newId}, { replace: true })` to update URL without adding history entries.

4. **Global selector change while NOT on LearningPage**: Update Context only; URL unchanged.

This ensures the URL always reflects the actually displayed textbook, share links work correctly, and the back button is not cluttered with textbook switches.

### Decision: localStorage over sessionStorage
**Rationale:** Users expect their textbook selection to persist across browser sessions, not just the current tab.

## Risks / Trade-offs

- **[Risk]** Context re-renders could affect performance if many components consume it.
  → **Mitigation:** Split context into `TextbookContext` (stable) and use `useMemo` for derived values. Only nav bar and page-level components consume it.

- **[Risk]** User clears localStorage and loses selection.
  → **Mitigation:** Default to first textbook on fresh load. Non-critical UX issue.

- **[Risk]** `getTextbooks()` requires authentication and may return 401 if called before auth state is ready.
  → **Mitigation:** The provider will gate the fetch on auth token availability. If the request fails, `isLoading` becomes false and the selector shows an empty disabled state without crashing.

- **[Risk]** Textbooks saved in localStorage may be deleted by a teacher, leaving stale IDs.
  → **Mitigation:** On context initialization, filter `selectedTextbookIds` against the API response. Remove any IDs not present in the current textbook list. If all IDs are invalid, fall back to the first available textbook.

- **[Risk]** URL-Context synchronization could create infinite update loops.
  → **Mitigation:** LearningPage's `useEffect` for textbook loading must include a guard to prevent re-triggering when the URL was just updated by the same Context change. Use a ref or compare previous values.

- **[Risk]** Two existing entry points (AppLayout "学习" menu and HomePage "知识学习" card) bypass the global selector by directly fetching textbooks and navigating to the first one.
  → **Mitigation:** Update both entry points to navigate to `/learning` (letting Context drive the textbook selection) or `/learning/${selectedTextbookIds[0]}`.

- **[Trade-off]** Multi-select UI is slightly more complex than single-select.
  → **Acceptance:** Ant Design `Select mode="multiple"` handles this natively with minimal code.

## Migration Plan

No migration needed. This is a new feature that coexists with existing URL-based navigation.

**Routing change:** Modify `/learning/:textbookId` to `/learning/:textbookId?` (optional param) in `App.tsx`. This allows accessing `/learning` without a textbook ID, in which case LearningPage derives the active textbook from Context.

The `textbookId` parameter behavior:
- If present: drives the displayed textbook and synchronizes into Context
- If absent: Context's first selected textbook drives the display

## Open Questions

None resolved during design.

**Clarifications:**
- "First textbook" refers to the first item in the API response array (API return order).
- "Cleared selection" (empty array) is persisted to localStorage and respected on next load — the system does NOT auto-revert to the first textbook in this case.
