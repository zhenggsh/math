## 1. Types and Foundation

- [ ] 1.1 Add `LayoutMode` type (`'tree' | 'balanced'`) to `KnowledgeTree/types.ts`
- [ ] 1.2 Add `direction?: 'left' | 'right'` to `MindMapNodeLayout` interface (note: codebase uses `MindMapNodeLayout`, not `MindMapLayoutNode`)
- [ ] 1.3 Update `MindMapViewProps` to accept `layoutMode?: LayoutMode`
- [ ] 1.4 Update `KnowledgeTreeProps` to accept and pass `layoutMode`

## 2. Node Hover Popover

- [ ] 2.1 Create `KnowledgeNodePopover` component with title, importance, definition, status
- [ ] 2.2 Integrate Popover into `TreeView` `TreeNodeTitle` with 300ms delay
- [ ] 2.3 Integrate Popover into `MindMapView` SVG nodes with 300ms delay
- [ ] 2.4 Handle edge cases: no definition, long text truncation, click-through

## 3. Balanced Layout Algorithm

- [ ] 3.1 Refactor `calculateLayout` to support both tree and balanced modes
- [ ] 3.2 Implement balanced layout: split children by count, left/right distribution
- [ ] 3.3 Calculate horizontal positions: left children at `parent.x - LEVEL_GAP`, right at `parent.x + LEVEL_GAP`
- [ ] 3.4 Calculate vertical positions: evenly distribute within subtree height
- [ ] 3.5 Render Bezier arcs from parent edge midpoint to child edge midpoint
- [ ] 3.6 Ensure grandchild direction inheritance (left children continue left, right continue right)

## 4. MiniMap (Eagle Eye)

- [ ] 4.1 Create `MiniMapPanel` component with collapsible panel UI
- [ ] 4.2 Render scaled-down SVG of full mind map in MiniMap
- [ ] 4.3 Calculate and render viewport rectangle based on main view transform
- [ ] 4.4 Implement click-to-navigate: convert MiniMap click to main view translate
- [ ] 4.5 Sync viewport rectangle on main view pan/zoom
- [ ] 4.6 Implement collapse/expand toggle with floating button

## 5. Middle-Click Pan

- [ ] 5.1 Create `usePanController` hook with mousedown/mousemove/mouseup handlers
- [ ] 5.2 Detect middle-click (`event.button === 1`) and prevent default
- [ ] 5.3 Track drag delta and update SVG translate transform
- [ ] 5.4 Implement boundary constraints (keep at least 100px of content visible)
- [ ] 5.5 Handle edge case: mouse leaves canvas during drag

## 6. Integration

- [ ] 6.1 Add layout mode selector dropdown to `MindMapView` toolbar
- [ ] 6.2 Wire up `KnowledgeTree` to pass `layoutMode` to `MindMapView`
- [ ] 6.3 Persist layout mode preference to `localStorage`
- [ ] 6.4 Ensure zoom controls work with both layouts
- [ ] 6.5 Ensure expand/collapse works with both layouts

## 7. Testing & Quality

- [ ] 7.1 Verify balanced layout renders correctly for various tree depths
- [ ] 7.2 Verify MiniMap navigation syncs accurately
- [ ] 7.3 Verify middle-click pan works and respects boundaries
- [ ] 7.4 Verify Popover displays correctly on both TreeView and MindMapView
- [ ] 7.5 Run `pnpm typecheck` and fix errors
- [ ] 7.6 Run `pnpm lint` and fix issues
- [ ] 7.7 Manual end-to-end test: layout switch, MiniMap, pan, Popover
