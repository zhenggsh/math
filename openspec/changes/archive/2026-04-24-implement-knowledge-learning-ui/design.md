## Context

数学通项目需要构建核心学习界面，采用多栏式可拖拽布局，类似现代 IDE（如 VS Code、TRAE）的界面设计。这种布局已被证明能够提供高效的信息组织和操作体验。

当前状态：
- 前置变更 `implement-textbook-management` 已完成，知识点数据已入库
- 前端项目已初始化，Ant Design 已配置
- 需要构建完整的知识点学习界面

用户需求（来自 project_target.md）：
- 树状结构展示知识点框架，支持思维导图和树图两种视图
- Markdown 预览，支持 LaTeX 数学公式和 Mermaid 图表
- 多栏式灵活布局界面（左侧知识树、中间内容区、右侧AI侧栏、下方反馈区）

## Goals / Non-Goals

**Goals:**
- 实现可拖拽调整的多栏布局（左/中/右三栏 + 底部面板）
- 实现知识树组件，支持树图和思维导图两种视图
- 实现 Markdown 渲染组件，支持数学公式和图表
- 实现 AI 侧栏框架（预留扩展）
- 确保良好的性能和用户体验（虚拟滚动、懒加载）

**Non-Goals:**
- 不实现 AI 侧栏的具体功能（仅框架占位）
- 不实现学习反馈功能（后续变更处理）
- 不实现移动端完整功能（响应式适配但不保证体验）
- 不实现离线缓存功能

## Decisions

### 1. 布局方案：Allotment（VS Code 同款）

**决策**：使用 `allotment` 库实现可拖拽分栏布局

**理由：**
- VS Code 同款，用户熟悉度高
- 支持嵌套分栏（水平 + 垂直组合）
- 支持持久化分栏尺寸
- TypeScript 类型支持完善

**替代方案：**
- `react-split-pane`：较老，维护不活跃
- `react-resizable-panels`：较新，但生态不如 allotment 成熟
- 自定义实现：复杂度高，不值得

### 2. Markdown 渲染器：react-markdown + 插件

**决策**：使用 `react-markdown` 配合 remark/rehype 插件

**理由：**
- React 原生集成，支持组件级定制
- 插件生态丰富（数学公式、图表等）
- 安全性好（默认转义 HTML）
- 性能可接受

**技术栈：**
- `react-markdown` - 核心渲染
- `remark-math` + `rehype-katex` - LaTeX 公式
- `rehype-mermaid` - Mermaid 图表

**替代方案：**
- `@uiw/react-md-editor`：功能太重，我们需要只读预览
- 直接集成 `marked`：React 集成不够优雅

### 3. 数学公式方案：KaTeX

**决策**：使用 KaTeX 渲染 LaTeX 公式

**理由：**
- 渲染速度快（比 MathJax 快数倍）
- 支持服务器端渲染
- 体积相对较小
- 支持大部分常用数学符号

**替代方案：**
- MathJax：功能更全面但速度慢
- 自研：不现实

### 4. 思维导图方案：自研 SVG + 布局算法

**决策**：自研轻量级思维导图渲染（基于 SVG）

**理由：**
- 数据量可控（知识点层级通常不深）
- 完全控制交互和样式
- 无额外依赖
- 可定制性强

**替代方案：**
- `react-flow`：适合流程图，思维导图不够直观
- `d3`：太重，学习成本高
- `echarts`：不够灵活

### 5. 知识树大数据量处理：虚拟滚动

**决策**：使用 Ant Design Tree 的 `virtual` 属性 + `height` 配置

**理由：**
- Ant Design 已内置虚拟滚动支持
- 配置简单，开箱即用
- 满足性能需求

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| KaTeX 字体加载延迟 | 公式闪烁或显示异常 | 预加载字体文件，使用 CSS font-display: swap |
| Mermaid 渲染性能 | 复杂图表渲染卡顿 | 图表降级显示，提供"查看大图"功能 |
| 思维导图大数据量 | 渲染和交互性能下降 | 限制思维导图显示层级（如最多3级） |
| 分栏拖拽体验 | 拖拽卡顿或不流畅 | 使用 requestAnimationFrame 优化，设置拖拽最小尺寸 |

## Migration Plan

无需迁移（新增功能）

## Open Questions

1. 是否需要实现知识树的搜索/过滤功能？（建议后续变更添加）
2. AI 侧栏预留的尺寸比例是否合适？（建议实现后用户测试调整）
3. 是否需要支持 Markdown 编辑模式？（当前只读预览足够）
