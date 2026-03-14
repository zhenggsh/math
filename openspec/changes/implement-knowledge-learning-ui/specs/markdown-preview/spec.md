## ADDED Requirements

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

#### Scenario: 代码块语法高亮
- **GIVEN** Markdown 包含代码块并指定语言
- **WHEN** 渲染代码块
- **THEN** 系统 SHALL 使用适当的语法高亮
- **AND** 支持常见语言：typescript, javascript, python, json, markdown, latex

---

### Requirement: LaTeX 数学公式渲染

系统 SHALL 支持 LaTeX 数学公式的渲染，包括行内公式和块级公式。

#### Scenario: 行内公式渲染
- **GIVEN** Markdown 内容包含行内公式 `$...$`
- **WHEN** 渲染内容
- **THEN** 系统 SHALL 使用 KaTeX 渲染公式
- **AND** 公式 SHALL 与文本基线对齐
- **AND** 示例：`$E=mc^2$` 应渲染为 $E=mc^2$

#### Scenario: 块级公式渲染
- **GIVEN** Markdown 内容包含块级公式 `$$...$$`
- **WHEN** 渲染内容
- **THEN** 系统 SHALL 使用 KaTeX 渲染公式
- **AND** 公式 SHALL 居中显示
- **AND** 公式编号（如有） SHALL 右对齐
- **AND** 示例：`$$\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n$$`

#### Scenario: 复杂数学表达式
- **GIVEN** Markdown 包含复杂数学表达式（矩阵、积分、极限等）
- **WHEN** 渲染内容
- **THEN** 系统 SHALL 正确渲染以下类型：
  - 分数：$\frac{a}{b}$
  - 根式：$\sqrt{x}$, $\sqrt[n]{x}$
  - 上下标：$x^2$, $x_i$
  - 求和/积分：$\sum$, $\int$
  - 极限：$\lim$
  - 矩阵：使用 `pmatrix`, `bmatrix` 等环境
  - 多行对齐：使用 `aligned` 环境

---

### Requirement: Mermaid 图表渲染

系统 SHALL 支持 Mermaid 图表的渲染，包括流程图、时序图、类图、思维导图等。

#### Scenario: Mermaid 代码块渲染
- **GIVEN** Markdown 包含 Mermaid 代码块（标记为 `mermaid`）
- **WHEN** 渲染内容
- **THEN** 系统 SHALL 使用 Mermaid.js 解析并渲染图表
- **AND** 图表 SHALL 在客户端动态渲染

#### Scenario: 支持的图表类型
- **GIVEN** 用户使用 Mermaid 语法
- **THEN** 系统 SHALL 支持以下图表类型：
  - `flowchart` 或 `graph` - 流程图
  - `sequenceDiagram` - 时序图
  - `classDiagram` - 类图
  - `mindmap` - 思维导图
  - `gantt` - 甘特图

#### Scenario: Mermaid 特殊字符转义
- **GIVEN** Mermaid 语法中包含特殊字符
- **WHEN** 渲染图表
- **THEN** 系统 SHALL 按项目规范进行转义：
  - 单引号 `'` → `'`（全角单引号）
  - 双引号 `"` → `"`（全角双引号）
  - 小括号 `()` → `（）`（全角括号）
  - 中括号 `[]` → `［］`（全角方括号）

---

### Requirement: 原始/渲染视图切换

系统 SHALL 提供原始 Markdown 文本和渲染视图之间的切换功能。

#### Scenario: 切换到原始视图
- **GIVEN** 用户当前在渲染视图
- **WHEN** 用户点击"原始"切换按钮
- **THEN** 系统 SHALL 显示原始 Markdown 文本
- **AND** 原始文本 SHALL 使用等宽字体
- **AND** 保留原始格式和换行

#### Scenario: 切换回渲染视图
- **GIVEN** 用户当前在原始视图
- **WHEN** 用户点击"预览"切换按钮
- **THEN** 系统 SHALL 切换回渲染视图
- **AND** 重新渲染 Markdown 内容

---

### Requirement: 上下文知识点展示

系统 SHALL 在内容区展示当前知识点的上下文信息。

#### Scenario: 显示知识点路径
- **GIVEN** 用户选中了某个知识点
- **WHEN** 内容区展示该知识点
- **THEN** 内容区顶部 SHALL 显示面包屑路径：一级 > 二级 > 三级

#### Scenario: 显示知识点元信息
- **GIVEN** 内容区展示知识点
- **THEN** 系统 SHALL 在适当位置显示：
  - 知识点编号（如 1.1.1）
  - 重要性级别（A/B/C 标签）
  - 学习状态（如已学习次数、平均掌握程度）

---

## Types

```typescript
// Markdown 预览组件 Props
interface MarkdownPreviewProps {
  content: string;           // Markdown 内容
  viewMode: 'preview' | 'raw'; // 视图模式
  onViewModeChange: (mode: 'preview' | 'raw') => void;
  className?: string;
  style?: React.CSSProperties;
}

// KaTeX 渲染配置
interface KaTeXOptions {
  displayMode: boolean;      // 块级/行内
  throwOnError: boolean;     // 错误时是否抛出
  errorColor: string;        // 错误颜色
  strict: boolean | string;  // 严格模式
  trust: boolean;            // 是否信任输入
  macros?: Record<string, string>; // 自定义宏
}

// Mermaid 渲染配置
interface MermaidOptions {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  securityLevel: 'strict' | 'loose' | 'antiscript';
  startOnLoad: boolean;
}

// 上下文信息
interface KnowledgeContext {
  path: {
    level1: string;
    level2: string;
    level3: string;
  };
  code: string;
  importanceLevel: 'A' | 'B' | 'C';
  stats?: {
    learnCount: number;
    avgMastery: 'A' | 'B' | 'C' | 'D' | 'E';
  };
}
```

## UI Specifications

### 渲染视图

| 元素 | 规格 |
|-----|------|
| 正文字号 | 14px |
| 行高 | 1.6 |
| 标题字号 | H1: 24px, H2: 20px, H3: 18px, H4+: 16px |
| 代码块背景 | `#f6f8fa` |
| 代码块边框 | 1px `#d0d7de` |
| 代码块圆角 | 6px |
| 内联代码背景 | `rgba(175, 184, 193, 0.2)` |
| 引用块左边框 | 4px `#d0d7de` |
| 引用块背景 | `#f6f8fa` |
| 表格边框 | 1px `#d0d7de` |
| 表格表头背景 | `#f6f8fa` |

### KaTeX 样式

| 元素 | 规格 |
|-----|------|
| 块级公式外边距 | 16px 0 |
| 块级公式内边距 | 8px 0 |
| 行内公式垂直对齐 | middle |
| 公式错误颜色 | `#FF4D4F` |

### Mermaid 样式

| 元素 | 规格 |
|-----|------|
| 容器边框 | 1px `#d0d7de` |
| 容器圆角 | 6px |
| 容器内边距 | 16px |
| 最小高度 | 100px |
| 加载状态 | 显示骨架屏或 loading 图标 |

### 原始视图

| 元素 | 规格 |
|-----|------|
| 字体 | `SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace` |
| 字号 | 13px |
| 行高 | 1.5 |
| 背景 | `#f6f8fa` |
| 内边距 | 16px |
| 自动换行 | true |

## Performance Requirements

- Markdown 渲染时间 <= 100ms（1000 字符以内）
- 公式渲染时间 <= 200ms（10 个公式以内）
- 图表渲染时间 <= 500ms
- 视图切换时间 <= 100ms

## Error Handling

- Markdown 语法错误：友好提示，不影响其他内容渲染
- LaTeX 公式错误：显示红色错误文本，不阻止页面渲染
- Mermaid 语法错误：显示错误信息，提供编辑建议
- 图片加载失败：显示占位图和错误提示

## Security Requirements

- 禁止渲染 HTML（使用 sanitize）
- Mermaid 在严格安全模式下运行
- 外部链接添加 `rel="noopener noreferrer"`
- 图片使用 referrer policy
