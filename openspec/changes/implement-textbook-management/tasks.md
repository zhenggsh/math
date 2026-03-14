# Tasks: Implement Textbook Management

> **执行前必读**
> 1. 确保前置变更 `implement-user-authentication` 已完成
> 2. 阅读 `design.md` 中的技术决策和依赖选择
> 3. 阅读 `specs/` 中的详细规格

---

## 0. 执行前检查

- [ ] **0.1** 确认项目结构已存在（web/ 和 server/ 目录）
- [ ] **0.2** 确认 Prisma schema 文件存在
- [ ] **0.3** 确认 `iksm/` 目录存在且有示例文件
- [ ] **0.4** 确认教师角色认证守卫已实现

---

## 1. 后端：数据库模型

### 1.1 Prisma Schema 更新

- [ ] **1.1.1** 添加 `Textbook` 模型到 schema.prisma
  ```prisma
  model Textbook {
    id              String   @id @default(uuid())
    name            String
    fileName        String   @unique
    frameworkPath   String
    frameworkType   String   // xlsx | csv
    contentPath     String?
    lastModifiedAt  DateTime
    knowledgePoints KnowledgePoint[]
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt
  }
  ```

- [ ] **1.1.2** 更新 `KnowledgePoint` 模型，添加外键关联
  ```prisma
  model KnowledgePoint {
    id              String   @id @default(uuid())
    code            String
    level1          String
    level2          String?
    level3          String?
    definition      String?
    characteristics String?
    importanceLevel String   @default("C")
    textbookId      String
    textbook        Textbook @relation(fields: [textbookId], references: [id], onDelete: Cascade)
    // ... 其他字段
    
    @@unique([textbookId, code])
  }
  ```

- [ ] **1.1.3** 执行数据库迁移
  ```bash
  cd server && npx prisma migrate dev --name add_textbook_and_update_knowledge_point
  ```

### 1.2 生成 Prisma Client

- [ ] **1.2.1** 生成更新后的 Prisma Client
  ```bash
  cd server && npx prisma generate
  ```

---

## 2. 后端：文件解析服务

### 2.1 安装依赖

- [ ] **2.1.1** 安装文件解析相关依赖
  ```bash
  cd server && pnpm add xlsx papaparse
  cd server && pnpm add -D @types/papaparse
  ```

### 2.2 实现 ParserService

- [ ] **2.2.1** 创建 `server/src/modules/textbook/parser.service.ts`
  - 实现 Excel 解析方法
  - 实现 CSV 解析方法
  - 实现列名映射逻辑
  - 实现知识点数据结构生成

- [ ] **2.2.2** 实现文件类型检测方法
  ```typescript
  detectFileType(filePath: string): 'xlsx' | 'csv' | 'md' | 'unknown'
  ```

- [ ] **2.2.3** 实现 Markdown 读取方法
  ```typescript
  readContent(filePath: string): Promise<string>
  ```

- [ ] **2.2.4** 添加单元测试 `parser.service.spec.ts`
  - 测试 Excel 解析
  - 测试 CSV 解析（多种编码）
  - 测试错误处理

---

## 3. 后端：文件服务

### 3.1 实现 FileService

- [ ] **3.1.1** 创建 `server/src/modules/textbook/file.service.ts`
  - 实现扫描目录方法
  - 实现文件移动方法
  - 实现文件删除方法
  - 实现文件变更检测方法

### 3.2 文件上传处理

- [ ] **3.2.1** 配置 Multer 中间件
  - 临时目录：`uploads/temp/`
  - 文件大小限制：10MB
  - 文件类型过滤

- [ ] **3.2.2** 实现上传验证逻辑
  - 文件名验证
  - 文件类型验证
  - 重复文件名检查

---

## 4. 后端：Textbook 模块

### 4.1 创建模块结构

- [ ] **4.1.1** 创建目录结构
  ```
  server/src/modules/textbook/
  ├── textbook.module.ts
  ├── textbook.controller.ts
  ├── textbook.service.ts
  ├── file.service.ts
  ├── parser.service.ts
  ├── dto/
  │   ├── index.ts
  │   ├── upload-textbook.dto.ts
  │   ├── textbook-response.dto.ts
  │   ├── query-textbooks.dto.ts
  │   └── sync-result.dto.ts
  └── types/
      └── textbook.types.ts
  ```

### 4.2 实现 TextbookService

- [ ] **4.2.1** 实现 `findAll()` 方法 - 查询教材列表
- [ ] **4.2.2** 实现 `upload()` 方法 - 上传教材
- [ ] **4.2.3** 实现 `remove()` 方法 - 删除教材
- [ ] **4.2.4** 实现 `sync()` 方法 - 同步单个教材
- [ ] **4.2.5** 实现 `syncAll()` 方法 - 同步所有教材
- [ ] **4.2.6** 实现 `getFileTree()` 方法 - 获取文件树

### 4.3 实现 TextbookController

- [ ] **4.3.1** 创建 `textbook.controller.ts`
- [ ] **4.3.2** 添加路由装饰器和守卫
- [ ] **4.3.3** 实现 `GET /textbooks` 端点
- [ ] **4.3.4** 实现 `POST /textbooks/upload` 端点
- [ ] **4.3.5** 实现 `DELETE /textbooks/:id` 端点
- [ ] **4.3.6** 实现 `POST /textbooks/:id/sync` 端点
- [ ] **4.3.7** 实现 `GET /textbooks/files` 端点
- [ ] **4.3.8** 实现 `POST /textbooks/sync-all` 端点

### 4.4 定义 DTOs

- [ ] **4.4.1** 创建 `upload-textbook.dto.ts`
- [ ] **4.4.2** 创建 `textbook-response.dto.ts`
- [ ] **4.4.3** 创建 `query-textbooks.dto.ts`（分页、排序、搜索）
- [ ] **4.4.4** 创建 `sync-result.dto.ts`

### 4.5 注册模块

- [ ] **4.5.1** 更新 `app.module.ts`，导入 `TextbookModule`
- [ ] **4.5.2** 添加单元测试 `textbook.service.spec.ts`
- [ ] **4.5.3** 添加 E2E 测试 `textbook.e2e-spec.ts`

---

## 5. 前端：教材管理页面

### 5.1 创建页面组件

- [ ] **5.1.1** 创建 `web/src/pages/TextbookManage/TextbookManagePage.tsx`
  - 实现页面布局（左侧文件树 + 右侧列表）
  - 添加权限检查（仅教师访问）

- [ ] **5.1.2** 创建路由配置
  ```typescript
  // 路由路径: /teacher/textbooks
  ```

### 5.2 实现 FileTree 组件

- [ ] **5.2.1** 创建 `web/src/pages/TextbookManage/components/FileTree.tsx`
  - 使用 Ant Design Tree 组件
  - 展示文件树结构
  - 支持点击选择

### 5.3 实现教材列表表格

- [ ] **5.3.1** 创建 `web/src/pages/TextbookManage/components/TextbookTable.tsx`
  - 使用 Ant Design Table 组件
  - 实现分页
  - 实现排序
  - 实现搜索

### 5.4 实现上传组件

- [ ] **5.4.1** 创建 `web/src/pages/TextbookManage/components/UploadModal.tsx`
  - 使用 Ant Design Upload 组件
  - 支持拖拽上传
  - 支持多文件上传
  - 显示上传进度

### 5.5 实现同步按钮

- [ ] **5.5.1** 创建 `web/src/pages/TextbookManage/components/SyncButton.tsx`
  - 显示同步状态
  - 处理同步逻辑
  - 显示同步结果

### 5.6 实现 API 服务

- [ ] **5.6.1** 创建 `web/src/services/textbook.service.ts`
  - 封装教材管理相关 API 调用

### 5.7 实现自定义 Hooks

- [ ] **5.7.1** 创建 `web/src/pages/TextbookManage/hooks/useTextbooks.ts`
  - 管理教材列表数据
  - 处理分页、排序、搜索

---

## 6. 测试

### 6.1 后端单元测试

- [ ] **6.1.1** `parser.service.spec.ts` - 覆盖率 ≥ 80%
- [ ] **6.1.2** `file.service.spec.ts` - 覆盖率 ≥ 80%
- [ ] **6.1.3** `textbook.service.spec.ts` - 覆盖率 ≥ 80%

### 6.2 后端 E2E 测试

- [ ] **6.2.1** `textbook.e2e-spec.ts`
  - 测试所有 API 端点
  - 测试权限控制
  - 测试错误处理

### 6.3 前端单元测试

- [ ] **6.3.1** `TextbookManagePage.test.tsx` - 覆盖率 ≥ 80%
- [ ] **6.3.2** `FileTree.test.tsx` - 覆盖率 ≥ 80%
- [ ] **6.3.3** `TextbookTable.test.tsx` - 覆盖率 ≥ 80%
- [ ] **6.3.4** `UploadModal.test.tsx` - 覆盖率 ≥ 80%

---

## 7. 执行后检查

### 7.1 代码质量检查

- [ ] **7.1.1** 运行 `cd server && tsc --noEmit`，确保无类型错误
- [ ] **7.1.2** 运行 `cd web && tsc --noEmit`，确保无类型错误
- [ ] **7.1.3** 检查无 `any` 类型（有文档说明的例外允许）
- [ ] **7.1.4** 检查无 `console.log` 或 `debugger` 语句
- [ ] **7.1.5** 检查无未使用导入或变量

### 7.2 测试检查

- [ ] **7.2.1** 后端单元测试通过率 100%，覆盖率 ≥ 80%
  ```bash
  cd server && pnpm test --coverage
  ```
- [ ] **7.2.2** 前端单元测试通过率 100%，覆盖率 ≥ 80%
  ```bash
  cd web && pnpm test --coverage
  ```

### 7.3 代码风格检查

- [ ] **7.3.1** ESLint 检查通过
  ```bash
  cd server && pnpm lint
  cd web && pnpm lint
  ```
- [ ] **7.3.2** Prettier 格式化检查通过
  ```bash
  cd server && pnpm format:check
  cd web && pnpm format:check
  ```

### 7.4 功能验证

- [ ] **7.4.1** 教材列表查询正常
- [ ] **7.4.2** 文件上传功能正常（xlsx + md）
- [ ] **7.4.3** 文件上传功能正常（仅 csv）
- [ ] **7.4.4** 文件删除功能正常
- [ ] **7.4.5** 刷新同步功能正常
- [ ] **7.4.6** 权限控制正常（教师可访问，学生拒绝）

---

## 执行过程注意事项

### 文件上传处理

1. **临时目录策略**
   - 上传文件先保存到 `uploads/temp/`
   - 验证通过后移动到 `iksm/`
   - 定期清理临时目录

2. **文件名冲突处理**
   - 检查数据库中是否已存在同名文件
   - 如果存在，返回明确的错误信息

### 文件解析注意事项

1. **编码问题**
   - CSV 文件可能使用 GBK 编码
   - 使用 `iconv-lite` 处理编码转换

2. **大文件处理**
   - 使用流式解析处理大 CSV 文件
   - 设置合理的超时时间

### 数据库事务

1. **同步操作使用事务**
   ```typescript
   await this.prisma.$transaction(async (tx) => {
     // 删除旧知识点
     // 插入新知识点
     // 更新教材记录
   });
   ```

2. **级联删除**
   - 删除教材时自动删除关联的知识点
   - 在 Prisma schema 中配置 `onDelete: Cascade`

### 错误处理

1. **统一的错误响应格式**
   ```typescript
   {
     success: false,
     error: {
       code: 'ERROR_CODE',
       message: '错误描述'
     }
   }
   ```

2. **文件系统错误**
   - 文件不存在
   - 权限不足
   - 磁盘空间不足

---

## 附录：依赖清单

### 后端新增依赖

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1",
    "multer": "^1.4.5-lts.1",
    "@nestjs/platform-express": "^10.x"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "@types/papaparse": "^5.3.14"
  }
}
```

### 前端新增依赖

```json
{
  "dependencies": {
    "@ant-design/icons": "^5.x"
  }
}
```

---

*Version: 1.0*
*Change: implement-textbook-management*
*Estimated Time: 16-20 hours*
