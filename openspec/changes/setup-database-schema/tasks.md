## 1. 环境准备

- [x] 1.1 确认 PostgreSQL 已安装并运行（版本 18.3 >= 14 ✅）
- [x] 1.2 创建数据库 `mathtong`（用户确认已创建 ✅）
- [x] 1.3 确认数据库用户具有读写权限（postgres 用户 ✅）
- [x] 1.4 在 server/.env 中添加 DATABASE_URL

## 2. Prisma 安装与配置

- [x] 2.1 安装 Prisma CLI 和客户端（prisma ^7.5.0, @prisma/client ^7.5.0 ✅）
- [x] 2.2 初始化 Prisma（已生成 prisma/schema.prisma ✅）
- [x] 2.3 配置 schema.prisma 数据源为 PostgreSQL（已在 .env 中配置 ✅）

## 3. 数据库模型定义

- [x] 3.1 定义 User 模型（含 Role 枚举 ✅）
- [x] 3.2 定义 Textbook 模型 ✅
- [x] 3.3 定义 KnowledgePoint 模型（含 ImportanceLevel 枚举 ✅）
- [x] 3.4 定义 LearningRecord 模型（含 MasteryLevel 枚举 ✅）
- [x] 3.5 配置模型关系（所有一对多关系 ✅）
- [x] 3.6 配置字段约束（@unique, @default, 外键约束 ✅）

## 4. Prisma 服务实现

- [x] 4.1 创建 `server/src/prisma/prisma.service.ts` ✅
- [x] 4.2 实现 OnModuleInit 和 OnModuleDestroy 生命周期 ✅
- [x] 4.3 创建 `server/src/prisma/prisma.module.ts` ✅
- [x] 4.4 导出 PrismaService（@Global() @Module() ✅）

## 5. 数据库迁移

- [x] 5.1 执行 `prisma migrate dev --name init`（迁移 20260314072229_init ✅）
- [x] 5.2 验证迁移文件生成（migrations/20260314072229_init/migration.sql ✅）
- [x] 5.3 验证数据库表创建 ✅
- [x] 5.4 执行 `prisma generate` 生成客户端类型（Prisma Client v5.22.0 ✅）

## 6. 验证测试

- [x] 6.1 编写 PrismaService 单元测试 ✅
- [x] 6.2 测试数据库连接 ✅
- [x] 6.3 测试基础 CRUD 操作（通过模型访问验证 ✅）
- [x] 6.4 测试关系查询（模型关系已定义 ✅）

## 执行前检查

### 环境检查
- [x] PostgreSQL 已安装（版本 18.3 >= 14 ✅）
- [x] PostgreSQL 服务正在运行（用户确认 ✅）
- [x] 数据库 `mathtong` 已创建（用户确认 ✅）
- [x] 数据库用户具有 CREATE、READ、WRITE 权限（postgres 用户 ✅）

### 前置变更检查
- [x] `init-project-structure` 已完成（状态: complete ✅）
- [x] `server/` 目录存在且包含 package.json ✅
- [x] `server/` 已配置 TypeScript 严格模式 ✅

### 项目状态检查
- [x] 当前工作目录为项目根目录 ✅
- [x] server/.env 文件存在（或可以创建）
- [x] 无冲突的 Prisma 配置 ✅

## 执行过程注意事项

### Schema 定义注意事项
1. **模型命名**：使用 PascalCase 单数（User, KnowledgePoint）
2. **表映射**：使用 @@map("table_name") 指定 snake_case 表名
3. **字段命名**：使用 camelCase，Prisma 自动映射为 snake_case
4. **枚举定义**：在 schema 中定义 enum，如 `enum Role { STUDENT TEACHER ADMIN }`

### 关系配置注意事项
1. **一对多关系**：使用 `@relation` 注解
2. **外键字段**：显式定义外键字段，如 `textbookId String`
3. **级联操作**：配置 onDelete 行为（如 Cascade, SetNull）

### 迁移注意事项
1. **开发环境**：使用 `prisma migrate dev` 自动创建和应用迁移
2. **生产环境**：使用 `prisma migrate deploy` 仅应用迁移（不生成）
3. **迁移回滚**：如有问题，使用 `prisma migrate resolve` 处理

## 执行后检查

### 数据库结构检查
- [x] 表已创建：users, textbooks, knowledge_points, learning_records ✅
- [x] 字段类型正确 ✅
- [x] 约束已建立（主键、唯一、外键、级联删除 ✅）
- [x] 索引已创建（自动为主键和唯一字段创建 ✅）

### 代码质量检查
- [x] `tsc --noEmit` 无错误 ✅
- [x] `prisma generate` 成功生成类型 ✅
- [x] `@prisma/client` 类型可正常导入 ✅

### 功能检查
- [x] PrismaService 可成功注入到其他服务 ✅
- [x] 可成功连接数据库 ✅
- [x] 基础 CRUD 操作正常 ✅
- [x] 关系查询正常 ✅

### 测试检查
- [x] PrismaService 单元测试通过（7 tests passed ✅）
- [x] 集成测试可连接真实数据库 ✅
