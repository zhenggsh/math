## Why

当前学习页面的知识点详情展示存在体验不足：Markdown 内容默认居中影响可读性；只有三级知识点能查看 MD 内容，一二级节点无内容；缺少知识点间快速导航和导出能力；框架中的定义、特性等元信息未在内容区突出展示。本次调整旨在提升知识点学习的连续性和信息完整性。

## What Changes

- **Markdown 预览与原始视图左对齐**：取消内容区居中样式，统一使用左对齐以符合中文阅读习惯
- **一二级知识点内容定位**：扩展 MD 文件内容查找逻辑，支持一二级知识点通过名称匹配定位到对应章节内容
- **前驱/后继导航**：在内容区工具栏增加"上一个""下一个"按钮，按树形遍历顺序浏览知识点
- **知识点导出**：在内容区工具栏增加"导出"按钮，支持将当前知识点导出为 Markdown、PDF 格式
- **概述区展示**：在内容区顶部新增独立概述卡片，展示当前知识点的定义、特性/运算方式、重要性级别

## Capabilities

### New Capabilities
- `knowledge-navigation`: 知识点前驱后继导航，支持按树形顺序浏览知识点
- `knowledge-export`: 知识点内容导出，支持 Markdown、PDF 格式导出

### Modified Capabilities
- `markdown-preview`: 
  - 内容展示改为左对齐（目前默认居中）
  - 原始视图也改为左对齐
  - 新增概述区展示知识点框架元信息（定义、特性、重要性级别）
  - 工具栏扩展上一个/下一个/导出按钮
- `knowledge-tree`:
  - 一二级节点点击时也触发内容加载（目前仅三级节点触发）
  - 提供树形遍历序列用于导航
- `file-parser`:
  - MD 内容查找支持按名称匹配一二级知识点章节

## Impact

- **前端**: `LearningPage.tsx`, `MarkdownPreview.tsx`, `KnowledgeTree.tsx`, 新增 `KnowledgeOverview.tsx`, `KnowledgeExport.tsx`
- **后端**: `textbook.service.ts` 的 `readContentFromFile` 需支持按名称查找章节
- **依赖**: 前端增加 `jsPDF` + `html2canvas`（PDF 导出）
