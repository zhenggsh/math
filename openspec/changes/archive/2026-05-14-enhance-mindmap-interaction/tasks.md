## 1. Types and Foundation

- [x] 1.1 Add `LayoutMode` type (`'tree' | 'balanced'`) to `KnowledgeTree/types.ts`
- [x] 1.2 Add `direction?: 'left' | 'right'` to `MindMapNodeLayout` interface (note: codebase uses `MindMapNodeLayout`, not `MindMapLayoutNode`)
- [x] 1.3 Update `MindMapViewProps` to accept `layoutMode?: LayoutMode`
- [x] 1.4 Update `KnowledgeTreeProps` to accept and pass `layoutMode`

## 2. Node Hover Popover

- [x] 2.1 Create `KnowledgeNodePopover` component with title, importance, definition, status
- [x] 2.2 Integrate Popover into `TreeView` `TreeNodeTitle` with 300ms delay
- [x] 2.3 Integrate Popover into `MindMapView` SVG nodes with 300ms delay
- [x] 2.4 Handle edge cases: no definition, long text truncation, click-through

## 3. Balanced Layout Algorithm

- [x] 3.1 Refactor `calculateLayout` to support both tree and balanced modes
- [x] 3.2 Implement balanced layout: split children by count, left/right distribution
- [x] 3.3 Calculate horizontal positions: left children at `parent.x - LEVEL_GAP`, right at `parent.x + LEVEL_GAP`
- [x] 3.4 Calculate vertical positions: evenly distribute within subtree height
- [x] 3.5 Render Bezier arcs from parent edge midpoint to child edge midpoint
- [x] 3.6 Ensure grandchild direction inheritance (left children continue left, right continue right)

## 4. MiniMap (Eagle Eye)

- [x] 4.1 Create `MiniMapPanel` component with collapsible panel UI
- [x] 4.2 Render scaled-down SVG of full mind map in MiniMap
- [x] 4.3 Calculate and render viewport rectangle based on main view transform
- [x] 4.4 Implement click-to-navigate: convert MiniMap click to main view translate
- [x] 4.5 Sync viewport rectangle on main view pan/zoom
- [x] 4.6 Implement collapse/expand toggle with floating button

## 5. Middle-Click Pan

- [x] 5.1 Create `usePanController` hook with mousedown/mousemove/mouseup handlers
- [x] 5.2 Detect middle-click (`event.button === 1`) and prevent default
- [x] 5.3 Track drag delta and update SVG translate transform
- [x] 5.4 Implement boundary constraints (keep at least 100px of content visible)
- [x] 5.5 Handle edge case: mouse leaves canvas during drag

## 6. Integration

- [x] 6.1 Add layout mode selector dropdown to `MindMapView` toolbar
- [x] 6.2 Wire up `KnowledgeTree` to pass `layoutMode` to `MindMapView`
- [x] 6.3 Persist layout mode preference to `localStorage`
- [x] 6.4 Ensure zoom controls work with both layouts
- [x] 6.5 Ensure expand/collapse works with both layouts

## 7. Testing & Quality

- [x] 7.1 Verify balanced layout renders correctly for various tree depths
- [x] 7.2 Verify MiniMap navigation syncs accurately
- [x] 7.3 Verify middle-click pan works and respects boundaries
- [x] 7.4 Verify Popover displays correctly on both TreeView and MindMapView
- [x] 7.5 Run `pnpm typecheck` and fix errors
- [x] 7.6 Run `pnpm lint` and fix issues
- [x] 7.7 Manual end-to-end test: layout switch, MiniMap, pan, Popover

## 8. Remove Popover (post-review adjustment)

- [x] 8.1 Remove `KnowledgeNodePopover.tsx` and `KnowledgeNodePopover.module.css`
- [x] 8.2 Remove Popover import and usage from `TreeView.tsx`
- [x] 8.3 Remove Popover import and usage from `MindMapView.tsx`
- [x] 8.4 Remove `onHover` prop from `MindMapNodeProps` and `MindMapNode`
- [x] 8.5 Run `pnpm test` and `pnpm typecheck` to verify no regressions

## 9. Fix MindMap Layout Algorithm — Separate Logical and Physical Layout

**Principle:** The entire logical layout is always determined upfront. When expand/collapse is toggled, recalculate the physical positions of all displayed nodes. Ensure same-level nodes are aligned and evenly spaced. Only draw connection arcs after all physical positions are finalized.

- [x] 9.1 Refactor `calculateSubtreeLayout` to first determine logical children direction (left/right in balanced mode), then compute physical positions
- [x] 9.2 Fix `totalHeight` calculation so subtrees do not overlap when expanded/collapsed
- [x] 9.3 Ensure nodes at the same depth level share the same X coordinate (tree mode) or proper left/right X (balanced mode)
- [x] 9.4 Ensure parent nodes are vertically centered relative to their visible children
- [x] 9.5 Ensure adjacent root-level subtrees stack without overlap
- [x] 9.6 Verify `calculateLayout` recalculates globally on `collapsedKeys` change (already wired in `useMemo`)

## 10. Add Dual Expand/Collapse Buttons for Balanced Layout

**Principle:** After logical layout determines left/right children, show left button if left children exist, right button if right children exist. In tree mode, keep single right button. Both buttons toggle the same collapsed state.

- [x] 10.1 Add `hasLeftChildren` and `hasRightChildren` to `MindMapNodeLayout` in `types.ts`
- [x] 10.2 Update `calculateSubtreeLayout` to populate `hasLeftChildren` / `hasRightChildren` based on logical layout
- [x] 10.3 Update `MindMapNode` in `MindMapView.tsx` to render left expand/collapse button when `hasLeftChildren` is true
- [x] 10.4 Update `MindMapNode` to render right expand/collapse button when `hasRightChildren` is true
- [x] 10.5 In `tree` layout mode, only render the right-side button (preserve existing behavior)
- [x] 10.6 Both buttons call the same `onToggleCollapse` for that node

## 11. Update Tests for New Layout Behavior

- [x] 11.1 Add tests for `hasLeftChildren` / `hasRightChildren` in layout output
- [x] 11.2 Add tests verifying dual buttons appear in balanced mode for nodes with both left and right children
- [x] 11.3 Add tests verifying single button in tree mode
- [x] 11.4 Add tests verifying no node overlap after expand/collapse toggle
- [x] 11.5 Run `pnpm --filter web test --run -- src/components/KnowledgeTree` — all pass
- [x] 11.6 Run `pnpm --filter web typecheck` — zero errors

## 12. Independent Left/Right Subtree Vertical Arrangement

**Principle:** In balanced mode, left and right subtrees arrange independently within the parent's available vertical space. Both sides start from the top of their allocated space and flow downward, each vertically centered within the parent's available height. Neither side's layout depends on the other's height or position.

- [x] 12.1 Refactor `assignCoordinates` in `mindmapLayout.ts` to process `leftChildren` and `rightChildren` as separate groups
- [x] 12.2 Calculate `leftTotalHeight` from left children only; calculate `rightTotalHeight` from right children only
- [x] 12.3 Left children start at `yStart + (availableHeight - leftTotalHeight) / 2`
- [x] 12.4 Right children start at `yStart + (availableHeight - rightTotalHeight) / 2`
- [x] 12.5 Update `calculateSubtreeHeight` to return `Math.max(leftTotal, rightTotal, NODE_HEIGHT)` so parent height accommodates both sides independently
- [x] 12.6 In tree mode, behavior remains unchanged (only right children exist)

## 13. Per-Side Independent Expand/Collapse

**Principle:** The left expand/collapse button toggles only the left children of that node; the right button toggles only the right children. Each side has its own collapsed state. A node can have its left side collapsed while its right side is expanded, or vice versa.

- [x] 13.1 Update `calculateLayout` signature to accept `collapsedLeftKeys: Set<string>` and `collapsedRightKeys: Set<string>` instead of single `collapsedKeys`
- [x] 13.2 Update `calculateSubtreeHeight` to check `collapsedLeftKeys` for left children visibility and `collapsedRightKeys` for right children visibility
- [x] 13.3 Update `assignCoordinates` to use separate collapsed sets for left/right children filtering
- [x] 13.4 Update `MindMapView` state from `collapsedKeys` to `collapsedLeftKeys` and `collapsedRightKeys`
- [x] 13.5 Update `MindMapNode` `onToggleCollapse` prop to accept `(key: string, side: 'left' | 'right')`
- [x] 13.6 Left button calls `onToggleCollapse(layout.id, 'left')`; right button calls `onToggleCollapse(layout.id, 'right')`
- [x] 13.7 Update `expandAll` to clear both sets; update `collapseAll` to populate both sets for all parent nodes
- [x] 13.8 In tree mode, only the right button exists and controls `collapsedRightKeys`
- [x] 13.9 Update `mindmapLayout.test.ts` to pass dual collapsed sets and verify independent left/right layout
- [x] 13.10 Update `MindMapView.test.tsx` to verify per-side button behavior
- [x] 13.11 Run `pnpm --filter web test --run -- src/components/KnowledgeTree` — all pass (KnowledgeTree tests all pass; 5 pre-existing failures in unrelated files)
- [x] 13.12 Run `pnpm --filter web build` (typecheck equivalent) — zero errors
- [ ] 13.13 Manual end-to-end test: verify independent left/right expand/collapse in balanced mode

## 14. Hierarchical Font Sizing in MindMap Nodes

- [x] 14.1 In `MindMapNode`, compute font size based on `layout.depth`: depth 0 = 14px bold, depth 1 = 12px, depth 2+ = 10px
- [x] 14.2 Apply `fontWeight` attribute to `<text>` element when depth === 0
- [x] 14.3 Verify text remains vertically centered after font size changes

## 15. Left-Click Canvas Panning

- [x] 15.1 Update `usePanController` `onMouseDown` to accept both `button === 0` (left) and `button === 1` (middle)
- [x] 15.2 Add `onMouseDown` with `e.stopPropagation()` to `MindMapNode` `<g>` element to prevent node clicks from bubbling to canvas
- [x] 15.3 Ensure node selection (onClick) still works normally with left click

## 16. MiniMap Viewport Drag-to-Pan

- [x] 16.1 Add `onViewportPan?: (contentDeltaX: number, contentDeltaY: number) => void` prop to `MiniMapPanel`
- [x] 16.2 Track drag state on viewport rect with mousedown/mousemove/mouseup handlers
- [x] 16.3 Convert mouse delta from mini-map pixels to content coordinates (divide by `miniScale`)
- [x] 16.4 In `MindMapView`, add `translateRef` to read current translate inside callback
- [x] 16.5 Implement `handleMiniMapViewportPan` that updates translate via `setTranslate`
- [x] 16.6 Pass `onViewportPan` to `MiniMapPanel`

## 17. TreeView Toolbar Alignment

- [x] 17.1 Add left-side title "Tree-View" to TreeView toolbar (matching MindMap style)
- [x] 17.2 Move Expand/Collapse buttons to the right side of toolbar with `Space` wrapper
- [x] 17.3 Rename button text: "Expand All" → "Expand", "Collapse All" → "Collapse"
- [x] 17.4 Use same icons (`PlusOutlined`, `MinusOutlined`) and `size="small"` as MindMap
- [x] 17.5 Add `.toolbarTitle` CSS to `TreeView.module.css` matching MindMapView

## 18. Unified Toolbar Titles

- [x] 18.1 Change MindMap toolbar title from "Mind Map" to "Mind-Map"
- [x] 18.2 Verify TreeView toolbar title is "Tree-View"

## 19. Testing & Verification

- [x] 19.1 Update `TreeView.test.tsx` and `usePanController.test.ts` for new behavior
- [x] 19.2 Update `MiniMapPanel` tests for viewport drag if applicable
- [x] 19.3 Run `pnpm --filter web build` — zero TypeScript errors
- [x] 19.4 Run `pnpm --filter web test --run -- src/components/KnowledgeTree` — all pass (117 passed; 5 pre-existing failures in unrelated files)
- [ ] 19.5 Manual end-to-end test: font sizes, left-click pan, MiniMap drag, TreeView toolbar

## 20. Fix P0 Issues from Code Review

- [x] 20.1 Add empty array guard to `calculateLayout` in `mindmapLayout.ts` to prevent NaN when `nodes` is empty
- [x] 20.2 Replace unstable `index`-based React key with stable `conn-${parent.id}-${child.id}` key for SVG connection lines in `MindMapView.tsx`
- [x] 20.3 Run `pnpm --filter web build` — zero errors
- [x] 20.4 Run `pnpm --filter web test --run -- src/components/KnowledgeTree` — all pass (117 passed; 5 pre-existing failures in unrelated files)
