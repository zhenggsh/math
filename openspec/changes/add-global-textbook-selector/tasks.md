## 1. Setup TextbookContext

- [ ] 1.1 Create `web/src/contexts/TextbookContext.tsx` with `TextbookContextType` interface and provider
- [ ] 1.2 Implement `localStorage` persistence with key `mathtong:selected-textbooks`
- [ ] 1.3 Add textbook list loading via `getTextbooks()` on provider mount
- [ ] 1.4 Implement default selection logic (first textbook if no saved selection)

## 2. Integrate Provider into App

- [ ] 2.1 Wrap app with `TextbookProvider` in `web/src/App.tsx` (inside `BrowserRouter`)
- [ ] 2.2 Verify provider initializes correctly on app load

## 3. Build Textbook Selector UI

- [ ] 3.1 Add multi-select `Select` component to `AppLayout` navigation bar (left of user avatar)
- [ ] 3.2 Implement loading state with `Spin` icon while textbooks load
- [ ] 3.3 Implement empty state when no textbooks exist
- [ ] 3.4 Style selector with `maxTagCount={2}` and proper spacing

## 4. Update LearningPage

- [ ] 4.1 Import `useTextbook` hook in `LearningPage`
- [ ] 4.2 Use `selectedTextbookIds[0]` from context as primary textbook source
- [ ] 4.3 Implement URL `textbookId` fallback when context is empty
- [ ] 4.4 Add empty state UI when no textbook is selected (prompt user to select)
- [ ] 4.5 Re-load knowledge tree when global selection changes, and reset selected node to first leaf node

## 5. Testing & Quality

- [ ] 5.1 Add unit tests for `TextbookContext` (selection, persistence, clear)
- [ ] 5.2 Verify `pnpm typecheck` passes
- [ ] 5.3 Verify `pnpm lint` passes
- [ ] 5.4 Manual test: select/deselect textbooks, refresh page, verify persistence
- [ ] 5.5 Manual test: navigate to LearningPage with/without URL param
