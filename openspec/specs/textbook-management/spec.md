# Spec: Textbook Management

## Overview

教材管理能力，提供教材文件的列表查询、上传、删除和刷新同步功能。仅限教师角色访问。

## Requirements

### R1: 教材列表查询

**R1.1** 系统必须提供教材列表查询接口

**R1.2** 返回字段必须包含：

```typescript
interface TextbookListItem {
  id: string;                 // 教材 ID
  name: string;               // 教材名称（如：高中数学必修一）
  fileName: string;           // 文件名前缀（如：math01）
  frameworkType: 'xlsx' | 'csv';  // 框架文件类型
  hasContent: boolean;        // 是否有配套的 md 文件
  knowledgePointCount: number; // 知识点数量
  lastModifiedAt: string;     // 最后修改时间（ISO 8601）
  syncStatus: 'synced' | 'pending' | 'error';  // 同步状态
  createdAt: string;          // 创建时间
}
```

**R1.3** 列表必须按 `createdAt` 倒序排列

**R1.4** 系统必须支持按教材名称搜索（模糊匹配）

### R2: 文件上传功能

**R2.1** 系统必须支持上传教材文件对

**R2.2** 上传必须接受以下文件组合之一：
- 框架文件（.xlsx 或 .csv）+ 详情文件（.md）
- 仅框架文件（.xlsx 或 .csv）

**R2.3** 上传文件必须满足以下限制：

| 限制项 | 值 | 说明 |
|--------|-----|------|
| 单文件大小 | ≤ 10MB | 防止过大文件 |
| 文件名 | 不能以 `.`、`_`、`tmp` 开头 | 符合 iksm 目录规范 |
| 文件扩展名 | .xlsx, .csv, .md | 仅支持这些格式 |
| 同名文件 | 不允许 | 文件名前缀必须唯一 |

**R2.4** 上传流程：
1. 验证文件类型和大小
2. 保存到临时目录
3. 解析框架文件验证格式
4. 移动到 `iksm/` 目录
5. 创建/更新数据库记录
6. 同步知识点到数据库

**R2.5** 上传成功后必须返回：

```typescript
interface UploadResult {
  success: boolean;
  textbookId: string;
  fileName: string;
  knowledgePointCount: number;
  message: string;
}
```

### R3: 文件删除功能

**R3.1** 系统必须支持删除教材

**R3.2** 删除操作必须：
1. 删除数据库中的教材记录（级联删除关联的知识点）
2. 删除 `iksm/` 目录下的框架文件
3. 删除 `iksm/` 目录下的详情文件（如果存在）

**R3.3** 删除前必须确认教材未被学习记录引用
- 如果有学习记录，提示用户并拒绝删除
- 或者提供强制删除选项（同时删除学习记录）

### R4: 刷新同步功能

**R4.1** 系统必须提供刷新同步接口，检测文件系统变更

**R4.2** 同步必须检测以下变更类型：

| 变更类型 | 检测方式 | 处理动作 |
|----------|----------|----------|
| 新增文件 | 文件存在但数据库无记录 | 创建教材记录，解析入库 |
| 修改文件 | 文件修改时间 > 数据库记录 | 更新教材记录，重新解析 |
| 删除文件 | 数据库有记录但文件不存在 | 标记为缺失或删除记录 |

**R4.3** 同步结果必须返回：

```typescript
interface SyncResult {
  success: boolean;
  scannedFiles: number;
  added: TextbookListItem[];
  updated: TextbookListItem[];
  removed: string[];  // 文件名列表
  errors: Array<{
    fileName: string;
    error: string;
  }>;
}
```

**R4.4** 同步操作必须是幂等的，多次执行结果一致

### R5: 文件树功能

**R5.1** 系统必须提供 `iksm/` 目录的文件树视图

**R5.2** 文件树必须按以下规则组织：
- 按文件类型分组：框架文件（xlsx/csv）、详情文件（md）
- 按文件名前缀分组：相同前缀的文件显示在一起

**R5.3** 文件树节点必须包含：

```typescript
interface FileTreeNode {
  key: string;           // 唯一标识
  title: string;         // 显示名称
  type: 'folder' | 'xlsx' | 'csv' | 'md';
  fileName?: string;     // 文件名前缀
  path?: string;         // 完整路径
  children?: FileTreeNode[];
  isPaired?: boolean;    // 是否成对（框架+详情）
}
```

### R6: 用户界面要求

**R6.1** 界面必须采用双栏布局：
- 左侧：文件树（宽度 280px，可折叠）
- 右侧：教材列表表格（自适应宽度）

**R6.2** 教材列表表格必须包含以下列：

| 列名 | 说明 | 排序 |
|------|------|------|
| 教材名称 | 显示名称 + 文件名 | ✅ |
| 文件类型 | xlsx / csv 标签 | ✅ |
| 知识点数 | 数量显示 | ✅ |
| 同步状态 | 同步/待同步/错误 状态标签 | ❌ |
| 最后修改 | 相对时间（如：2小时前）| ✅ |
| 操作 | 同步、删除按钮 | ❌ |

**R6.3** 必须提供上传按钮，点击后打开上传对话框：
- 支持点击选择文件
- 支持拖拽文件到区域
- 显示上传进度
- 验证文件格式提示

**R6.4** 必须提供刷新按钮：
- 触发文件系统扫描和同步
- 显示同步进度
- 完成后显示结果摘要

## Interface

### TextbookController

```typescript
@Controller('textbooks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TextbookController {
  @Get()
  findAll(@Query() query: QueryTextbooksDto): Promise<PaginatedResult<TextbookListItem>>;

  @Post('upload')
  @UseInterceptors(FileInterceptor('files'))
  upload(@UploadedFiles() files: Express.Multer.File[]): Promise<UploadResult>;

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void>;

  @Post(':id/sync')
  sync(@Param('id') id: string): Promise<SyncResult>;

  @Get('files')
  getFileTree(): Promise<FileTreeNode[]>;

  @Post('sync-all')
  syncAll(): Promise<SyncResult>;
}
```

### DTOs

```typescript
// Query DTO
class QueryTextbooksDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'name', 'knowledgePointCount'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// Response DTOs
class TextbookResponseDto {
  id: string;
  name: string;
  fileName: string;
  frameworkType: 'xlsx' | 'csv';
  hasContent: boolean;
  knowledgePointCount: number;
  lastModifiedAt: string;
  syncStatus: 'synced' | 'pending' | 'error';
  createdAt: string;
}
```

## Test Cases

### T1: 列表查询测试

**T1.1** 正常查询返回教材列表，包含所有必需字段

**T1.2** 按名称搜索，返回匹配结果

**T1.3** 分页查询，正确返回分页信息

**T1.4** 排序功能，按不同字段排序正确

### T2: 上传功能测试

**T2.1** 上传有效的 xlsx + md 文件对，成功创建教材

**T2.2** 上传仅 xlsx 文件，成功创建教材（hasContent = false）

**T2.3** 上传同名文件，返回文件名冲突错误

**T2.4** 上传超过大小限制的文件，返回文件过大错误

**T2.5** 上传无效格式文件，返回格式错误

### T3: 删除功能测试

**T3.1** 删除无学习记录的教材，成功删除文件和数据库记录

**T3.2** 删除有学习记录的教材，提示拒绝或确认删除

**T3.3** 删除不存在的教材，返回 404 错误

### T4: 同步功能测试

**T4.1** 同步新增文件，创建新教材记录

**T4.2** 同步修改文件，更新教材和知识点

**T4.3** 同步删除文件，标记或删除记录

**T4.4** 多次同步同一文件，结果一致（幂等性）

### T5: 权限测试

**T5.1** 教师角色可以访问所有接口

**T5.2** 学生角色访问返回 403 禁止

**T5.3** 未认证用户访问返回 401 未授权

---

*Version: 1.0*
*Capability: textbook-management*
