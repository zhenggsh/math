## 1. 前端：MarkdownPreview 支持编辑模式

- [x] 1.1 `MarkdownPreview/types.ts` 新增 `editable?: boolean` 和 `onContentChange?: (content: string) => void` props
- [x] 1.2 `MarkdownPreview.tsx` raw 模式下根据 `editable` 渲染 `<textarea>` 或 `<pre>`
- [x] 1.3 `MarkdownPreview.module.css` 新增 `.rawEditor` 样式
- [x] 1.4 预览验证：教师看到 textarea，学生看到只读 pre

## 2. 前端：LearningPage 集成编辑和保存

- [x] 2.1 `LearningPage.tsx` 新增 `editedContent` 和 `isSaving` state
- [x] 2.2 `LearningPage.tsx` 切换节点时重置 `editedContent`
- [x] 2.3 `LearningPage.tsx` toolbar 增加"保存"按钮（仅在 raw 模式且教师/管理员显示）
- [x] 2.4 `LearningPage.tsx` 实现 `handleSaveContent` 回调
- [x] 2.5 `knowledgeApi.ts` 新增 `saveKnowledgePointContent` API
- [x] 2.6 预览验证：编辑后保存成功，预览内容同步更新

## 3. 后端：新增内容保存 API

- [x] 3.1 `textbook.controller.ts` 新增 `PUT /textbooks/:id/content` endpoint（仅 TEACHER/ADMIN）
- [x] 3.2 `textbook.service.ts` 新增 `updateContentInFile` 方法
- [x] 3.3 `textbook.service.ts` 新增 `findContentBlockRange` 及 5 个辅助方法（按一/二/三级定位）
- [x] 3.4 预览验证：保存后 md 文件内容块正确更新

## 4. 集成与测试

- [x] 4.1 全链路验证：教师切换到 raw → 编辑内容 → 保存 → 预览内容同步更新
- [x] 4.2 权限验证：学生看不到保存按钮，接口返回 403
- [x] 4.3 边界验证：定位失败时不写入文件，返回 404
- [x] 4.4 构建并部署验证
