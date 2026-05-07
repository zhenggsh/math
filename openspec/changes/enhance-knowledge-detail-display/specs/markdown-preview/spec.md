## MODIFIED Requirements

### Requirement: Markdown 渲染

系统 SHALL 提供高质量的 Markdown 渲染能力，支持标准 Markdown 语法和扩展功能。

#### Scenario: 基础 Markdown 渲染
- **GIVEN** 知识点包含 Markdown 格式的内容
- **WHEN** 系统在内容区展示该知识点
- **THEN** 系统 SHALL 正确渲染以下元素：
  - 标题（H1-H6）
  - 段落和换行
  - 加粗、斜体、删除线
  - 有序/无序列表
  - 链接和图片
  - 代码块（语法高亮）
  - 引用块
  - 表格
  - 水平分割线
- **AND** 所有文本内容 SHALL 左对齐（`text-align: left`）
- **AND** 列表项缩进 SHALL 正常显示

#### Scenario: 原始视图左对齐
- **GIVEN** 用户切换到原始 Markdown 视图
- **THEN** 原始文本 SHALL 左对齐显示
- **AND**  SHALL 使用等宽字体
- **AND** SHALL 保留原始格式和换行

### Requirement: 上下文知识点展示

系统 SHALL 在内容区展示当前知识点的上下文信息。

#### Scenario: 显示知识点路径
- **GIVEN** 用户选中了某个知识点
- **WHEN** 内容区展示该知识点
- **THEN** 内容区顶部 SHALL 显示面包屑路径：一级功能 > 二级功能 > 三级功能
- **AND** 面包屑最后一项 SHALL 显示为 `一级知识点.二级知识点.三级知识点` 的拼接格式
- **AND** 若某层级为空，SHALL 自动省略（如三级为空则显示 `一级.二级`）

#### Scenario: 显示知识点元信息
- **GIVEN** 内容区展示知识点
- **THEN** 系统 SHALL 在适当位置显示：
  - 知识点编号（如 1.1.1）
  - 重要性级别（A/B/C 标签）
  - 学习状态（如已学习次数、平均掌握程度）

#### Scenario: 概述区展示
- **GIVEN** 内容区展示知识点
- **THEN** 系统 SHALL 在面包屑下方、内容上方显示概述卡片
- **AND** 概述卡片 SHALL 包含：
  - 定义（definition，如有）
  - 特性/运算方式（characteristics，如有）
  - 重要性级别标签（A/B/C，带颜色区分）
- **AND** 若某项信息不存在，SHALL 隐藏对应行

## ADDED Requirements

### Requirement: 内容区工具栏扩展

系统 SHALL 在内容区工具栏提供视图切换、导航和导出功能。

#### Scenario: 工具栏按钮布局
- **GIVEN** 内容区工具栏
- **THEN** 从左到右 SHALL 依次显示：
  - "预览" / "原始" 切换按钮组
  - 分隔线
  - "上一个"按钮
  - "下一个"按钮
  - 分隔线
  - "导出"下拉按钮

#### Scenario: MarkdownPreview 纯受控模式
- **GIVEN** `MarkdownPreview` 组件
- **THEN** 该组件 SHALL 为纯受控组件，不维护内部视图状态
- **AND** 视图切换 SHALL 仅由父组件（`LearningPage` toolbar）提供
- **AND** `MarkdownPreview` 内部 SHALL 不再包含独立的 `Segmented` 切换控件

#### Scenario: Mermaid 图表渲染与错误自动修复
- **GIVEN** Markdown 内容包含 Mermaid 代码块
- **WHEN** 系统渲染该代码块
- **THEN** 系统 SHALL 正常渲染图表
- **AND** 若渲染失败，SHALL 自动将以下半角字符替换为全角字符后重试：
  - `(` → `（`，`)` → `）`
  - `[` → `［`，`]` → `］`
  - `"` → `"`，`'` → `'`
  - `:` → `：`，`;` → `；`
- **AND** 若自动转义后仍失败，SHALL 显示中文友好提示："图表渲染失败" + 错误原因 + 原始代码
- **AND** 提示信息 SHALL 为 `warning` 级别（非 `error`）

## UI Specifications

### 渲染视图

| 元素 | 规格 |
|-----|------|
| 文本对齐 | 左对齐（`text-align: left`） |
| 正文字号 | 14px |
| 行高 | 1.6 |
| 标题字号 | H1: 24px, H2: 20px, H3: 18px, H4+: 16px |
| 代码块背景 | `#f6f8fa` |
| 代码块边框 | 1px `#d0d7de` |
| 代码块圆角 | 6px |

### 原始视图

| 元素 | 规格 |
|-----|------|
| 文本对齐 | 左对齐 |
| 字体 | `SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace` |
| 字号 | 13px |
| 行高 | 1.5 |
| 背景 | `#f6f8fa` |
| 内边距 | 16px |
| 自动换行 | true |

### 概述卡片

| 元素 | 规格 |
|-----|------|
| 背景 | `#fafafa` |
| 边框 | 1px `#f0f0f0` |
| 圆角 | 8px |
| 内边距 | 16px |
| 标签字号 | 12px，颜色 `#8c8c8c` |
| 内容字号 | 14px |
| 重要性 A | 红色标签 `#FF4D4F` |
| 重要性 B | 橙色标签 `#FAAD14` |
| 重要性 C | 蓝色标签 `#1890FF` |
