# 学生学习分析页面重构设计

## 目标

将现有 `/analytics/student` 页面从单一长页面改造为基于 Ant Design Tabs 的多维度分析页面，按全局教材选择器中第一个选中的教材分析学习数据。

## 范围

- 仅替换学生端分析页面 (`/analytics/student`)。
- 教师端分析页面 (`/analytics/teacher`) 保持不变。
- 第 4 维度"总结与建议"仅做占位展示，不接入真实 LLM。
- 不引入 `ResizableLayout`，保持单页 Tabs 布局（方案 1）。

## 4 个维度设计

### Tab 1: 教材维度

展示当前分析教材的整体情况：

- 教材名称与基本信息。
- 知识点总数、已学习数、未学习数。
- 已学知识点中各掌握度（A/B/C/D/E）的数量和占比（饼图）。
- 按重要性级别（A/B/C）的知识点分布。

### Tab 2: 学习行为维度

以日期为轴展示学习行为：

- 近 30 天每日学习时长折线图。
- 近 30 天每日学习次数柱状图。
- 日均学习时长、总学习时长、总学习次数统计卡片。

### Tab 3: 知识点维度

展示单个知识点的掌握变化：

- 知识点下拉选择器（仅显示当前教材中已学习的知识点）。
- 选中知识点的掌握度轨迹图（折线 + 柱状）。
- 薄弱知识点列表（当前教材中掌握度为 D/E 的点）。
- 知识点进步 / 退步标识（比较最近两次记录的掌握度）。

### Tab 4: 总结与建议

占位状态：

- 显示"AI 总结功能开发中"的提示。
- 预留后续接入 LLM 的位置。

## API 变更

### 现有 API 增加 `textbookId` 参数

以下学生端 API 需要支持按教材过滤：

- `GET /analytics/student/overview?textbookId=xxx`
- `GET /analytics/student/mastery-distribution?textbookId=xxx`
- `GET /analytics/student/learning-trend?textbookId=xxx&days=30`
- `GET /analytics/student/weak-points?textbookId=xxx&limit=10`
- `GET /analytics/student/learned-knowledge-points?textbookId=xxx`

后端实现时，通过 `knowledgePoint.textbookId` 关联过滤学习记录。

### 新增 API

如果现有 API 改造后仍无法满足"教材维度"的"知识点总数、已学习数、未学习数"，可新增：

- `GET /analytics/student/textbook-summary?textbookId=xxx`

返回结构：

```typescript
{
  textbookId: string
  textbookName: string
  totalKnowledgePoints: number
  learnedKnowledgePoints: number
  unlearnedKnowledgePoints: number
  masteryDistribution: { level: string; count: number; percentage: number }[]
  importanceDistribution: { level: string; count: number }[]
}
```

## 前端组件设计

### 页面结构

```
StudentAnalyticsPage
├── TextbookHeader (显示当前分析教材名称)
├── Tabs
│   ├── Tab 1: 教材维度 (TextbookDimensionTab)
│   ├── Tab 2: 学习行为维度 (BehaviorDimensionTab)
│   ├── Tab 3: 知识点维度 (KnowledgePointDimensionTab)
│   └── Tab 4: 总结与建议 (SummaryPlaceholderTab)
```

### 组件拆分

- `TextbookHeader`：展示当前分析教材名称和全局选择器提示。
- `TextbookDimensionTab`：教材概览统计 + 饼图 + 重要性分布。
- `BehaviorDimensionTab`：学习趋势图 + 统计卡片。
- `KnowledgePointDimensionTab`：知识点选择器 + 轨迹图 + 薄弱点列表。
- `SummaryPlaceholderTab`：AI 占位提示。

## 数据流

1. 页面加载时读取 `TextbookContext.selectedTextbookIds`。
2. 取第一个 `textbookId` 作为分析对象。
3. 如果未选择教材，显示 Empty 提示"请先选择教材"。
4. 各 Tab 按需并行加载数据。
5. 切换 Tab 时复用已加载数据，不重新请求。

## 错误处理

- 教材未选择：显示 `Empty` + 提示。
- API 失败：各 Tab 内显示错误提示，不影响其他 Tab。
- 数据为空：显示对应 `Empty` 提示。

## 测试策略

- 单元测试：各 Tab 组件独立渲染和空状态。
- 集成测试：页面加载时按第一个教材过滤、切换 Tab 不重复请求。
- 后端测试：各 API 加 `textbookId` 后的过滤逻辑。

## 后续扩展

第 4 维度后续接入 LLM 时：

1. 新增 `GET /analytics/student/summary?textbookId=xxx` API。
2. 后端调用 LLM 生成总结文本。
3. 将 `SummaryPlaceholderTab` 替换为真实展示组件。
