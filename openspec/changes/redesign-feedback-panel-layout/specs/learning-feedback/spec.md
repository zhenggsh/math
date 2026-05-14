## ADDED Requirements

### Requirement: 学习反馈面板布局

系统 SHALL 提供紧凑的学习反馈面板，支持在学习页面底部快速记录学习情况。

#### Scenario: 默认紧凑布局
- **GIVEN** 用户进入学习页面并选中知识点
- **THEN** 底部反馈面板 SHALL 占中心区域高度的 20%
- **AND** 面板 SHALL 分为上下两栏

#### Scenario: 上栏 — 学习反馈
- **GIVEN** 用户在反馈面板
- **THEN** 上栏 SHALL 显示：
  - 「学习反馈」标题与掌握程度 A/B/C/D/E 按钮在同一行
  - 下方为学习备注文本框（紧凑高度，2 行）

#### Scenario: 下栏 — 功能区
- **GIVEN** 用户在反馈面板
- **THEN** 下栏 SHALL 显示：
  - 左侧「学习历史」按钮（点击弹出 Modal 查看历史记录）
  - 中间「提交」按钮（保存学习记录）
  - 右侧「学习时长」计时器（内联纯文本显示）

#### Scenario: 提交学习记录
- **GIVEN** 用户选择了掌握程度
- **WHEN** 用户点击「提交」按钮
- **THEN** 系统 SHALL 保存学习记录
- **AND** 学习时长 SHALL 取自计时器当前值
- **AND** 成功后 SHALL 重置表单

#### Scenario: 查看学习历史
- **GIVEN** 用户在学习页面
- **WHEN** 用户点击「学习历史」按钮
- **THEN** 系统 SHALL 弹出 Modal 对话框
- **AND** Modal 内 SHALL 显示该知识点的所有学习记录
- **AND** 空状态时 SHALL 显示「暂无学习记录」

## Types

```typescript
// FeedbackPanel Props 保持不变
interface FeedbackPanelProps {
  knowledgePointId: string;
  onSubmitSuccess?: () => void;
}
```
