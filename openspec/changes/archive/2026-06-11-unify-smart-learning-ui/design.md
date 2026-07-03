## Context

当前智能学习页面（`/smart-learning`）是一个独立的发现型页面，由三个模式卡片（薄弱点/重要性/随机）和对应的列表/网格组成。学生浏览推荐后，点击知识点会跳转到普通学习页（`/learning`）进行学习。这造成两个核心问题：

1. **体验断裂**：学生在智能学习页只有"看"没有"学"，真正学习时需要换页、换上下文
2. **UI 不一致**：智能学习页没有知识树、没有内容预览、没有反馈面板，与普通学习页的视觉和交互差异大

后端智能推荐算法（`smart-learning` 模块）已经成熟，包含薄弱点检测、重要性筛选、随机模式三种推荐策略，以及基于掌握度、衰减、重要性、改进速度的评分模型。前端已有 `useSmartLearning` hooks 获取推荐数据。本次变更聚焦前端 UI 层的统一化。

## Goals / Non-Goals

**Goals:**
- 智能学习页拥有与普通学习页一致的三栏布局和学习体验
- 学生可以在智能学习页内完成"发现→学习→反馈→继续"的完整闭环
- 保持普通学习页的完全独立，不做任何修改
- 所有组件可复用，降低后续维护成本

**Non-Goals:**
- 不修改普通学习页的任何逻辑、路由或界面
- 不修改后端推荐算法或 API 接口
- 不引入 URL 路由参数（保持扁平 `/smart-learning`）
- 不实现 AI 生成练习题、间隔重复提醒等高级功能（推迟到后续迭代）

## Decisions

### 1. 内容渲染策略：SmartLearningPage 独立集成，不修改 LearningPage

**决策**：`SmartLearningPage` 自行集成 `MarkdownPreview` + `KnowledgeOverview` + 导出按钮实现内容渲染，不从 `LearningPage` 抽取共用组件。

**理由**：
- 约束：不修改已有功能（LearningPage 保持零变更）
- `MarkdownPreview` 和 `KnowledgeOverview` 已是通用展示组件，可直接使用
- `LearningPage` 的内容区包含编辑功能（raw/preview 切换、保存、权限检查），与智能学习的只读场景差异大，抽取共用组件反而引入不必要的复杂度
- 消除对 `LearningPage` 的依赖，降低回归风险

**替代方案**：从 `LearningPage` 抽取 `KnowledgePointContent`。拒绝原因：需要修改 `LearningPage`，违反"不修改已有功能"约束。

### 2. FeedbackPanel 直接复用

**决策**：`FeedbackPanel` 已是 props 驱动组件（仅依赖 `knowledgePointId` + `onSubmitSuccess`），无需解耦即可在 `SmartLearningPage` 中直接复用。

**理由**：
- 代码审查验证：`FeedbackPanel` 没有隐式依赖 `LearningPage` 的状态
- 零修改复用，无回归风险
- `onSubmitSuccess` 回调足够支持"下一个推荐 CTA"功能（SmartLearningPage 作为父组件自行计算下一个知识点）

### 3. 推荐列表统一：删除旧 View 组件，新建 SmartLearningNav

**决策**：删除 `WeakPointView` / `ImportanceView` / `RandomView`，功能由新组件 `SmartLearningNav` 统一吸收。

**理由**：
- 三个 view 组件有高度重复的逻辑（加载/空/错误状态、刷新按钮、列表渲染）
- `SmartLearningNav` 通过 `useRecommendations(mode)` hook 统一数据获取，消除重复
- 旧的列表渲染方式（Ant Design List）不满足新需求（分组折叠、趋势标识、上次学习时间）

### 4. 数据获取统一：`useRecommendations(mode)` hook

**决策**：创建 `useRecommendations(mode: 'weak' | 'importance' | 'random')` hook，内部根据 mode 调用对应 API，返回统一的数据结构和加载状态。

**理由**：
- 消除三个独立 hook 的重复错误/加载处理逻辑
- SmartLearningNav 只需关心渲染，不关心数据来源
- 便于实现模式切换时的缓存策略（React Query `staleTime`）

### 5. 左侧导航状态：组件内部管理，不持久化

**决策**：所有状态（当前模式、选中知识点、列表数据）保存在 `SmartLearningPage` 组件内部，使用 React Query 缓存。刷新页面后回到默认状态。

**理由**：
- 用户明确表示不需要分享链接
- 减少 URL 复杂度，降低路由维护成本
- 智能推荐的动态性意味着持久化状态很容易过期

**替代方案**：URL query params（`?mode=weak-points&kp=xxx`）。拒绝原因：用户明确选择 B（不需要分享连接）。

### 6. 提交反馈后不自动刷新列表

**决策**：学生提交学习反馈后，左侧推荐列表不自动刷新，仅显示成功提示，学生可手动刷新或重新打开页面。

**理由**：
- 自动刷新会打断学生的浏览节奏（当前正在看的内容可能突然消失）
- 手动刷新给予学生控制权
- 实现简单，避免乐观更新与推荐算法重新排序的冲突

### 7. 章节分组：前端分组，后端不变

**决策**：薄弱点列表按 `level1`/`level2` 分组在前端实现，不修改后端 API。

**理由**：
- 后端 API 已返回完整的知识点元数据（level1/level2/level3）
- 前端分组零后端成本
- 不同模式（薄弱点/重要性/随机）可能有不同的分组需求，前端灵活处理

### 8. 教材范围过滤：前端过滤，零后端变更

**决策**：`useRecommendations` 引入 `useTextbook` 获取 `selectedTextbookIds`，在 API 返回后按 `textbookId` 过滤，只保留全局教材选择范围内的知识点。

**理由**：
- 零后端变更，API 已返回 `textbookId`
- `TextbookContext` 支持多选，但后端 API 参数为单数 `textbookId`，前端过滤避免接口改造
- 推荐列表数量通常可控（<100），前端过滤性能可接受
- 保持 "不修改已有功能" 约束

**替代方案**：后端 API 增加 `textbookIds` 数组参数。拒绝原因：需要修改后端接口和 service 层，超出本次前端 UI 变更范围。

### 9. 学习进度追踪位置：从右侧移至左侧薄弱点 tab 内

**决策**：`StudyGoalTracker` 从 `SmartLearningPage` 的 `centerHeader` 移至 `SmartLearningNav` 内部，仅在"薄弱点" tab 下、列表上方显示。

**理由**：
- 进度目标仅针对薄弱点（"今日已复习 X/Y 个薄弱点"），与薄弱点 tab 语义最匹配
- 右侧内容区应聚焦知识点学习本身，与 `LearningPage` 保持一致
- 左侧导航栏作为"发现"区域，放置目标和列表更自然

**实现方式**：`SmartLearningNav` 新增可选 props（`studiedCount`、`goalCount`、`onGoalChange`），在 `mode === 'weak'` 时渲染 `StudyGoalTracker`。

### 10. 右侧内容区严格对齐 LearningPage 布局

**决策**：`SmartLearningPage` 的 `centerPanel` 采用与 `LearningPage` 的 `markdownPanel` 完全一致的视觉结构：面包屑路径 + 内容工具栏（Preview/Raw 切换、上下导航、导出下拉）+ 内容区。

**理由**：
- 满足"严格一致"需求，消除两个页面的视觉差异
- 只读场景保留 Preview/Raw 切换（仅展示，不可编辑）
- 导出功能从单一 Markdown 按钮升级为下拉菜单（Markdown + PDF），与 LearningPage 一致
- 面包屑显示知识点层级路径（level1 > level2 > level3），提升位置感知

**差异处理**（智能学习 vs 普通学习）：
- 无"保存"按钮（只读）
- Raw 视图禁用编辑（`editable={false}`）
- 上下导航基于推荐列表 `items` 顺序，而非知识树 DFS 顺序

**区域大小统一**：`ResizableLayout` 的 `defaultSizes` 和 `minSizes` 与 `MultiPaneLayout` 对齐：
- `defaultSizes`: `{ left: 300, center: 600, bottom: 200 }`
- `minSizes`: `{ left: 220, center: 400, bottom: 150 }`

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| SmartLearningPage 内容渲染与 LearningPage diverge | 两者都使用底层通用组件 `MarkdownPreview`/`KnowledgeOverview`，非直接复用页面级组件，diverge 风险低 |
| 左侧列表分组后性能下降（大量知识点） | 使用虚拟滚动或分页；薄弱点通常数量可控（<100），重要性/随机模式数量也有限 |
| 删除 WeakPointView/ImportanceView/RandomView 导致其他页面依赖断裂 | 检查全局引用，仅 SmartLearningPage 使用这三个组件，删除安全 |
| ResizableLayout 配置不当导致滚动异常 | 复用 `MultiPaneLayout` 的 pane 配置比例，确保左侧、中间、底部独立滚动 |

## Backend Changes

本次变更需要后端配合暴露 `improvementVelocity` 字段：

- 修改 `WeakPointResponseDto`：添加 `improvementVelocity: number`
- 修改 `ByImportanceResponseDto`：添加 `improvementVelocity: number`
- 修改 `RandomResponseDto`（如适用）：添加 `improvementVelocity: number`
- 修改 `smart-learning.service.ts`：从评分结果中传递该字段到 DTO
- 修改前端 `smartLearningApi.ts` 类型定义

**理由**：`recommendation-scorer.ts` 已计算 `improvementVelocity`，但当前未包含在 API 响应中。前端列表趋势标识（↗/→/↘/—）依赖此字段。

## Migration Plan

- **部署顺序**：
  1. 后端 DTO 添加 `improvementVelocity` 字段（向后兼容，旧客户端忽略新字段）
  2. 前端部署 SmartLearningPage 重构
- **回滚**：Git revert 即可，无数据风险
- **Feature Flag**：不需要，变更限于 `/smart-learning` 页面，不影响其他功能

## Open Questions

- ✅ `SmartLearningPage` 的导出功能是否需要 textbook 上下文？**已回答**：不需要，仅通过 `knowledgePointId` 获取内容并导出。
- ✅ 随机模式的列表项是否需要显示 `improvementVelocity`？**已回答**：不需要，仅在薄弱点列表显示趋势标识。
