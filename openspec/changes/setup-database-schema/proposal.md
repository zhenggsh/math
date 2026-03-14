## Why

数学通项目需要存储用户数据、知识点数据和学习记录。根据 constitution.md 的域模型定义，需要建立 User、KnowledgePoint、LearningRecord、Textbook 四个核心实体。Prisma 作为 ORM 工具，提供类型安全的数据库访问和迁移管理能力。

## What Changes

- 定义 Prisma Schema（User, KnowledgePoint, LearningRecord, Textbook）
- 创建初始数据库迁移文件
- 实现 PrismaService 封装
- 配置数据库连接（PostgreSQL）
- 建立实体关系（ER）：User → LearningRecord → KnowledgePoint, Textbook → KnowledgePoint

## Capabilities

### New Capabilities
- `database-core`: 核心数据库访问能力，包含 Prisma ORM 配置和基础 CRUD 操作

### Modified Capabilities
- 无

## Impact

- 新增 `server/prisma/schema.prisma`：数据库模型定义
- 新增 `server/prisma/migrations/`：数据库迁移文件
- 新增 `server/src/prisma/prisma.service.ts`：Prisma 服务封装
- 新增 `server/src/prisma/prisma.module.ts`：Prisma 模块
- 修改 `server/.env`：添加数据库连接字符串

---

## 执行前检查

### 环境检查
- [ ] PostgreSQL 已安装并运行（版本 >= 14）
- [ ] 数据库 `mathtong` 已创建（或具有创建权限）
- [ ] 数据库用户具有读写权限

### 前置变更检查
- [ ] `init-project-structure` 变更已完成
- [ ] `server/` 目录存在且 NestJS 项目结构完整
- [ ] `server/package.json` 存在

### 项目状态检查
- [ ] 当前工作目录为项目根目录
- [ ] 无待处理的数据库迁移

---

## 执行过程注意事项

### Prisma 配置注意事项
1. **数据库 URL 格式**：`postgresql://user:password@localhost:5432/mathtong`
2. **模型命名**：使用 PascalCase 单数（User, KnowledgePoint）
3. **表命名**：使用 snake_case 复数（users, knowledge_points）
4. **外键命名**：使用 `[table]_id` 格式

### 数据类型注意事项
1. **枚举类型**：role (STUDENT/TEACHER/ADMIN), masteryLevel (A/B/C/D/E), importanceLevel (A/B/C)
2. **JSON 类型**：User.studentInfo 存储学号、班级等扩展信息
3. **日期类型**：使用 DateTime，默认 now()

### 关系配置注意事项
1. **User → LearningRecord**：一对多关系
2. **KnowledgePoint → LearningRecord**：一对多关系
3. **Textbook → KnowledgePoint**：一对多关系

---

## 执行后检查

### 数据库检查
- [ ] `prisma migrate dev` 执行成功
- [ ] 数据库表已创建（users, knowledge_points, learning_records, textbooks）
- [ ] 表结构符合 schema 定义
- [ ] 外键约束已建立

### 代码检查
- [ ] `tsc --noEmit` 无错误
- [ ] PrismaService 可正确注入
- [ ] PrismaClient 类型生成成功（`prisma generate`）

### 功能检查
- [ ] 可成功连接数据库
- [ ] 基础 CRUD 操作正常
- [ ] 关系查询正常
