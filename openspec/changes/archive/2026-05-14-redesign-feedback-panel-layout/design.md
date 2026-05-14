## Context

现有的 `FeedbackPanel` 采用垂直堆叠布局：
1. `LearningTimer` 渐变卡片（占高）
2. 学习反馈表单 Card（掌握程度 + 备注 + 提交按钮）
3. 分隔线 Divider
4. `RecordHistory` 常驻列表（最大高度 400px，占高最大）

该布局在 `ResizableLayout` 的底部面板（默认 200px）内显得拥挤，且 `RecordHistory` 常驻显示挤压了其他内容。

项目使用 React 19 + TypeScript strict + Ant Design 6 + `allotment` 分栏库 + CSS Modules。

## Goals / Non-Goals

**Goals:**
- 将底部面板空间从固定像素改为百分比（2:8 比例）
- 将 FeedbackPanel 重构为紧凑的上下两栏布局
- 将 RecordHistory 从常驻显示改为 Modal 弹出
- 简化 LearningTimer 为内联纯文本显示

**Non-Goals:**
- 不修改学习记录的数据模型或 API
- 不修改 MasteryRating、RecordHistory 的内部实现
- 不添加新的学习反馈功能（如附件、评分细化等）
- 不改动机考页面的整体路由或页面结构

## Decisions

### Decision: 上下两栏而非上中下三栏
**Rationale:** 用户明确反馈「分层上中下」是笔误，实际只需要上下两栏即可满足紧凑需求。减少层级更简洁。

### Decision: 提交按钮放在下栏功能区
**Rationale:** 用户主动要求将提交按钮移至下栏，使上栏更聚焦于「输入」本身（掌握程度 + 备注）。提交操作作为「执行」归类到下栏功能区更合理。

### Decision: Modal 而非 Drawer 弹出历史记录
**Rationale:** 用户明确要求使用 Modal。Modal 居中弹出，视觉上更聚焦历史记录内容，适合阅读列表型数据。

### Decision: 使用 `void` 操作符处理异步回调
**Rationale:** ESLint `@typescript-eslint/no-floating-promises` 和 `@typescript-eslint/no-misused-promises` 规则要求显式处理 Promise。使用 `void` 操作符是最轻量的方式，不改业务逻辑。

## Risks / Trade-offs

- **[Risk]** 底部面板高度缩小到 20% 后，在较小屏幕上可能显示不全
  → **Mitigation:** `allotment` 支持拖拽调整，用户可手动拉大；同时 `minSize` 保持 150px 保障最低可用高度

- **[Risk]** 学习历史改为 Modal 后，用户需要多点一次才能查看历史
  → **Mitigation:** Modal 内保持原有 RecordHistory 完整功能（列表、展开备注、空状态），不损失信息密度

- **[Risk]** 掌握程度按钮缩小为 `size="small"` 后可能不易点击
  → **Mitigation:** 保留 Tooltip 提示；按钮间距通过 `Space` 组件保持

## Migration Plan

无需迁移。布局比例和面板结构变化对用户无数据影响。localStorage 中保存的水平分栏尺寸不受影响；垂直分栏尺寸因改为百分比，首次加载时自动适应。

## Open Questions

无。
