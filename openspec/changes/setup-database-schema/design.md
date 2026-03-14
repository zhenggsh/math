## Context

根据 constitution.md 的域模型定义，数学通项目需要四个核心实体：
- **User**：系统使用者，支持学生/教师/管理员三种角色
- **KnowledgePoint**：教材中的知识点，从文件解析生成
- **LearningRecord**：用户对知识点的学习反馈
- **Textbook**：知识点的集合，对应一个 xlsx/csv + md 文件对

## Goals / Non-Goals

**Goals:**
- 建立完整的数据库模型（Prisma Schema）
- 配置 PostgreSQL 数据库连接
- 实现 PrismaService 封装
- 创建初始数据库迁移

**Non-Goals:**
- 不实现具体业务逻辑（后续变更处理）
- 不配置数据库连接池高级设置（后续优化）
- 不实现数据备份策略（运维层面处理）

## Decisions

### 1. 字段命名采用 snake_case（数据库）/ camelCase（Prisma 模型）
**理由：**
- 符合 PostgreSQL 命名规范
- Prisma 自动映射 camelCase ↔ snake_case

### 2. LearningRecord 设计为不可更新（仅创建）
**理由：**
- 学习记录是历史数据，不应修改
- 如需修正，创建新记录并标记旧记录

### 3. User.studentInfo 使用 JSON 类型
**理由：**
- 学生信息（学号、班级）可能扩展
- JSON 类型提供灵活性，无需修改 schema

### 4. KnowledgePoint 使用 code 字段（如 1.1.1）作为主业务键
**理由：**
- code 是业务唯一标识
- 同时保留 id 作为主键（UUID 或自增）

## Risks / Trade-offs

| 风险 | 缓解措施 |
|-----|---------|
| 数据库迁移失败 | 使用 `prisma migrate dev` 前备份数据 |
| 字段类型不匹配 | 严格遵循 TypeScript 类型和 Prisma 类型映射 |
| 关系循环依赖 | 使用 Prisma 的隐式多对多或显式关系表 |

## Migration Plan

1. 创建 schema.prisma
2. 运行 `prisma migrate dev --name init`
3. 生成 Prisma Client
4. 验证表结构

## Open Questions

- 是否需要配置数据库连接池大小？（默认 5 个连接）
- 是否需要启用 Prisma 的日志记录？
