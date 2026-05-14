## Why

The current mind map view only supports a single tree layout (left-to-right) and lacks navigation aids for large knowledge structures. Users need better ways to explore complex knowledge trees: an alternative balanced layout for readability, an eagle-eye overview for orientation, and smoother canvas navigation via middle-click pan. Additionally, hovering over nodes should reveal richer information than the current simple tooltip.

## What Changes

- Add **balanced layout mode** to MindMapView: root centered, children distributed evenly on left and right sides with horizontal Bezier curves
- Add **collapsible MiniMap panel** (eagle-eye view) for quick navigation across large mind maps
- Add **middle-click pan** support for dragging the canvas without scrollbars
- Add **rich node hover Popover** showing definition, importance level, and learning status on both TreeView and MindMapView nodes
- Add layout mode selector dropdown in the MindMapView toolbar

## Capabilities

### New Capabilities
- `mindmap-balanced-layout`: Bidirectional horizontal layout algorithm for mind map nodes
- `mindmap-eagle-eye`: Collapsible MiniMap panel for viewport navigation
- `mindmap-node-popover`: Rich hover Popover displaying knowledge point details

### Modified Capabilities
- `knowledge-tree`: Enhanced hover interaction from simple Tooltip to rich Popover with definition, importance, and status

## Impact

- **Frontend**: Modifications to `MindMapView` (layout algorithm, MiniMap, pan), `TreeView` (Popover integration), `KnowledgeTree` (layout mode state), new `MiniMapPanel` and `KnowledgeNodePopover` components, new `usePanController` hook
- **Types**: Addition of `LayoutMode`, `direction` field to `MindMapNodeLayout`
- **No backend changes**
