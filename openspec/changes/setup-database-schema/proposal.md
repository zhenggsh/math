## Why

数学通项目需要存储用户学习反馈数据，包括用户信息、学习记录、掌握程度评分等。当前缺少数据库模型定义，无法持久化用户数据。本变更建立完整的数据库架构，为知识库管理和学习功能提供数据支撑。

## What Changes

- 设计 Prisma schema 包含所有数据模型（User, KnowledgePoint, LearningRecord 等）
- 创建初始数据库迁移
- 配置 Prisma Client 和连接
- 创建种子数据脚本用于开发测试
- 建立数据库访问规范

## Capabilities

### New Capabilities
- `database-access`: 数据库访问能力和数据模型管理

### Modified Capabilities
- 无

## Impact

- **数据库结构**：创建所有表和索引
- **代码变更**：新增 server/prisma/schema.prisma
- **依赖变更**：新增 @prisma/client
- **开发流程**：需要运行迁移命令
