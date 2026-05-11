## 1. Setup TextbookContext

- [x] 1.1 Create `web/src/contexts/TextbookContext.tsx` with `TextbookContextType` interface and provider
- [x] 1.2 Implement `localStorage` persistence with key `mathtong:selected-textbooks`
- [x] 1.3 Add textbook list loading via `getTextbooks()` on provider mount
- [x] 1.4 Implement validation: filter restored IDs against API response, remove stale IDs
- [x] 1.5 Implement default selection logic (first textbook if no saved selection or all IDs invalid)

## 2. Update Routing and Entry Points

- [x] 2.1 Change route `/learning/:textbookId` to `/learning/:textbookId?` in `App.tsx`
- [x] 2.2 Wrap app with `TextbookProvider` in `web/src/App.tsx` (inside `BrowserRouter`, outside `Routes`)
- [x] 2.3 Update AppLayout "学习" menu click: navigate to `/learning` or `/learning/${selectedTextbookIds[0]}` instead of fetching and jumping to first textbook
- [x] 2.4 Update HomePage "知识学习" card click: use Context instead of direct `getTextbooks()` call
- [x] 2.5 Verify provider initializes correctly on app load

## 3. Build Textbook Selector UI

- [x] 3.1 Add multi-select `Select` component to `AppLayout` navigation bar (left of user avatar)
- [x] 3.2 Implement loading state with `Spin` icon while textbooks load
- [x] 3.3 Implement empty state when no textbooks exist
- [x] 3.4 Style selector with `maxTagCount={2}` and proper spacing

## 4. Update LearningPage

- [x] 4.1 Import `useTextbook` hook in `LearningPage`
- [x] 4.2 Implement URL-driven load: if URL has `textbookId`, load it and sync to Context
- [x] 4.3 Implement Context-driven load: if URL has no `textbookId`, use `selectedTextbookIds[0]`
- [x] 4.4 Add empty state UI when no textbook is selected (prompt user to select)
- [x] 4.5 Re-load knowledge tree when global selection changes, and reset selected node to first leaf node
- [x] 4.6 Implement URL replace on global selection change while on LearningPage
- [x] 4.7 Remove direct `textbookId` dependencies (use derived value from Context/URL instead)

## 5. Testing & Quality

- [x] 5.1 Add unit tests for `TextbookContext` (selection, persistence, clear)
- [x] 5.2 Verify `pnpm typecheck` passes
- [x] 5.3 Verify `pnpm lint` passes
- [x] 5.4 Manual test: select/deselect textbooks, refresh page, verify persistence
- [x] 5.5 Manual test: navigate to LearningPage with/without URL param
