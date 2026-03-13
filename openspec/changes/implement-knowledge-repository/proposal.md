## Why

数学通系统的核心功能是展示教材知识点，需要支持从文件（xlsx/csv/md）导入知识库，并提供管理界面。当前缺少知识库管理功能，无法实现 project_target.md 第 14-22 行的知识库管理需求。

## What Changes

- 实现文件上传 API（支持 xlsx/csv/md）
- 实现 Excel/CSV 解析服务（知识点框架）
- 实现 Markdown 读取服务（知识点详情）
- 创建知识库管理页面（左侧文件夹 + 右侧列表）
- 实现刷新机制（检测文件变化）

## Capabilities

### New Capabilities
- `knowledge-import`: 从文件导入知识点
- `knowledge-management`: 知识库管理界面和文件操作

### Modified Capabilities
- 无

## Impact

- **文件系统**：读取 iksm/ 目录
- **数据库**：写入 KnowledgePoint 表
- **API 变更**：新增 /knowledge/* 端点
- **前端页面**：新增知识库管理页面
