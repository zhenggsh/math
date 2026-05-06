## 1. 后端：扩展 MD 内容查找逻辑

- [ ] 1.1 修改 `textbook.service.ts` 的 `readContentFromFile`，增加按知识点名称匹配章节的能力（支持 `##`/`###`/`####` + 名称）
- [ ] 1.2 修改 `getKnowledgePointDetail`，按优先级查找：code 精确匹配 → level3 名称 → level2 名称 → level1 名称
- [ ] 1.3 为 `getKnowledgePointDetail` 返回结果增加 `definition`、`characteristics`、`importanceLevel` 字段（用于前端概述区）
- [ ] 1.4 运行后端测试，确认查找逻辑正确

## 2. 前端：Markdown 与原始视图左对齐

- [ ] 2.1 检查 `MarkdownPreview` 组件及其样式，移除内容区居中样式，统一改为左对齐
- [ ] 2.2 确认原始视图（raw 模式）也使用左对齐
- [ ] 2.3 预览验证：渲染视图和原始视图均左对齐显示正常

## 3. 前端：概述区组件

- [ ] 3.1 创建 `KnowledgeOverview.tsx` 组件，展示定义、特性、重要性级别
- [ ] 3.2 在 `LearningPage.tsx` 中集成概述区（面包屑下方、内容上方）
- [ ] 3.3 从知识点详情 API 获取 definition/characteristics/importanceLevel 并传入组件
- [ ] 3.4 预览验证：概述区正确展示，缺失字段自动隐藏

## 4. 前端：前驱后继导航

- [ ] 4.1 在 `LearningPage.tsx` 中实现 DFS 扁平化遍历序列，维护当前索引
- [ ] 4.2 在内容区工具栏增加"上一个"/"下一个"按钮
- [ ] 4.3 实现按钮点击逻辑：更新选中节点、加载详情、同步树高亮
- [ ] 4.4 处理边界：第一个节点禁用"上一个"，最后一个禁用"下一个"
- [ ] 4.5 预览验证：导航按钮按 DFS 顺序正确切换知识点

## 5. 前端：知识点导出功能

- [ ] 5.1 安装前端依赖：`jspdf`、`html2canvas`
- [ ] 5.2 创建 `KnowledgeExport.tsx` 组件，包含导出下拉菜单（Markdown、PDF）
- [ ] 5.3 实现 Markdown 导出：组装概述 + 原始内容，触发浏览器下载
- [ ] 5.4 实现 PDF 导出：使用 `html2canvas` 截图内容区 + `jsPDF` 生成 PDF
- [ ] 5.5 导出前等待异步渲染（Mermaid/KaTeX）完成，最大等待 3 秒
- [ ] 5.6 预览验证：两种导出格式文件内容正确

## 6. 前端：一二级节点内容加载

- [ ] 6.1 修改 `LearningPage.tsx` 的 `handleSelectNode`，移除仅三级节点加载内容的限制
- [ ] 6.2 确认一二级节点点击时正确调用 `getKnowledgePointDetail`
- [ ] 6.3 预览验证：点击一二级节点能展示对应 MD 章节内容

## 7. 集成与测试

- [ ] 7.1 全链路验证：点击一级 → 展示内容 → 下一个 → 二级 → 下一个 → 三级 → 导出 PDF
- [ ] 7.2 确认树形导航和内容区同步正常
- [ ] 7.3 检查 TypeScript 编译无错误
- [ ] 7.4 构建前端并部署验证
