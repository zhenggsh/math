## Why

教师在查看知识点详情时，发现 Markdown 内容中的错误需要修正，但当前流程需要下载 md 文件、本地编辑后再重新上传，操作繁琐。本变更旨在让有权限的用户（教师/管理员）直接在学习页面的原始视图模式下编辑并保存知识点内容，提升内容维护效率。

## What Changes

- **Raw 模式可编辑**：`MarkdownPreview` 在原始视图模式下渲染可编辑的 `<textarea>`，替代只读的 `<pre>`
- **权限控制**：仅 `TEACHER` 和 `ADMIN` 角色可见编辑和保存功能，学生只能查看
- **保存到 md 文件**：点击保存后，后端定位当前知识点在 md 文件中的内容块并替换，保持文件其余部分不变
- **预览同步**：保存成功后，预览模式下的内容同步更新

## Capabilities

### New Capabilities
- `raw-content-edit`: 原始视图模式下直接编辑 Markdown 内容并保存到文件

### Modified Capabilities
- `markdown-preview`:
  - 新增 `editable` 和 `onContentChange` props
  - raw 模式下根据权限显示 textarea 或只读 pre

## Impact

- **前端**: `MarkdownPreview.tsx`, `MarkdownPreview.module.css`, `LearningPage.tsx`, `knowledgeApi.ts`
- **后端**: `textbook.controller.ts` 新增 endpoint，`textbook.service.ts` 新增内容块定位与替换逻辑
- **依赖**: 无新增依赖
