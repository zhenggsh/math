## 1. Prisma Schema 设计

- [ ] 1.1 创建 server/prisma/schema.prisma
- [ ] 1.2 定义 User 模型（id, email, password, name, role, studentInfo, timestamps）
- [ ] 1.3 定义 KnowledgePoint 模型（id, code, hierarchy levels, content, importance, timestamps）
- [ ] 1.4 定义 LearningRecord 模型（id, userId, knowledgePointId, session info, mastery, timestamps）
- [ ] 1.5 定义模型关系（User-LearningRecord, KnowledgePoint-LearningRecord）
- [ ] 1.6 配置索引优化查询性能

## 2. 数据库迁移

- [ ] 2.1 配置 .env 文件 DATABASE_URL
- [ ] 2.2 运行 `prisma migrate dev --name init` 创建初始迁移
- [ ] 2.3 验证迁移文件生成正确
- [ ] 2.4 验证数据库表结构正确

## 3. Prisma Client 配置

- [ ] 3.1 创建 server/src/prisma/prisma.service.ts（NestJS 服务）
- [ ] 3.2 配置 Prisma Module 导出供其他模块使用
- [ ] 3.3 配置连接池参数

## 4. 种子数据

- [ ] 4.1 创建 server/prisma/seed.ts
- [ ] 4.2 添加测试用户数据（学生、教师、管理员各1个）
- [ ] 4.3 配置 package.json prisma.seed
- [ ] 4.4 运行 `prisma db seed` 验证

## 5. 验证

- [ ] 5.1 运行 `prisma generate` 生成客户端
- [ ] 5.2 编写简单查询测试连接
- [ ] 5.3 验证所有模型类型正确生成
