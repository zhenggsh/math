# Design: AI Sidebar to Floating Action Button

## Overview

Transform the placeholder AI sidebar into a functional floating action button with an expandable prompt panel. The design follows the "simple principle" — only present UI elements that provide immediate value.

## Component Architecture

### New Component: `AIFab`

```
AIFab
├── FloatingButton (Ant Design Button, circle, primary, bottom-right fixed)
└── AIPanel (Drawer or Modal-like overlay)
    ├── Header (title + close button)
    ├── PromptSuggestions (dynamic prompt chips)
    └── ResponseArea (mock response display)
```

**Location:** `web/src/components/learning/AIFab.tsx`
**Styles:** `web/src/components/learning/AIFab.module.css`

### Modified Components

- `LearningPage.tsx` — remove `AISidebar` from right panel, add `AIFab`
- `ResizableLayout` or `MultiPaneLayout` — adjust to no longer expect right panel

## State Management

| State | Type | Description |
|-------|------|-------------|
| `panelOpen` | `boolean` | Whether the AI panel is expanded |
| `selectedPrompt` | `string \| null` | Currently selected prompt key |
| `responseContent` | `string \| null` | Mock response text to display |
| `isLoading` | `boolean` | Simulated loading state for mock responses |

## Prompt Generation

Prompts are generated dynamically based on `knowledgePointTitle`:

```typescript
const generatePrompts = (title: string): PromptItem[] => [
  {
    key: 'questions',
    label: `生成「${title}」的常见题目`,
    icon: <QuestionCircleOutlined />,
    mockResponse: `以下是「${title}」的常见题目类型：\n\n1. 基础概念题...`,
  },
  {
    key: 'mistakes',
    label: `「${title}」易错点分析`,
    icon: <AlertOutlined />,
    mockResponse: `「${title}」学习中常见的易错点：\n\n1. 混淆概念...`,
  },
  {
    key: 'video',
    label: `「${title}」名师讲解视频`,
    icon: <PlayCircleOutlined />,
    mockResponse: `推荐以下名师讲解视频：\n\n1. [视频标题] - 讲师：...`,
  },
]
```

## Interaction Flow

```
User opens LearningPage
    → FAB visible at bottom-right (Robot icon)
    → User clicks FAB
        → Panel slides up from bottom-right
        → Shows 3 prompt suggestion chips
        → User clicks a chip
            → Shows loading spinner (800ms)
            → Displays mock response with formatted text
            → User can click another chip or close panel
        → User clicks close or outside
            → Panel collapses back to FAB
```

## Layout Changes

### Before
```
+----------+--------------+----------+
| Knowledge|   Markdown   | AI       |
| Tree     |   Content    | Sidebar  |
|          |              | (placeholder)
+----------+--------------+----------+
|          Feedback Panel             |
+-------------------------------------+
```

### After
```
+----------+--------------+
| Knowledge|   Markdown   |
| Tree     |   Content    |
|          |              |
+----------+--------------+
|      Feedback Panel     |
+-------------------------+
                    [FAB]
```

The FAB is `position: fixed` at `bottom: 24px; right: 24px` and does not participate in the main layout flow.

## Visual Design

### FAB
- Size: 56px diameter
- Color: Primary blue (`#1890ff`)
- Icon: `<RobotOutlined />`
- Shadow: `0 4px 12px rgba(0, 0, 0, 0.15)`
- Hover: scale(1.05) + shadow increase

### Panel
- Width: 380px (mobile: 100vw)
- Max-height: 70vh
- Border-radius: 12px (top corners on mobile)
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.12)`
- Background: white

### Prompt Chips
- Layout: Vertical stack of clickable cards
- Each card: icon + label
- Hover: border-color transition to primary
- Active/selected: primary border + light blue background

### Response Area
- Markdown-like formatting for mock responses
- Scrollable if content exceeds panel height
- Loading state: spinner centered

## Animation

- FAB → Panel: CSS transition `transform` + `opacity`, 200ms ease-out
- Panel → FAB: reverse transition
- Response loading: Ant Design `Spin` component

## Accessibility

- FAB has `aria-label="AI Assistant"`
- Panel has `role="dialog"` when open
- Focus trap within panel when open
- ESC key closes panel

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web/src/components/learning/AIFab.tsx` | Create | New FAB + panel component |
| `web/src/components/learning/AIFab.module.css` | Create | Styles for FAB and panel |
| `web/src/components/learning/__tests__/AIFab.test.tsx` | Create | Unit tests |
| `web/src/components/learning/index.ts` | Modify | Export AIFab component |
| `web/src/pages/LearningPage/LearningPage.tsx` | Modify | Replace AISidebar with AIFab, remove right panel |
| `web/src/pages/LearningPage/__tests__/LearningPage.test.tsx` | Modify | Remove AISidebar mock, add AIFab mock |
| `web/src/components/AISidebar/AISidebar.tsx` | Delete | Remove old component |
| `web/src/components/AISidebar/AISidebar.module.css` | Delete | Remove old styles |
| `web/src/components/AISidebar/index.ts` | Delete | Remove old export |
| `web/src/components/AISidebar/__tests__/AISidebar.test.tsx` | Delete | Remove old tests |
| `web/src/components/Layout/MultiPaneLayout.tsx` | Modify | Remove right panel slot |
| `web/src/components/Layout/MultiPaneLayout.module.css` | Modify | Remove responsive right panel rule |
