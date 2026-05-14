# Tasks: AI Sidebar to Floating Action Button

## Task 1: Create AIFab Component

- [x] Create `web/src/components/learning/AIFab.tsx`
  - Implement FAB button (fixed position, bottom-right)
  - Implement expandable panel with animation
  - Implement prompt suggestion generation
  - Implement mock response display with loading state
- [x] Create `web/src/components/learning/AIFab.module.css`
  - FAB styles (circle, shadow, hover effects)
  - Panel styles (width, max-height, border-radius, shadow)
  - Prompt chip styles
  - Response area styles
- [x] Create `web/src/components/learning/__tests__/AIFab.test.tsx`
  - Test FAB renders and is clickable
  - Test panel expands on click
  - Test prompts are generated from title
  - Test mock response displays after clicking prompt
  - Test panel closes and resets state
- [x] Modify `web/src/components/learning/index.ts`
  - Export `AIFab` component and `AIFabProps` type

## Task 2: Update MultiPaneLayout

- [x] Modify `web/src/components/Layout/MultiPaneLayout.tsx`
  - Remove `aiSidebarPanel` prop
  - Remove `showAISidebar` prop
  - Remove right panel related code
  - Update interface and default sizes
- [x] Modify `web/src/components/Layout/MultiPaneLayout.module.css`
  - Remove responsive right panel CSS rule (`@media (max-width: 768px)` block for right panel)

## Task 3: Update LearningPage

- [x] Modify `web/src/pages/LearningPage/LearningPage.tsx`
  - Remove `AISidebar` import and usage
  - Add `AIFab` import and render
  - Pass `knowledgePointId` and `knowledgePointTitle` to AIFab
  - Remove `aiSidebarPanel` from `MultiPaneLayout`
- [x] Modify `web/src/pages/LearningPage/__tests__/LearningPage.test.tsx`
  - Remove `AISidebar` mock
  - Add `AIFab` mock
  - Update `MultiPaneLayout` mock: remove `aiSidebarPanel` prop
  - Update assertion: replace `ai-panel` with `ai-fab`

## Task 4: Remove AISidebar

- [x] Delete `web/src/components/AISidebar/AISidebar.tsx`
- [x] Delete `web/src/components/AISidebar/AISidebar.module.css`
- [x] Delete `web/src/components/AISidebar/index.ts`
- [x] Delete `web/src/components/AISidebar/__tests__/AISidebar.test.tsx`
- [x] Remove AISidebar directory if empty

## Task 5: Verification

- [x] Run `pnpm --filter web typecheck` — zero errors
- [x] Run `pnpm --filter web test --run -- src/components/learning` — all pass
- [x] Run `pnpm --filter web lint` — no errors in modified files
- [ ] Manual dev server check:
  - [ ] FAB visible at bottom-right
  - [ ] Clicking FAB opens panel with prompts
  - [ ] Prompts contain current knowledge point title
  - [ ] Clicking prompt shows mock response after loading
  - [ ] Panel closes correctly
  - [ ] Right panel removed from layout
