# Proposal: Implement Textbook Management

## Why

数学通系统需要一个完整的知识库管理功能，使教师能够上传、管理和维护教材文件。目前知识库存储在 `iksm/` 目录下，采用文件对的形式（Excel/CSV 框架文件 + Markdown 详情文件），但系统缺乏：

1. **文件管理界面** - 教师无法通过 Web 界面查看和管理教材文件
2. **自动化解析** - 需要手动解析 Excel/CSV 文件并导入知识点数据
3. **文件同步机制** - 文件系统变更后需要手动更新数据库
4. **统一的教材视图** - 缺乏对教材文件及其状态的统一管理

通过实现教材管理功能，教师可以方便地：
- 上传新的教材文件对（xlsx/csv + md）
- 查看当前已上传的教材列表
- 删除不再需要的教材
- 刷新同步文件系统变更到数据库

## What Changes

### 后端变更

1. **TextbookModule** - 新建 NestJS 模块，提供教材管理的核心功能
2. **FileService** - 文件系统操作服务，负责：
   - 扫描 `iksm/` 目录获取文件列表
   - 检测文件变化（新增、修改、删除）
   - 文件上传和删除操作
3. **ParserService** - 文件解析服务，负责：
   - Excel (.xlsx) 文件解析
   - CSV (.csv) 文件解析
   - 知识点数据提取和验证
4. **TextbookController** - RESTful API 控制器，提供：
   - `GET /textbooks` - 获取教材列表
   - `POST /textbooks/upload` - 上传教材文件
   - `DELETE /textbooks/:id` - 删除教材
   - `POST /textbooks/:id/sync` - 刷新同步教材

3. **数据库模型扩展** - Prisma Schema 更新：
   - `Textbook` 模型 - 存储教材元数据
   - `KnowledgePoint` 模型 - 存储解析后的知识点

### 前端变更

1. **TextbookManagePage** - 教材管理页面（仅教师角色可访问）
2. **FileTree** - 左侧文件树组件，展示 `iksm/` 目录结构
3. **UploadComponent** - 文件上传组件，支持拖拽上传 xlsx/csv + md 文件对
4. **SyncButton** - 刷新同步按钮，触发文件扫描和数据库同步
5. **TextbookList** - 右侧教材列表表格，展示教材信息和操作按钮

### 依赖变更

新增依赖：
- `xlsx` - Excel 文件解析
- `papaparse` - CSV 文件解析
- `multer` - 文件上传处理

## Capabilities

| Capability | Description |
|------------|-------------|
| `file-parser` | 解析 Excel/CSV 知识点框架文件，提取知识点层级结构和元数据 |
| `textbook-management` | 教材文件的上传、删除、刷新同步等管理操作 |

## Impact

### 新增模块

```
server/src/modules/textbook/
├── textbook.module.ts
├── textbook.controller.ts
├── textbook.service.ts
├── file.service.ts
├── parser.service.ts
├── dto/
│   ├── upload-textbook.dto.ts
│   ├── textbook-response.dto.ts
│   └── sync-result.dto.ts
└── types/
    └── textbook.types.ts

web/src/pages/TextbookManage/
├── TextbookManagePage.tsx
├── components/
│   ├── FileTree.tsx
│   ├── UploadModal.tsx
│   ├── SyncButton.tsx
│   └── TextbookTable.tsx
└── hooks/
    └── useTextbooks.ts
```

### 数据库变更

```prisma
model Textbook {
  id              String   @id @default(uuid())
  name            String   // 教材名称（如：高中数学必修一）
  fileName        String   @unique // 文件名（如：math01）
  frameworkPath   String   // 框架文件路径（xlsx/csv）
  frameworkType   String   // 框架类型：xlsx | csv
  contentPath     String?  // 详情文件路径（md）
  lastModifiedAt  DateTime // 文件最后修改时间
  knowledgePoints KnowledgePoint[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model KnowledgePoint {
  id                String   @id @default(uuid())
  code              String   // 知识点编号（如：1.1.1）
  level1            String   // 一级知识点
  level2            String?  // 二级知识点
  level3            String?  // 三级知识点
  definition        String?  // 定义
  characteristics   String?  // 特性/运算方式
  importanceLevel   String   // A/B/C 重要性级别
  textbookId        String
  textbook          Textbook @relation(fields: [textbookId], references: [id])
  learningRecords   LearningRecord[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([textbookId, code])
}
```

### API 变更

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/textbooks` | 获取教材列表 | 教师 |
| POST | `/api/textbooks/upload` | 上传教材文件 | 教师 |
| DELETE | `/api/textbooks/:id` | 删除教材 | 教师 |
| POST | `/api/textbooks/:id/sync` | 刷新同步教材 | 教师 |
| GET | `/api/textbooks/files` | 获取文件树 | 教师 |

### 依赖前置

- `implement-user-authentication` - 已完成，提供教师角色认证

---

*Created: 2026-03-14*
*Change: implement-textbook-management*
