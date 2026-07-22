# Tasks: 教材详情页与知识点扩充

## 1. 后端 DTO 与并发锁

- [x] 1.1 创建 `server/src/modules/textbook/dto/expand-knowledge-points.dto.ts`
- [x] 1.2 在 `TextbookService` 中添加 `pg_advisory_xact_lock` 辅助方法和 `hashTextbookId`
- [x] 1.3 运行后端测试确认无回归

## 2. 后端 xlsx 追加辅助

- [x] 2.1 在 `TextbookFileService` 中实现 `appendXlsxRows`
- [x] 2.2 创建 `textbook-file.service-append.spec.ts` 测试追加逻辑
- [x] 2.3 运行测试确认通过

## 3. 后端 md 追加逻辑

- [x] 3.1 在 `TextbookService` 中实现 `appendMdContent`、`extractMdCodes` 和 `extractMdContentForCode`
- [x] 3.2 在 `textbook.service.spec.ts` 中添加 md 追加单元测试
- [x] 3.3 运行测试确认通过

## 4. 后端扩充主流程

- [x] 4.1 在 `TextbookParserService` 中添加 `validateRequiredColumns`
- [x] 4.2 在 `TextbookFileService` 中实现 `saveTempFile` 和 `deleteTempFile`
- [x] 4.3 在 `TextbookService` 中实现 `expandKnowledgePoints` 主流程（含冲突检测、文件追加、数据库写入）
- [x] 4.4 在 `textbook.service.spec.ts` 中添加扩充流程单元测试
- [x] 4.5 运行测试确认通过

## 5. 后端 Controller 接口

- [x] 5.1 在 `TextbookController` 中添加 `POST /textbooks/:id/expand` 端点
- [x] 5.2 创建 `textbook.controller.spec.ts` 测试端点
- [x] 5.3 运行测试确认通过

## 6. 前端 API 与类型

- [x] 6.1 在 `web/src/types/textbook.types.ts` 中添加 `ExpandResult` 类型
- [x] 6.2 在 `web/src/services/textbook.service.ts` 中添加 `expandTextbook` API 调用
- [x] 6.3 运行前端类型检查确认通过

## 7. 前端教材详情页

- [x] 7.1 在 `web/src/App.tsx` 中添加 `/teacher/textbooks/:id` 路由
- [x] 7.2 创建 `useTextbookDetail` hook 获取教材详情和知识点树
- [x] 7.3 创建 `TextbookDetailPage` 展示教材信息和知识点列表
- [x] 7.4 运行前端类型检查确认通过

## 8. 前端扩充弹窗

- [x] 8.1 创建 `ExpandKnowledgePointsModal` 上传弹窗组件
- [x] 8.2 创建 `ExpandKnowledgePointsModal.test.tsx` 测试弹窗行为
- [x] 8.3 运行测试确认通过

## 9. 前端列表详情入口

- [x] 9.1 在 `TextbookTable` 中添加「详情」按钮和 `onViewDetail` 回调
- [x] 9.2 在 `TextbookManagePage` 中实现 `handleViewDetail` 并传递给表格
- [x] 9.3 运行前端测试确认通过

## 10. 前端详情页测试

- [x] 10.1 创建 `TextbookDetailPage.test.tsx` 测试详情页渲染
- [x] 10.2 运行测试确认通过

## 11. E2E 测试

- [x] 11.1 创建扩充成功路径 E2E 测试（如项目支持）
- [x] 11.2 创建扩充冲突路径 E2E 测试
- [x] 11.3 运行 E2E 测试确认通过

## 12. 质量门禁

- [x] 12.1 运行 `pnpm typecheck` 确认无错误
- [x] 12.2 运行 `pnpm lint` 确认无新增错误
- [x] 12.3 运行 `pnpm test` 确认前后端测试全部通过
- [x] 12.4 创建最终提交

---

所有任务已完成。
