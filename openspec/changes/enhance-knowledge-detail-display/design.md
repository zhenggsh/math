## Context

当前学习页面（LearningPage）的知识点详情展示存在以下问题：
- Markdown 渲染视图内容默认居中，影响长文本阅读体验
- 原始视图同样居中显示
- 仅三级知识点节点能触发内容加载，一二级节点点击无响应
- 知识点间缺少快速导航手段，用户需返回树形面板重新选择
- 框架中已解析的定义、特性、重要性级别未在内容区显性展示
- 无导出功能，用户无法离线保存知识点内容

## Goals / Non-Goals

**Goals:**
- Markdown 预览和原始视图统一左对齐，符合中文阅读排版习惯
- 一二级知识点点击也能从 MD 文件中定位并展示对应章节内容
- 提供上一知识点 / 下一知识点快捷导航
- 支持将当前知识点内容导出为 Markdown 或 PDF
- 在内容区顶部展示知识点元信息概述（定义、特性、重要性级别）

**Non-Goals:**
- 不涉及知识树 UI 展示细节的修改（展开/折叠动画、思维导图渲染等已在其他变更中覆盖）
- 导出为 DOC 格式（前端实现复杂度高，暂不纳入，仅预留接口）
- 后端增加新的 API 端点（复用现有 `/knowledge-points/:id` 接口）
- 原始视图下的内容编辑（已在 `modify-knowledge-detail` change 中覆盖）

> **注意**：树构建逻辑（`knowledgeTree.ts` 的 `convertToTreeData`）的修改虽与树结构相关，但属于数据层转换逻辑的重构，而非 UI 展示细节。该修改是支撑一二级节点可点击、导航高亮等功能的前提，已纳入本变更范围。

## Decisions

### 1. 内容对齐方式：全局左对齐
- **Decision**: Markdown 预览容器和原始文本容器统一移除 `text-align: center`，改为 `text-align: left`（默认），并通过 CSS 覆盖确保 Ant Design 或其他全局样式不会将其居中。
- **Rationale**: 中文技术文档阅读以左对齐为主流，居中排版在宽屏上可读性差。

### 2. 一二级知识点内容定位：按名称模糊匹配
- **Decision**: 扩展后端 `readContentFromFile`，增加按知识点名称（level1/level2/level3）匹配 MD 文件章节的能力。匹配优先级：code 精确匹配 > 名称包含匹配。
- **Rationale**: 现有 MD 文件章节标题不统一使用 `#### 知识点 {code}` 格式，部分章节仅使用知识点名称作为标题。名称匹配能覆盖更多情况。
- **Alternative**: 要求用户统一 MD 文件格式 —  rejected，需要兼容历史数据。

### 3. 前驱后继导航：前端扁平化遍历序列
- **Decision**: 在 `LearningPage` 中，将树形数据通过深度优先遍历（DFS）转换为扁平的知识点序列，维护当前索引。上一/下一按钮直接操作索引。
- **Rationale**: 实现简单，不需要后端支持。DFS 顺序符合用户从树形结构中自上而下、从左到右的浏览直觉。
- **Trade-off**: 如果树结构动态变化（如后端过滤），序列需要重新计算。

### 4. PDF 导出方案：jsPDF + html2canvas
- **Decision**: 使用 `html2canvas` 将内容区 DOM 截图，再通过 `jsPDF` 生成 PDF。
- **Rationale**: 纯前端实现，无需后端参与；能保留 Markdown 渲染后的样式（公式、图表等）。
- **Alternative**: 后端生成 PDF（Puppeteer/Playwright）— rejected，增加部署复杂度；纯文本生成 — rejected，会丢失公式和图表；`window.print()` — rejected，无法生成文件下载，且打印样式控制有限。
- **Trade-off**: 复杂页面截图可能体积较大，公式/图表渲染需要等待完成后再导出。

### 5. 概述区位置：固定在内容区顶部
- **Decision**: 在 Markdown 预览/原始视图上方、面包屑下方新增独立 `KnowledgeOverview` 卡片组件。
- **Rationale**: 元信息应在内容之前展示，帮助用户建立上下文。使用 Ant Design `Card` 组件保持风格一致。

### 6. 预览/原始视图切换：仅保留 toolbar 中的切换
- **Decision**: `MarkdownPreview` 组件移除内部的 `Segmented` 切换控件，改为纯受控组件（通过 `showRaw` prop）。视图切换仅由 `LearningPage` toolbar 提供。
- **Rationale**: 避免 UI 冗余。当 `showRaw` 被外部控制时，内部 `Segmented` 点击无效，造成困惑。
- **Implementation**: `MarkdownPreview` 移除 `useState` 和 `Segmented`，直接根据 `showRaw` prop 渲染预览或原始视图。

### 7. 后端自动生成一二级知识点记录
- **Decision**: 在 `textbook-parser.service.ts` 中新增 `generateHierarchyPoints` 方法，从三级知识点数据自动提取并生成一二级记录。
- **Rationale**: 现有 math01 数据仅有 43 条三级记录，数据库中无一二级记录。前端若要让一二级节点可点击加载内容，必须先有对应的数据库记录。这是"一二级节点可点击"功能的隐含前提。
- **Trade-off**: 自动生成的一二级记录 definition/characteristics 为空（因为框架文件中这些字段只存在于三级记录），但 MD 内容查找仍可通过 code/名称匹配到对应章节。

### 8. 前端树构建逻辑重写
- **Decision**: 完全重写 `knowledgeTree.ts` 的 `convertToTreeData`，从"按 level1/level2 名称虚拟分组"改为"按 code 层级建立真实父子关系"。
- **Rationale**: 原实现使用虚拟 key（`l1-xxx`、`l2-xxx`），与数据库 `id` 不对应。这导致：
  - 导航时 `selectedKey` 无法与树节点匹配
  - `expandedKeys` 需要虚拟 key 而非真实 id
  - `KnowledgeTree` 组件高亮逻辑无法工作
- **Implementation**: 按 code 中 `.` 的数量判断层级（0 个=一级，1 个=二级，2 个=三级），通过 code 前缀查找父节点，所有节点使用数据库 `id` 作为 `key`。

### 9. 面包屑路径拼接：显示完整层级路径
- **Decision**: 面包屑最后一项从仅显示节点 `title` 改为拼接 `level1.level2.level3`。
- **Rationale**: 仅显示三级名称无法体现知识点在整体框架中的位置，拼接路径更直观。
- **Implementation**: 从 `selectedNode.data` 中提取 level1/level2/level3，过滤空值后用 `.` 连接。

### 10. Mermaid 语法错误自动修复
- **Decision**: Mermaid 渲染失败时，自动将半角特殊字符替换为全角字符后重试一次；若仍失败，显示友好提示而非报错堆栈。
- **Rationale**: 项目规范要求 Mermaid 中的特殊字符使用全角字符，但历史数据或手动输入可能未完全转义。自动修复可提升兼容性。
- **Escape Rules**:
  - `(` → `（`，`)` → `）`
  - `[` → `［`，`]` → `］`
  - `"` → `"`，`'` → `'`
  - `:` → `：`，`;` → `；`
- **Implementation**: `MermaidRenderer` 在 `catch` 块中调用 `escapeMermaidContent`，若转义后内容与原始内容不同则重试；仍失败则显示中文警告 + 原始代码。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| MD 文件一二级章节标题格式不统一，名称匹配可能失败 | 匹配逻辑增加多种模式尝试（`## {name}`、`### {name}`、`#### {name}` 等），失败时展示友好提示 |
| PDF 导出时 Mermaid 图表尚未渲染完成 | 导出前等待 800ms 确保异步渲染完成；若图表区域为空白，提示用户先滚动到该区域 |
| 原始视图左对齐后代码块显示异常 | 测试确认等宽字体代码块在左对齐下显示正常 |
| 一二级节点内容可能较长，概述区信息不完整 | 一二级节点仍展示其 definition/characteristics（来自框架数据），MD 内容展示整个章节 |
| jspdf ESM 版本有外部依赖 | 通过 Vite alias 将 `jspdf` 指向 UMD 版本（已打包所有依赖），避免 node_modules 中缺失子依赖 |

## Migration Plan

需要数据迁移：
1. 合并代码后，重新同步 math01 教材（调用 refreshTextbook API）
2. 同步后数据库将从 43 条记录变为 54 条（3 一级 + 8 二级 + 43 三级）

部署步骤：
1. 合并代码
2. 前端安装新增依赖：`jspdf`、`html2canvas`
3. 重新构建并部署
4. 重新同步现有教材以生成一二级记录

## Open Questions

- MD 文件中的一二级章节是否总有明确的标题分隔？需要检查 `math01.md` 的实际结构确认匹配策略。
