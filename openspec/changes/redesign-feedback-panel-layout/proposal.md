## Why

当前学习反馈面板采用垂直堆叠布局（计时器卡片 → 反馈表单 → 分隔线 → 学习历史记录），占用大量垂直空间。随着知识树节点增多、内容变长，底部面板的视觉占比过大，挤压了主要内容区域的显示空间。用户反馈需要更紧凑的反馈面板设计，在保留完整功能的同时减少空间占用。

## What Changes

- **压缩面板高度**：将底部面板默认比例从固定像素改为 20%（与知识区 2:8 比例）
- **重构 FeedbackPanel 布局**：由垂直堆叠改为上下两栏紧凑布局
- **上栏 — 学习反馈**：标题「学习反馈」与掌握程度 A~E 五个按钮放在同一行；下方为紧凑的学习备注文本框（2 行）
- **下栏 — 功能区**：左侧「学习历史」按钮（点击弹出 Modal），中间「提交」按钮，右侧学习时长计时器
- **移除常驻学习历史栏**：将 RecordHistory 从 FeedbackPanel 常驻显示改为 Modal 对话框弹出
- **简化 LearningTimer**：移除渐变卡片外壳，改为内联纯文本显示

## Capabilities

### Modified Capabilities
- `learning-record`: FeedbackPanel 交互方式调整，布局更紧凑；学习历史改为 Modal 弹出

## Impact

- **Frontend**: 修改 `FeedbackPanel`（布局重构、Modal 集成）、`LearningTimer`（简化显示）、`ResizableLayout`（底部面板比例调整）；更新 `FeedbackPanel.test.tsx` 测试
- **No backend changes**
