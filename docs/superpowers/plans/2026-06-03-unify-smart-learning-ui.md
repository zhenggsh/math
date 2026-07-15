# 智能学习 UI 统一化设计文档

## 背景

当前智能学习（`/smart-learning`）和普通学习（`/learning`）是两个完全独立的页面，交互风格和布局差异较大：
- 普通学习：左（知识树导航）- 中（知识点内容）- 下（反馈面板）三栏布局
- 智能学习：模式选择卡片 + 列表/卡片网格，无内容预览和反馈面板，点击知识点后跳转至普通学习页

用户反馈：智能学习作为独立功能有价值，但其学习体验应该和普通学习保持一致——学生不应因为"被推荐"而获得次级的学习界面。

## 目标

让智能学习页拥有与普通学习页**一致的视觉布局和学习体验**，同时保持智能学习作为**独立功能入口**的定位。

**非目标：**
- 不修改普通学习页的任何逻辑或界面
- 不将智能学习合并到普通学习页作为一个"模式"
- 不在 URL 中暴露知识点状态（无需分享链接）

## 设计决策

### 1. 页面布局

SmartLearningPage 采用与 LearningPage 相同的三栏结构：

```
+------------------------------------------+
|  顶部: 页面标题 + 统计信息                    |
+-------------+----------------------------+
|             |                            |
|  左侧导航    |      中间内容区              |
|  (推荐列表)  |    (知识点 Markdown)        |
|             |                            |
|  [模式tabs]  |                            |
|  - 薄弱点    |                            |
|  - 重要性    |                            |
|  - 随机     |                            |
|             |                            |
+-------------+----------------------------+
|           底部反馈面板                     |
|  (掌握度评分 + 笔记 + 计时器 + 历史)        |
+------------------------------------------+
```

### 2. 左侧导航：模式 Tabs + 推荐列表

左侧顶部放置三个模式的轻量 tabs：
- **薄弱点**（默认）：按优先级排序的薄弱知识点列表
- **重要性**：按重要性级别（A/B/C）筛选的知识点
- **随机**：随机抽取的知识点

列表项展示：
- 知识点编码 + 名称
- 当前掌握度（颜色标签）
- 推荐原因（如"掌握度较低，需要加强"）
- 上次学习时间

选中项高亮，点击后中间区域加载对应知识点的 Markdown 内容。

### 3. 中间内容区

直接复用 LearningPage 的内容渲染逻辑：
- 加载并渲染知识点的 Markdown 内容
- 支持 KaTeX 公式、Mermaid 图表
- 保留导出功能（Markdown / PDF）

**技术方案：** 将 LearningPage 中的内容渲染部分抽离为 `KnowledgePointContent` 组件，供两页共用。

### 4. 底部反馈面板

直接复用现有 `FeedbackPanel` 组件：
- `MasteryRating`（A-E 评分）
- `LearningTimer`（学习计时器）
- 笔记文本框
- `RecordHistory`（学习历史弹窗）

提交反馈后：
- 显示成功提示
- **不自动刷新左侧薄弱点列表**（避免打断用户浏览节奏）
- 用户可手动点击"刷新"按钮更新列表
- 重新打开页面时列表自然刷新

### 5. AI 学习助手

保留 `AIFab` 悬浮按钮，提供：
- 生成练习题
- 常见错误分析
- 视频推荐

### 6. 状态管理

所有状态保存在组件内部，URL 保持扁平 `/smart-learning`：
- 当前选中的模式（`weak-points` | `importance` | `random`）
- 当前选中的知识点 ID
- 各模式的列表数据（React Query 缓存）

**不持久化：** 刷新页面后回到默认状态（薄弱点模式，未选中知识点）。

## 技术架构

### 组件复用清单

| 组件 | 来源 | 复用方式 |
|------|------|----------|
| `FeedbackPanel` | `components/learning/` | 直接导入 |
| `MasteryRating` | `components/learning/` | 直接导入 |
| `LearningTimer` | `components/learning/` | 直接导入 |
| `RecordHistory` | `components/learning/` | 直接导入 |
| `AIFab` | `components/learning/` | 直接导入 |
| Markdown 内容渲染 | `pages/LearningPage/` | 抽取为 `KnowledgePointContent` |
| `ResizableLayout` | `components/Layout/` | 直接导入 |

### 新增/修改组件

- `SmartLearningPage.tsx`（重写布局）
- `SmartLearningNav.tsx`（左侧导航：tabs + 列表）
- `KnowledgePointContent.tsx`（从 LearningPage 抽取）

### 数据流

```
SmartLearningPage
├── SmartLearningNav
│   ├── useWeakPoints / useByImportance / useRandomPoints
│   └── 模式 tabs 切换
├── KnowledgePointContent
│   └── knowledgeApi.getKnowledgePointContent(id)
└── FeedbackPanel
    └── learningRecordApi.createLearningRecord(...)
        └── onSuccess: 显示 toast，不刷新列表
```

## 交互细节

### 首次进入
1. 默认选中"薄弱点"模式
2. 加载薄弱点列表
3. 自动选中列表第一个知识点（如果有），中间区域显示其内容
4. 如果没有薄弱点，显示空状态提示（"恭喜！暂无薄弱知识点"），提供切换到"随机模式"的快捷入口

### 模式切换
1. 点击 tab 切换模式
2. 加载对应列表
3. 自动选中列表第一个知识点
4. 中间内容区切换

### 提交反馈后
1. FeedbackPanel 显示提交成功
2. 计时器重置
3. 学习历史更新（本地乐观更新）
4. 左侧列表**不变**
5. 用户可点击列表右上角的"刷新"按钮手动刷新

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| LearningPage 和 SmartLearningPage 的内容渲染逻辑 diverge | 抽取共用组件 `KnowledgePointContent`，两边强制复用 |
| FeedbackPanel 依赖 LearningPage 的某些上下文 | 检查并解耦：timer state、selected node state 应通过 props 传入 |
| 左侧列表和中间内容高度不固定导致滚动问题 | 复用 `ResizableLayout` 的 pane 配置，确保独立滚动 |

## 后续演进

- 算法升级时，只需修改 `useSmartLearning` hooks 的数据获取逻辑，UI 层不受影响
- 未来可考虑在左侧列表中加入"今日推荐"分组、"临近考试重点"等新的推荐维度
