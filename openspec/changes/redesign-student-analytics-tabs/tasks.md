## 1. 后端 API 支持教材过滤

- [x] 1.1 更新 `AnalyticsController`：为 5 个学生端 API 增加 `textbookId` 查询参数及 Swagger 文档
- [x] 1.2 更新 `AnalyticsService`：在 `getStudentOverview`、`getMasteryDistribution`、`getLearningTrend`、`getWeakPoints`、`getLearnedKnowledgePoints` 中按 `knowledgePoint.textbookId` 过滤
  - [x] 修复 `getMasteryDistribution` 语义：按每个知识点的最新记录分布，而不是统计所有历史记录
  - [x] 统一所有"最近"排序字段为 `startTime`（`getWeakPoints`、`getLearnedKnowledgePoints` 当前使用 `createdAt`）
- [x] 1.3 更新 DTO 与接口定义，确保 `textbookId` 类型正确传递
- [x] 1.4 扩展 `GET /analytics/student/learned-knowledge-points`：返回每个知识点的最近两次 `masteryLevel`（用于前端计算进步/退步）
  - [x] 使用原始 SQL + `ROW_NUMBER() OVER (PARTITION BY knowledge_point_id ORDER BY start_time DESC)` 实现，避免 N+1 和内存爆炸
- [x] 1.5 新增 `GET /analytics/student/textbook-summary` API（Controller + Service + DTO），返回教材维度总览数据
- [x] 1.6 为后端新增和修改的 API 添加/更新单元测试
- [x] 1.7 数据库索引优化
  - [x] 在 `server/prisma/schema.prisma` 的 `KnowledgePoint` 模型添加 `@@index([textbookId])`
  - [x] 生成并应用 Prisma 迁移

## 2. 前端 API 类型与服务更新

- [x] 2.1 在 `web/src/types/analytics.types.ts` 中更新现有接口，增加 `textbookId` 相关请求参数类型
- [x] 2.2 在 `web/src/types/analytics.types.ts` 中新增 `TextbookSummary` 类型，并在 `LearnedKnowledgePoint` 中增加 `lastTwoMasteryLevels`
- [x] 2.3 在 `web/src/services/analytics.service.ts` 中为 5 个现有方法增加 `textbookId` 参数
- [x] 2.4 在 `web/src/services/analytics.service.ts` 中新增 `getTextbookSummary(textbookId)` 方法

## 3. 前端维度 Tab 组件

- [x] 3.1 创建 `TextbookHeader` 组件，显示当前分析教材名称和未选择教材的空状态
- [x] 3.2 创建 `TextbookDimensionTab` 组件，展示教材概览统计、掌握度分布饼图、重要性分布
- [x] 3.3 创建 `BehaviorDimensionTab` 组件，展示学习行为统计卡片、每日时长折线图、每日次数柱状图，支持 7/30/90 天时间范围切换
  - [x] 新建 `ComboChart` 组件（或扩展 `EChartsWrapper`）同时展示折线（时长）和柱状（次数）双 Y 轴
- [x] 3.4 创建 `KnowledgePointDimensionTab` 组件，包含知识点选择器、掌握度轨迹图、薄弱点列表、进步/退步/薄弱筛选
- [x] 3.5 创建 `SummaryTab` 组件，基于规则模板生成并展示学习总结
- [x] 3.6 创建 `summaryTemplates.ts`，定义规则总结模板、变量替换和降级文本逻辑
- [x] 3.7 提取共享工具函数
  - [x] 后端 `formatKnowledgePointName(level1, level2, level3)` 用于统一 `level1 > level2 > level3` 拼接
  - [x] 前端 `getMasteryLevelOrder()` / `getImportanceLevelOrder()` 用于统一 A-E / A-C 排序
- [x] 3.8 错误处理
  - [x] 每个 Tab 内容区使用 React Error Boundary + 重试按钮
  - [x] 封装可复用的 `TabErrorFallback` 组件

## 4. 页面整合与状态管理

- [x] 4.1 重构 `StudentAnalyticsPage.tsx`，使用 Ant Design Tabs 组合 4 个维度组件
- [x] 4.2 在页面中读取 `TextbookContext.selectedTextbookIds`，取第一个作为分析对象；为空时显示空状态
- [x] 4.3 实现各 Tab 按需加载与数据缓存，切换 Tab 不重复请求
  - [x] 使用 React Query 替换 `useState/useEffect` 数据获取
  - [x] 设计 query key 包含 `textbookId` 和 `days`（如 `['analytics', 'learning-trend', textbookId, days]`）
- [x] 4.4 实现薄弱知识点"去学习"按钮跳转：`/smart-learning?focusKnowledgePointId={id}`
- [x] 4.5 更新 `StudentAnalyticsPage.module.css`，确保 Tabs 内容区宽度适配且视觉风格一致
- [x] 4.6 实现 `/smart-learning?focusKnowledgePointId={id}` 自动定位
  - [x] 在 `SmartLearningPage` 读取 URL query 参数
  - [x] 若 focus ID 不在当前 `items` 列表中，尝试切换到 `weak` 模式或显示"知识点不在当前推荐列表"提示
  - [x] 自动滚动到对应推荐项并选中

## 5. 测试与质量门禁

- [x] 5.1 为 4 个维度 Tab 组件添加单元测试
  - [x] `TextbookDimensionTab`：正常数据、空掌握度分布、教材不存在
  - [x] `BehaviorDimensionTab`：正常数据、7/30/90 切换、无数据空状态
  - [x] `KnowledgePointDimensionTab`：默认选中薄弱点、进步/退步/薄弱筛选、"去学习"点击
  - [x] `SummaryTab`：正常总结生成、无薄弱点降级文本、缺失数据降级
  - [x] 每个 Tab 组件的 Error Boundary 重试行为
- [x] 5.2 为 `StudentAnalyticsPage` 添加集成测试
  - [x] 未选择教材时显示空状态
  - [x] 已选择教材时默认展示"教材维度"
  - [x] Tab 切换不重新请求已加载数据
  - [x] 切换全局教材后重新加载数据
  - [x] 时间范围 7/30/90 切换
  - [x] 修复现有 `StudentAnalyticsPage.test.tsx` 缺少 `getLearnedKnowledgePoints` mock 的问题
- [x] 5.3 运行 `pnpm typecheck` 并修复类型错误
- [x] 5.4 运行 `pnpm lint` 并修复代码风格问题
- [x] 5.5 运行 `pnpm test` 并确保所有测试通过

> 备注：本 change 相关的单元测试与集成测试均已通过；`pnpm lint` / `pnpm test` 仍有仓库历史遗留失败（服务层 `any` 类型、未使用变量、`knowledgeApi`/`MarkdownPreview`/`FeedbackPanel` 等测试），并非本 change 引入。
