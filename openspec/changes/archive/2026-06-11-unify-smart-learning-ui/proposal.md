## Why

当前智能学习（`/smart-learning`）与普通学习（`/learning`）是两个完全独立的页面，交互风格和布局差异较大。智能学习页仅有推荐列表，缺乏知识点内容预览和反馈面板，学生点击推荐后需跳转到普通学习页才能进行完整的学习闭环。这导致智能学习停留在"浏览/发现"层面，无法形成连贯的学习体验。本次变更旨在让智能学习页拥有与普通学习页一致的视觉布局和学习体验，使其成为一个完整的学习入口，而非单纯的推荐列表。

## What Changes

- 重写 `SmartLearningPage` 布局，采用与普通学习页一致的三栏结构：左侧推荐导航 + 中间知识点内容 + 底部反馈面板
- 新增 `SmartLearningNav` 组件：顶部 tabs（薄弱点/重要性/随机）+ 可分组/可筛选的推荐列表
- `SmartLearningPage` 直接集成 `MarkdownPreview`、`KnowledgeOverview` 和导出按钮实现内容渲染（不修改 `LearningPage`）
- 直接复用现有 `FeedbackPanel`、`MasteryRating`、`LearningTimer`、`RecordHistory`、`AIFab` 组件
- 提交反馈后增加"继续学习下一个推荐"CTA，形成学习闭环
- 薄弱点列表按教材章节（level1/level2）分组折叠，提升可扫描性
- 页面顶部增加"今日目标"学习进度追踪组件
- 列表项显示掌握度变化趋势标识（↗ 上升 / → 持平 / ↘ 下降）
- **教材范围过滤**：智能学习推荐列表仅展示全局教材选择器选中的教材范围内的知识点
- **StudyGoalTracker 位置调整**：从右侧内容区移至左侧 `SmartLearningNav` 的薄弱点 tab 内
- **右侧内容区严格对齐 `LearningPage`**：面包屑路径、内容工具栏（Preview/Raw 切换、上下导航、导出下拉）、区域大小、样式背景
- **非变更项**：普通学习页（`/learning`）保持完全独立，不做任何修改；URL 保持扁平 `/smart-learning`

## Capabilities

### New Capabilities
- `smart-learning-ui`: 智能学习页面 UI 架构，包括推荐导航、内容渲染、反馈面板的三栏布局
- `smart-learning-recommendation-list`: 智能学习推荐列表的展示、分组、筛选与交互
- `smart-learning-session`: 智能学习会话管理，包括学习进度追踪、连续推荐、目标设定

### Modified Capabilities
- `smart-learning-recommendation`: 现有推荐算法 capability，本次在 UI 层增强推荐列表的展示信息（增加掌握度趋势、推荐原因等），不改变后端算法逻辑

## Impact

- **前端组件**：`web/src/pages/smart-learning/SmartLearningPage.tsx`（重写）、`web/src/components/smart-learning/SmartLearningNav.tsx`（新增）、`web/src/components/smart-learning/StudyGoalTracker.tsx`（新增）
- **前端 Hooks**：`web/src/hooks/useRecommendations.ts`（新增 `textbookId` 字段 + `useTextbook` 过滤）
- **前端依赖**：`allotment`（ResizableLayout）、`@tanstack/react-query`（数据缓存）
- **后端**：在现有 API 响应 DTO 中添加 `improvementVelocity` 字段（向后兼容），复用现有智能学习 API 端点
- **路由**：无变更，保持 `/smart-learning`
