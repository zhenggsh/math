## 1. 后端：扩展 MD 内容查找逻辑

- [x] 1.1 修改 `textbook.service.ts` 的 `readContentFromFile`，增加按知识点名称匹配章节的能力（支持 `##`/`###`/`####` + 名称）
- [x] 1.2 修改 `getKnowledgePointDetail`，按优先级查找：code 精确匹配 → level3 名称 → level2 名称 → level1 名称
- [x] 1.3 为 `getKnowledgePointDetail` 返回结果增加 `definition`、`characteristics`、`importanceLevel` 字段（用于前端概述区）
- [x] 1.4 运行后端测试，确认查找逻辑正确

## 2. 前端：Markdown 与原始视图左对齐

- [x] 2.1 检查 `MarkdownPreview` 组件及其样式，移除内容区居中样式，统一改为左对齐
- [x] 2.2 确认原始视图（raw 模式）也使用左对齐
- [x] 2.3 预览验证：渲染视图和原始视图均左对齐显示正常

## 3. 前端：概述区组件

- [x] 3.1 创建 `KnowledgeOverview.tsx` 组件，展示定义、特性、重要性级别
- [x] 3.2 在 `LearningPage.tsx` 中集成概述区（面包屑下方、内容上方）
- [x] 3.3 从知识点详情 API 获取 definition/characteristics/importanceLevel 并传入组件
- [x] 3.4 预览验证：概述区正确展示，缺失字段自动隐藏

## 4. 前端：前驱后继导航

- [x] 4.1 在 `LearningPage.tsx` 中实现 DFS 扁平化遍历序列，维护当前索引
- [x] 4.2 在内容区工具栏增加"上一个"/"下一个"按钮
- [x] 4.3 实现按钮点击逻辑：更新选中节点、加载详情、同步树高亮
- [x] 4.4 处理边界：第一个节点禁用"上一个"，最后一个禁用"下一个"
- [x] 4.5 预览验证：导航按钮按 DFS 顺序正确切换知识点

## 5. 前端：知识点导出功能

- [x] 5.1 安装前端依赖：`jspdf`、`html2canvas`
- [x] 5.2 创建 `KnowledgeExport.tsx` 组件，包含导出下拉菜单（Markdown、PDF）
  - 实际实现：导出逻辑内联在 `LearningPage.tsx`，未创建独立 `KnowledgeExport.tsx` 组件
- [x] 5.3 实现 Markdown 导出：组装概述 + 原始内容，触发浏览器下载
- [x] 5.4 实现 PDF 导出：使用 `html2canvas` 截图内容区 + `jsPDF` 生成 PDF
- [x] 5.5 导出前等待异步渲染（Mermaid/KaTeX）完成，最大等待 3 秒
- [x] 5.6 预览验证：两种导出格式文件内容正确

## 6. 前端：一二级节点内容加载

- [x] 6.1 修改 `LearningPage.tsx` 的 `handleSelectNode`，移除仅三级节点加载内容的限制
- [x] 6.2 确认一二级节点点击时正确调用 `getKnowledgePointDetail`
- [x] 6.3 预览验证：点击一二级节点能展示对应 MD 章节内容

## 7. 集成与测试

- [x] 7.1 全链路验证：点击一级 → 展示内容 → 下一个 → 二级 → 下一个 → 三级 → 导出 PDF
- [x] 7.2 确认树形导航和内容区同步正常
- [x] 7.3 检查 TypeScript 编译无错误
  - 前端 `tsc --noEmit` 通过
  - 后端 `tsc --noEmit` 通过
- [x] 7.4 构建前端并部署验证

## 8. 支撑性改动（隐含依赖）

以下改动虽未在原始提案中明确列出，但为功能落地所必需：

- [x] 8.1 后端 `textbook-parser.service.ts`：新增 `generateHierarchyPoints`，从三级知识点数据自动生成一二级记录（code 为 `a` / `a.b`）
  - 理由：现有 math01 数据仅有 43 条三级记录，数据库中无一二级记录。前端若要让一二级节点可点击加载内容，必须先有对应的数据库记录。
  - 实现：扫描所有三级 code，提取唯一前缀，生成 L1（`a`）和 L2（`a.b`）记录，继承名称并取子节点最高重要性级别。
- [x] 8.2 前端 `knowledgeTree.ts`：完全重写 `convertToTreeData`，从"按名称虚拟分组"改为"按 code 真实父子关系"构建树
  - 理由：原实现使用虚拟 key（`l1-xxx`、`l2-xxx`），与数据库 id 不对应。导航时无法正确高亮树节点，也无法将 `selectedKey` 与树节点匹配。
  - 实现：按 code 层级（`.` 数量）排序，L0 为根，L1/L2 通过 code 前缀查找父节点，所有节点使用数据库 `id` 作为 `key`。

## 9. 面包屑路径拼接

- [x] 9.1 修改 `LearningPage.tsx` 的 `breadcrumbItems`，最后一项从 `selectedNode.title` 改为 `level1.level2.level3` 拼接
- [x] 9.2 预览验证：点击不同层级节点，面包屑正确显示完整路径

## 10. Mermaid 语法错误自动修复

- [x] 10.1 `MermaidRenderer.tsx` 新增 `MERMAID_ESCAPE_MAP` 和 `escapeMermaidContent` 函数
- [x] 10.2 渲染失败时自动转义重试（仅当转义后内容与原始内容不同）
- [x] 10.3 转义后仍失败时显示中文友好提示（含错误信息和原始代码）
- [x] 10.4 预览验证：含特殊字符的 Mermaid 图表能正确渲染或显示友好提示
