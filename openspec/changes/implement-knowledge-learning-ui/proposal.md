## Why

实现多栏式学习界面，为学生提供沉浸式的数学知识点学习体验。知识点数据已通过前置变更（implement-textbook-management）入库，现在需要构建用户界面来实现：

1. **树形导航**：直观展示知识点层级结构，支持快速定位和浏览
2. **Markdown 预览**：支持 LaTeX 数学公式和 Mermaid 图表的高质量渲染
3. **多栏布局**：参考 IDE 界面设计，左侧知识树、中间内容区、右侧 AI 侧栏、下方学习反馈
4. **双视图切换**：支持传统树图和思维导图两种视图模式

这是核心学习功能的入口界面，直接影响用户学习体验。

## What Changes

### 新增功能模块
- **多栏布局系统**：可拖拽调整宽度的三栏布局（左侧知识树、中间内容区、右侧 AI 侧栏）
- **知识树组件**：支持树图和思维导图两种视图的知识点导航组件
- **Markdown 预览组件**：集成 KaTeX 数学公式渲染和 Mermaid 图表解析
- **AI 侧栏框架**：预留扩展区域，为后续 AI 辅助学习功能做准备
- **学习页面**：整合所有组件的完整学习界面

### 技术集成
- 集成 KaTeX 实现 LaTeX 数学公式渲染（行内 `$...$` 和块级 `$$...$$`）
- 集成 Mermaid.js 实现图表渲染（流程图、思维导图等）
- 使用 React Split Pane 或类似库实现可拖拽分栏布局
- 基于 Ant Design Tree 组件扩展知识树功能

## Capabilities

### New Capabilities
- `knowledge-tree`: 知识点树形导航能力，支持双视图和虚拟滚动
- `markdown-preview`: Markdown 渲染能力，支持数学公式和图表

### Modified Capabilities
- 无（纯 UI 变更，不修改已有能力）

## Impact

### 新增文件
- `web/src/components/layout/ResizableLayout.tsx` - 可拖拽分栏布局容器
- `web/src/components/layout/MultiPaneLayout.tsx` - 多栏布局组合组件
- `web/src/components/features/learning/KnowledgeTree/` - 知识树组件目录
  - `KnowledgeTree.tsx` - 知识树主组件
  - `TreeView.tsx` - 树图视图
  - `MindMapView.tsx` - 思维导图视图
  - `types.ts` - 类型定义
- `web/src/components/features/learning/MarkdownPreview/` - Markdown 预览目录
  - `MarkdownPreview.tsx` - Markdown 预览主组件
  - `KaTeXRenderer.tsx` - KaTeX 公式渲染
  - `MermaidRenderer.tsx` - Mermaid 图表渲染
  - `types.ts` - 类型定义
- `web/src/components/features/learning/AISidebar.tsx` - AI 侧栏框架
- `web/src/pages/LearningPage.tsx` - 学习页面
- `web/src/pages/LearningPage.module.css` - 页面样式

### 依赖变更
- 新增：`katex`, `mermaid`, `react-split-pane`（或 `allotment`）

---

## 执行前检查

### 环境检查
- [ ] Node.js 版本 >= 18
- [ ] pnpm 版本 >= 8
- [ ] 前置变更 `implement-textbook-management` 已完成（知识点数据已入库）

### 项目状态检查
- [ ] 前端项目 `web/` 已初始化且可正常运行
- [ ] Ant Design 已配置且可用
- [ ] TypeScript 严格模式已启用
- [ ] 当前工作目录为项目根目录

---

## 执行过程注意事项

### 布局组件开发
1. **拖拽库选择**：优先使用 `allotment`（VS Code 同款），备选 `react-split-pane`
2. **性能优化**：左侧知识树需要支持虚拟滚动（大数据量场景）
3. **响应式适配**：考虑移动端简化布局（隐藏右侧 AI 侧栏）

### 知识树组件开发
1. **数据结构**：复用后端 KnowledgePoint 类型，前端转换为树形结构
2. **视图切换**：树图使用 Ant Design Tree，思维导图使用自定义 SVG 或集成库
3. **选中联动**：左树选中 → 触发内容加载 → 中间区域更新

### Markdown 渲染开发
1. **KaTeX 配置**：支持行内和块级公式，预加载常用字体
2. **Mermaid 安全**：在受控沙箱中渲染，防止 XSS
3. **转义处理**：Mermaid 中的特殊字符需按规范转义（详见项目规则）

### AI 侧栏开发
1. **当前阶段**：仅实现框架占位，预留接口和状态管理
2. **后续扩展**：将实现 AI 问答、智能提示等功能

---

## 执行后检查

### 代码质量检查
- [ ] `tsc --noEmit` 无错误
- [ ] `pnpm lint` 无 ESLint 错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 所有组件有 Props 接口
- [ ] 单元测试覆盖率 ≥ 80%

### 功能检查
- [ ] 左侧知识树正常显示知识点层级
- [ ] 树图/思维导图视图可正常切换
- [ ] 点击知识点中间区域显示对应内容
- [ ] Markdown 正确渲染（标题、列表、代码块等）
- [ ] LaTeX 数学公式正确渲染
- [ ] Mermaid 图表正确渲染
- [ ] 分栏宽度可拖拽调整
- [ ] 原始/渲染视图可切换

### 性能检查
- [ ] 知识树大数据量下滚动流畅（虚拟滚动生效）
- [ ] Markdown 渲染无闪烁
- [ ] 公式渲染无明显的延迟

### 规范检查
- [ ] 文件命名符合规范（组件 PascalCase）
- [ ] 目录结构符合项目规则
- [ ] 样式使用 CSS Modules
