## Context

数学通项目需要存储两类数据：知识库内容（文件存储）和用户学习数据（数据库存储）。本变更专注于数据库模型设计，基于 project_target.md 的用户管理和知识点学习需求。

数据模型设计参考：
- constitution.md 数据所有权原则
- project_target.md 第 38-44 行（用户管理）、第 29 行（学习反馈）

## Goals / Non-Goals

**Goals:**
- 设计完整的 Prisma schema
- 建立数据库迁移流程
- 配置 Prisma Client
- 创建种子数据

**Non-Goals:**
- 实现业务逻辑
- 处理文件存储（iksm/ 目录）
- 实现 API 接口

## Decisions

### Decision: 使用 Prisma 作为 ORM
**Rationale**: 项目规范明确要求使用 Prisma，提供类型安全和自动迁移。

### Decision: PostgreSQL 14+
**Rationale**: 项目规范要求，支持复杂查询和 JSON 字段（未来扩展）。

### Decision: 软删除 vs 硬删除
**Decision**: 使用硬删除（当前需求），未来需要时添加 deleted_at 字段。

### Decision: 学习记录不可更新
**Decision**: LearningRecord 创建后不可修改，保证数据真实性。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 模型设计不完善需要重构 | 保留迁移历史，使用 Prisma migrate dev 处理变更 |
| 性能问题（学习记录量大） | 添加索引（user_id, knowledge_point_id, created_at） |

## Migration Plan

1. 配置 DATABASE_URL 环境变量
2. 运行 `prisma migrate dev --name init`
3. 运行 `prisma db seed` 加载种子数据
4. 验证表结构正确

## Open Questions

- 是否需要分表存储历史学习记录？（当前不需要，数据量预计 < 100万条）
