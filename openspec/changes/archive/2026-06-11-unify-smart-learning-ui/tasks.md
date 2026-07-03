## 1. 后端 API 增强

- [x] 1.1 在 `WeakPointResponseDto` 中添加 `improvementVelocity: number` 字段
- [x] 1.2 在 `ByImportanceResponseDto` 中添加 `improvementVelocity: number` 字段
- [x] 1.3 在 `RandomResponseDto` 中添加 `improvementVelocity: number` 字段（如需要）
- [x] 1.4 修改 `smart-learning.service.ts`，将评分结果中的 `improvementVelocity` 传递到响应对象
- [x] 1.5 更新前端 `smartLearningApi.ts` 类型定义，添加 `improvementVelocity` 字段

## 2. 数据获取层统一

- [x] 2.1 创建 `useRecommendations(mode)` hook，统一三种模式的数据获取
- [x] 2.2 删除 `WeakPointView`、`ImportanceView`、`RandomView` 三个旧组件
- [x] 2.3 删除 `LearningModeSelector` 组件（功能由 `SmartLearningNav` tabs 取代）
- [x] 2.4 验证 `useRecommendations` 的缓存策略（staleTime、refetch 行为）
- [x] 2.5 **教材范围过滤**：在 `UnifiedRecommendationItem` 中添加 `textbookId` 字段
- [x] 2.6 **教材范围过滤**：`useRecommendations` 引入 `useTextbook`，按 `selectedTextbookIds` 过滤 API 返回结果
- [x] 2.7 **教材范围过滤**：`selectedTextbookIds` 为空时，列表显示空状态"请先选择教材"

## 3. 智能学习导航组件

- [x] 3.1 创建 `SmartLearningNav` 组件：顶部 tabs（薄弱点/重要性/随机）
- [x] 3.2 实现薄弱点列表按 level1/level2 分组折叠（Ant Design Collapse）
- [x] 3.3 实现列表项展示：编码、名称、掌握度标签、推荐理由、趋势标识、上次学习时间
- [x] 3.4 实现列表刷新按钮和加载状态（骨架屏）
- [x] 3.5 实现空状态："暂无薄弱知识点" + 切换到随机模式的快捷入口
- [x] 3.6 为 `SmartLearningNav` 编写单元测试
- [x] 3.7 **学习进度追踪移至左侧**：`SmartLearningNav` 接收 `studiedCount`/`goalCount`/`onGoalChange` props，仅在 `mode === 'weak'` 时于列表上方渲染 `StudyGoalTracker`
- [x] 3.8 更新 `SmartLearningNav` 单元测试：验证 `StudyGoalTracker` 仅在薄弱点 tab 出现

## 4. 智能学习页面重构

- [x] 4.1 重写 `SmartLearningPage`：引入 `ResizableLayout` 三栏结构
- [x] 4.2 集成 `SmartLearningNav` + 内容渲染区（MarkdownPreview + KnowledgeOverview）+ `FeedbackPanel`
- [x] 4.3 实现默认选中薄弱点模式的第一个知识点
- [x] 4.4 实现模式切换时自动选中新列表的第一个知识点
- [x] 4.5 保持普通学习页完全独立，不修改 `/learning` 路由或组件
- [x] 4.6 在 `SmartLearningPage` 中集成导出功能（Markdown/PDF，无需 textbook 上下文）
- [x] 4.7 保留 `AIFab` 悬浮按钮，确保在智能学习页可用
- [x] 4.8 **右侧对齐 LearningPage**：添加面包屑（`Breadcrumb`）显示知识点层级路径
- [x] 4.9 **右侧对齐 LearningPage**：内容工具栏包含 Preview/Raw 切换（`Segmented`）、上/下导航按钮、导出下拉菜单（Markdown/PDF）
- [x] 4.10 **右侧对齐 LearningPage**：`ResizableLayout` 的 `defaultSizes`/`minSizes` 与 `MultiPaneLayout` 一致
- [x] 4.11 **右侧对齐 LearningPage**：内容区样式与 `LearningPage` 的 `.markdownPanel` 一致（背景色、边框、padding）
- [x] 4.12 **移除 StudyGoalTracker 从 centerHeader**：将 `studiedCount`/`goalCount`/`onGoalChange` 通过 props 传给 `SmartLearningNav`

## 5. 学习会话增强（CEO 评审采纳项）

- [x] 5.1 创建 `StudyGoalTracker` 组件：显示"今日已复习 X/Y 个薄弱点"
- [x] 5.2 实现目标设定弹窗（1-20 个知识点）
- [x] 5.3 实现目标达成时的完成状态和鼓励文案
- [x] 5.4 在 `FeedbackPanel` 提交成功后显示"继续学习下一个推荐"CTA 按钮
- [x] 5.5 实现点击 CTA 自动加载下一个知识点并重置反馈面板
- [x] 5.6 处理最后一个推荐完成后的特殊状态（提示刷新）
- [x] 5.7 **位置调整**：验证 `StudyGoalTracker` 在 `SmartLearningNav` 的薄弱点 tab 下正确渲染
- [x] 5.8 **空教材状态**：当 `selectedTextbookIds` 为空时，`StudyGoalTracker` 应隐藏或显示提示

## 6. 状态与数据流

- [x] 6.1 在 `SmartLearningPage` 内管理模式、选中知识点、列表数据状态
- [x] 6.2 实现提交反馈后不自动刷新列表的逻辑
- [x] 6.3 处理跨模式切换时的选中状态保持（如果在列表中则保持，否则选第一个）
- [x] 6.4 确保 React Query 缓存策略正确（列表数据缓存、内容数据缓存）

## 7. 测试与质量

- [x] 7.1 编写 `SmartLearningPage` 集成测试（模式切换、知识点选择、反馈提交）
- [x] 7.2 编写 `SmartLearningNav` 测试（分组、趋势标识、空状态）
- [x] 7.3 编写 `StudyGoalTracker` 测试（进度计算、目标设定、完成状态）
- [x] 7.4 运行 `pnpm --filter web typecheck`，确保零类型错误
- [x] 7.5 运行 `pnpm --filter web lint`，确保零 lint 错误（本 change 修改的文件无 lint 错误；历史遗留 lint 错误在其他文件）
- [x] 7.6 运行 `pnpm --filter web test --run -- src/pages/smart-learning` 和 `src/components/smart-learning`，确保测试通过
- [ ] 7.7 运行 `pnpm --filter web test --run -- src/pages/LearningPage` 和 `src/components/learning`，确保无回归（注：存在历史遗留测试失败，非本 change 引入）
- [x] 7.8 **新增**：编写教材过滤测试——验证 `useRecommendations` 在 `selectedTextbookIds` 变化时正确过滤
- [x] 7.9 **新增**：更新 `SmartLearningPage` 集成测试——验证面包屑、工具栏、导出下拉渲染
- [x] 7.10 **新增**：更新 `SmartLearningNav` 测试——验证教材为空时的空状态提示

## 8. 验证与文档

- [ ] 8.1 手动验证：进入智能学习页 → 薄弱点列表 → 点击知识点 → 内容渲染 → 提交反馈 → 下一个推荐 CTA → 继续学习
- [ ] 8.2 手动验证：切换重要性/随机模式 → 列表更新 → 内容切换
- [ ] 8.3 手动验证：设定今日目标 → 完成多个知识点 → 目标达成提示
- [ ] 8.4 手动验证：普通学习页功能无回归
- [ ] 8.5 **新增**：手动验证——全局教材选择器切换教材后，智能学习列表自动过滤为选中教材范围
- [ ] 8.6 **新增**：手动验证——右侧内容区布局（面包屑、工具栏、区域大小）与学习页严格一致
- [ ] 8.7 **新增**：手动验证——`StudyGoalTracker` 仅出现在左侧薄弱点 tab 内，不在右侧内容区出现
