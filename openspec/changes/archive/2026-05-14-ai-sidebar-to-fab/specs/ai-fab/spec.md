# Spec: AI Floating Action Button (AIFab)

## Requirements

### Functional Requirements

1. **FAB Visibility**
   - FAB is always visible on LearningPage when a knowledge point is selected
   - Position: fixed to bottom-right corner (24px from edges)
   - Size: 56px diameter circle button

2. **Panel Expansion**
   - Clicking FAB expands a panel
   - Panel width: 380px desktop, full-width mobile
   - Panel max-height: 70vh
   - Panel has close button and closes on outside click or ESC key

3. **Prompt Suggestions**
   - Panel shows 3 dynamically generated prompt suggestions
   - Prompts are based on current `knowledgePointTitle`
   - Prompts:
     - "生成「{title}」的常见题目"
     - "「{title}」易错点分析"
     - "「{title}」名师讲解视频"

4. **Mock Response Display**
   - Clicking a prompt shows a simulated loading state (800ms)
   - Then displays a mock formatted response
   - Response includes the knowledge point title for context
   - Response area is scrollable

5. **State Reset**
   - Closing the panel resets to prompt selection view
   - Reopening shows prompt suggestions (not previous response)

6. **Knowledge Point Switch Behavior**
   - When `knowledgePointTitle` changes while panel is open, panel auto-resets to prompt selection view
   - User sees new prompts for the newly selected knowledge point immediately
   - Any in-progress mock response is discarded

### Non-Functional Requirements

- Animation transitions: 200ms CSS ease-out
- No actual LLM API calls
- No backend changes required
- TypeScript strict mode compliant
- Responsive: works on desktop and mobile
- **Z-index**: FAB and panel must render above allotment sash (z-index > 100)

## Interface

```typescript
export interface AIFabProps {
  /** 当前知识点ID */
  knowledgePointId?: string
  /** 当前知识点标题（用于生成提示词） */
  knowledgePointTitle?: string
}

export interface PromptItem {
  key: string
  label: string
  icon: React.ReactNode
  mockResponse: string
}
```

## Behaviors

### Prompt Generation
```
Input: knowledgePointTitle = "三角函数的基本概念"
Output: [
  { key: "questions", label: "生成「三角函数的基本概念」的常见题目", ... },
  { key: "mistakes", label: "「三角函数的基本概念」易错点分析", ... },
  { key: "video", label: "「三角函数的基本概念」名师讲解视频", ... }
]
```

### Mock Response Format
Responses are plain text with line breaks, simulating LLM output:
```
以下是「三角函数的基本概念」的常见题目类型：

1. 基础概念题：理解正弦、余弦、正切的定义
2. 计算题：已知角度求三角函数值
3. 应用题：利用三角函数解决实际问题
```

## Error Handling

- If `knowledgePointTitle` is undefined, show generic prompts without title interpolation
- Panel gracefully handles missing data

## Performance

- Prompt generation is synchronous (string interpolation)
- Mock loading uses `setTimeout` (not blocking)
- Component uses React.memo for optimization
