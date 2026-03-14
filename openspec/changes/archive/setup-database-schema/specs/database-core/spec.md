## ADDED Requirements

### Requirement: 数据库模型定义
系统 SHALL 定义完整的 Prisma Schema，包含 User、KnowledgePoint、LearningRecord、Textbook 四个实体。

#### Scenario: User 模型
- **GIVEN** schema.prisma 定义
- **THEN** User 模型 SHALL 包含：id, email, passwordHash, name, role (STUDENT/TEACHER/ADMIN), studentInfo (JSON), createdAt
- **AND** email SHALL 唯一
- **AND** role SHALL 默认 STUDENT

#### Scenario: Textbook 模型
- **GIVEN** schema.prisma 定义
- **THEN** Textbook 模型 SHALL 包含：id, name, fileName, frameworkPath, contentPath, lastModifiedAt
- **AND** fileName SHALL 唯一

#### Scenario: KnowledgePoint 模型
- **GIVEN** schema.prisma 定义
- **THEN** KnowledgePoint 模型 SHALL 包含：id, code, level1, level2, level3, definition, characteristics, importanceLevel (A/B/C), textbookId, contentRef
- **AND** code SHALL 唯一
- **AND** 外键 textbookId SHALL 关联 Textbook

#### Scenario: LearningRecord 模型
- **GIVEN** schema.prisma 定义
- **THEN** LearningRecord 模型 SHALL 包含：id, userId, knowledgePointId, startTime, durationMinutes, masteryLevel (A/B/C/D/E), notes, createdAt
- **AND** 外键 userId SHALL 关联 User
- **AND** 外键 knowledgePointId SHALL 关联 KnowledgePoint

### Requirement: 数据库迁移
系统 SHALL 支持数据库迁移管理。

#### Scenario: 初始迁移
- **WHEN** 开发者执行 `prisma migrate dev --name init`
- **THEN** 系统 SHALL 创建数据库表
- **AND** 系统 SHALL 生成迁移文件到 `prisma/migrations/`

#### Scenario: 迁移应用
- **WHEN** 部署环境执行 `prisma migrate deploy`
- **THEN** 系统 SHALL 应用所有待处理迁移
- **AND** 数据库结构 SHALL 与 schema 一致

### Requirement: Prisma 服务封装
系统 SHALL 提供 PrismaService 供其他模块使用。

#### Scenario: 服务注入
- **GIVEN** PrismaModule 已导入
- **WHEN** 其他服务构造函数注入 PrismaService
- **THEN** 系统 SHALL 提供 PrismaClient 实例

#### Scenario: 连接生命周期
- **WHEN** 应用启动
- **THEN** PrismaService SHALL 建立数据库连接
- **WHEN** 应用关闭
- **THEN** PrismaService SHALL 断开数据库连接

### Requirement: Prisma Client 类型生成
系统 SHALL 生成 Prisma Client TypeScript 类型。

#### Scenario: 类型生成
- **WHEN** 开发者执行 `prisma generate`
- **THEN** 系统 SHALL 生成 `@prisma/client` 类型定义
- **AND** 类型定义 SHALL 与 schema 同步

### Requirement: 数据库连接配置
系统 SHALL 支持通过环境变量配置数据库连接。

#### Scenario: 环境变量配置
- **GIVEN** .env 文件包含 `DATABASE_URL`
- **WHEN** 应用启动
- **THEN** PrismaClient SHALL 使用 DATABASE_URL 连接数据库
- **AND** URL 格式 SHALL 为 `postgresql://user:password@host:port/dbname`
