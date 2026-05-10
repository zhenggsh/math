## Context

The existing `MindMapView` uses a custom SVG implementation with a simple left-to-right tree layout. It already supports zoom, expand/collapse, and node selection. The `TreeView` uses Ant Design's Tree component with virtual scrolling.

The project uses React 19, TypeScript strict mode, and Ant Design 6. All SVG rendering is self-built (no D3 or graph libraries).

## Goals / Non-Goals

**Goals:**
- Provide a bidirectional balanced layout option for mind maps
- Add eagle-eye navigation via a collapsible MiniMap
- Enable middle-click canvas panning
- Show rich node detail on hover

**Non-Goals:**
- Force-directed or radial layouts
- Touch/gesture support for mobile
- Animation transitions between layout modes
- Node repositioning by user drag

## Decisions

### Decision: Self-built SVG over graph library
**Rationale:** The existing mind map is already self-built SVG. Adding a library like D3 or G6 would introduce significant dependency weight and require refactoring the entire rendering pipeline. The new features (balanced layout, MiniMap, pan) are achievable within the current architecture.

### Decision: MiniMap as overlay panel, not separate viewport
**Rationale:** A floating panel is less intrusive than splitting the view. It can be collapsed when not needed. The MiniMap renders the same SVG content scaled down, ensuring visual consistency.

### Decision: Middle-click (button 1) for pan
**Rationale:** Middle-click is a standard CAD/design tool pattern for panning. It avoids conflicting with left-click (node selection) and right-click (context menu, if added later).

### Decision: Balanced layout splits children by count, not by subtree size
**Rationale:** Simpler to implement and predictable. Users can mentally map "first half goes left, second half goes right."

### Decision: Arc connections from parent edge midpoint to child edge midpoint
**Rationale:** This produces clean, symmetric Bezier curves that clearly indicate parent-child relationships without overlapping node bodies.

## Risks / Trade-offs

- **[Risk]** Balanced layout may produce very wide canvases for nodes with many children.
  → **Mitigation:** Set a reasonable `LEVEL_GAP` (180px) and allow zoom/pan to navigate.

- **[Risk]** MiniMap adds rendering overhead (double SVG render).
  → **Mitigation:** MiniMap uses simplified rendering (no text truncation logic, no interactive elements). Only render when expanded.

- **[Risk]** Middle-click pan may conflict with browser's default middle-click scroll behavior.
  → **Mitigation:** Call `event.preventDefault()` on `mousedown` when `button === 1`. Most modern browsers allow this.

- **[Risk]** Panning may move the entire canvas out of view.
  → **Mitigation:** Constrain pan so that the content bounding box cannot move completely outside the viewport. At least 100px of the content area must remain visible on any edge.

## Migration Plan

No migration needed. Layout mode defaults to existing tree layout, preserving current behavior.

## Open Questions

None resolved during design.
