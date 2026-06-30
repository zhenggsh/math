## Context

当前 `web/src/pages/analytics/StudentAnalyticsPage.tsx` 将所有分析内容（概览卡片、掌握度分布、学习趋势、知识点轨迹、薄弱点）纵向堆叠在一个页面中。随着学习记录增加，页面过长且信息视角混杂。同时，全局教材选择器已支持多选，但分析页面未与教材选择联动，无法针对"当前正在学的教材"给出聚焦分析。

本次变更采用方案 1：在现有页面基础上引入 Ant Design Tabs，将内容按 4 个维度重新组织；不引入 `ResizableLayout`，以最小改动实现清晰的信息分层。

## Goals / Non-Goals

**Goals：**

- 将 `/analytics/student` 改造为按教材聚焦的多标签分析页面。
- 4 个维度标签清晰分离：教材维度、学习行为维度、知识点维度、总结与建议。
- 分析对象固定为全局教材选择器第一个选中的教材。
- 现有学生端分析 API 支持按 `textbookId` 过滤。
- 保持与现有 Ant Design 主题和图表组件风格一致。

**Non-Goals：**

- 不改动教师端分析页面 `/analytics/teacher`。
- "总结与建议"维度本次不接入真实 LLM，仅做占位。
- 不引入新的布局系统（继续使用 AppLayout 内容区）。
- 不支持在分析页面内切换教材。

## Decisions

### 1. 使用 Tabs 而非 Dashboard + Tabs

**选择**：直接用 Tabs 切换 4 个维度，不在页面顶部保留固定 Dashboard。

**理由**：方案 1 的核心目标是"最小改动"。固定 Dashboard 需要重新定义跨维度 summary，增加额外 API 和组件；纯 Tabs 可以把现有内容几乎原样迁移到对应标签中。如果未来需要全局概览，可以在顶部增加固定区域，不影响当前结构。

### 2. 分析对象取全局选择器第一个教材

**选择**：页面从 `TextbookContext.selectedTextbookIds[0]` 获取分析对象，页面内不提供教材切换。

**理由**：用户明确要求"只对全局选择器中的第一个教材作为分析对象。在分析窗口内不要再选择"。这避免了页面状态与全局选择器状态冲突，实现简单。

### 3. 后端 API 增加 `textbookId` 参数而非新建聚合 API

**选择**：在现有 5 个学生端分析 API 上统一增加 `textbookId` 查询参数。

**理由**：现有 API 逻辑已稳定，增加参数改动小；前端可以按需分别请求各维度数据，与当前实现方式一致。对于"教材维度"中需要"知识点总数/未学习数"的数据，如果现有 API 无法直接提供，再考虑新增 `GET /analytics/student/textbook-summary`。

### 4. "总结与建议"用规则模板生成真实内容

**选择**：第 4 个 Tab 不再使用占位提示，而是基于已有数据用规则模板生成中文总结文本。

**理由**：CEO 评审认为纯占位会给用户带来体验断层。规则模板可以在不接入 LLM 的情况下提供即时价值，同时为未来 LLM 替换预留接口。模板输入来自 `textbook-summary`、`overview`、`weak-points`、`learning-trend` 等已有 API。

## Expanded Scope Decisions

本次在基础方案之上补充了 4 项用户-facing 功能：

1. **规则总结（第 4 维度）**：基于已有 API 数据生成中文总结文本，不使用 LLM。
2. **"去学习"按钮**：薄弱知识点列表中每个条目增加按钮，跳转至 `/smart-learning?focusKnowledgePointId={id}`。
3. **时间范围切换**：学习行为维度支持 7 / 30 / 90 天切换。
4. **进步/退步/薄弱筛选**：知识点维度列表支持按全部 / 进步中 / 退步中 / 薄弱点过滤。

## Component Map

| 组件 | 路径 |
|------|------|
| TextbookHeader | `web/src/components/analytics/TextbookHeader.tsx` |
| TextbookDimensionTab | `web/src/components/analytics/TextbookDimensionTab.tsx` |
| BehaviorDimensionTab | `web/src/components/analytics/BehaviorDimensionTab.tsx` |
| KnowledgePointDimensionTab | `web/src/components/analytics/KnowledgePointDimensionTab.tsx` |
| SummaryTab | `web/src/components/analytics/SummaryTab.tsx` |
| 规则总结模板 | `web/src/components/analytics/summaryTemplates.ts` |

复用现有图表组件：`PieChart`、`LineChart`、`ProgressionChart`（位于 `web/src/components/features/analytics/`）。

## Backend API Surface

现有学生端 API 增加 `textbookId` 查询参数：

- `GET /analytics/student/overview?textbookId=xxx`
- `GET /analytics/student/mastery-distribution?textbookId=xxx`
- `GET /analytics/student/learning-trend?textbookId=xxx&days=N`
- `GET /analytics/student/weak-points?textbookId=xxx&limit=N`
- `GET /analytics/student/learned-knowledge-points?textbookId=xxx`

新增 API：

- `GET /analytics/student/textbook-summary?textbookId=xxx`

响应 schema：

```typescript
{
  textbookId: string
  textbookName: string
  totalKnowledgePoints: number
  learnedKnowledgePoints: number
  unlearnedKnowledgePoints: number
  masteryDistribution: { level: 'A'|'B'|'C'|'D'|'E'; count: number; percentage: number }[]
  importanceDistribution: { level: 'A'|'B'|'C'; count: number }[]
}
```

## Algorithms

### 进步 / 退步判定

对每个已学知识点，取最近两次学习记录的 `masteryLevel`，映射为数值 A=5、B=4、C=3、D=2、E=1：

- 后一次 > 前一次：进步中
- 后一次 < 前一次：退步中
- 后一次 = 前一次：持平

不足两次记录的知识点归类为"持平"。

**实现方式**：扩展 `GET /analytics/student/learned-knowledge-points` 返回 `lastTwoMasteryLevels: [string, string]`，前端直接计算，避免 N 次 `knowledge-point-progress` 请求。

### 规则总结模板

输入变量及来源：

| 变量 | 来源 |
|------|------|
| `textbookName` | `textbook-summary.textbookName` |
| `totalKnowledgePoints` | `textbook-summary.totalKnowledgePoints` |
| `learnedCount` | `textbook-summary.learnedKnowledgePoints` |
| `weakPointCount` | `weak-points.weakPoints.length` |
| `totalDurationMinutes` | `overview.totalDurationMinutes` |
| `mostRecentLearningDate` | `learning-trend.trend` 中最后一个 `count > 0` 的 `date` |
| `topWeakPointName` | `weak-points.weakPoints[0]?.name` |

模板使用简单的字符串插值 + 条件分支，缺失数据时显示降级文本。

## State Management

- 当前激活 Tab 使用本地 `useState` 管理，不写入 URL query。
- 时间范围（7/30/90）使用本地 `useState`，切换时重新请求 `learning-trend`。
- 知识点维度中的选中知识点使用本地 `useState`，默认选中薄弱点列表第一个（若存在），否则选中已学列表第一个。

## Risks / Trade-offs

- **[Risk] 页面首次加载时需要请求多个 API** → 各 Tab 数据在页面加载时并行请求，切换 Tab 不重复请求；如果数据量大，后续可考虑按需加载非激活 Tab 数据。
- **[Risk] 教材维度中的"未学习知识点数"需要关联 `knowledge_point` 表** → 通过 `textbookId` 过滤 `knowledgePoint` 总数，再减去已学数量；如果实现复杂，使用新增 `textbook-summary` API 收口。
- **[Trade-off] 不引入 ResizableLayout 导致布局与学习页面不完全一致** → 这是方案 1 与方案 2 的已知取舍，用户已确认接受方案 1 的最小改动路线。
