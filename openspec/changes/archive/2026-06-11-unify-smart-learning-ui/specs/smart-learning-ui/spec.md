## ADDED Requirements

### Requirement: 页面三栏布局
智能学习页 SHALL 采用与普通学习页一致的三栏布局：左侧推荐导航、中间知识点内容、底部反馈面板。

#### Scenario: 页面初始加载
- **WHEN** 学生进入 `/smart-learning`
- **THEN** 页面 SHALL 显示三栏布局
- **AND** 左侧 SHALL 显示推荐导航（默认薄弱点模式）
- **AND** 中间 SHALL 显示第一个推荐知识点的内容
- **AND** 底部 SHALL 显示反馈面板

#### Scenario: 页面自适应
- **WHEN** 学生调整浏览器窗口大小
- **THEN** 三栏布局 SHALL 保持比例，各区域独立滚动

### Requirement: 知识点内容渲染
中间内容区 SHALL 渲染当前选中知识点的 Markdown 内容，支持公式和图表。

#### Scenario: 加载知识点内容
- **WHEN** 学生点击左侧列表中的某个知识点
- **THEN** 中间区域 SHALL 加载并渲染该知识点的 Markdown 内容
- **AND** SHALL 支持 KaTeX 数学公式渲染
- **AND** SHALL 支持 Mermaid 图表渲染

#### Scenario: 内容导出
- **WHEN** 学生在内容区点击导出按钮
- **THEN** 系统 SHALL 支持导出当前知识点的 Markdown 或 PDF

### Requirement: 反馈面板复用
底部反馈面板 SHALL 复用现有 `FeedbackPanel` 组件，支持完整的反馈功能。

#### Scenario: 提交学习反馈
- **WHEN** 学生在反馈面板中选择掌握度、填写笔记、计时结束后点击提交
- **THEN** 系统 SHALL 创建学习记录
- **AND** SHALL 显示提交成功提示
- **AND** SHALL 不自动刷新左侧推荐列表

#### Scenario: 查看学习历史
- **WHEN** 学生点击反馈面板中的"学习历史"按钮
- **THEN** 系统 SHALL 弹出模态框，显示该知识点的历史学习记录

### Requirement: AI 学习助手
页面 SHALL 保留 AI 学习助手悬浮按钮，提供学习辅助功能。

#### Scenario: 打开 AI 助手
- **WHEN** 学生点击右下角的 AI 悬浮按钮
- **THEN** 系统 SHALL 展开 AI 学习助手面板
- **AND** SHALL 提供生成练习题、常见错误分析、视频推荐等功能
