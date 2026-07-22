# Spec: Textbook Knowledge Point Expansion

## Overview

教材详情页与知识点扩充能力。教师可以查看单本教材的元数据和知识点列表，并通过上传新的 xlsx + md 文件向现有教材追加知识点。

## Requirements

### Requirement: 教材详情页展示

系统必须提供教材详情页，展示指定教材的元数据和知识点列表。

#### Scenario: 进入教材详情页
- **WHEN** 教师从教材列表点击「详情」按钮
- **THEN** 系统导航到 `/teacher/textbooks/:id`
- **AND** 页面显示教材名称、文件名、框架类型、知识点数量、内容文件状态、最后修改时间
- **AND** 页面显示该教材下的知识点列表，包含编号、名称、一级/二级/三级知识点、重要性级别

### Requirement: 知识点扩充入口

教材详情页必须提供「扩充知识点」入口，允许教师上传新的 xlsx 和 md 文件。

#### Scenario: 打开扩充弹窗
- **WHEN** 教师在教材详情页点击「扩充知识点」按钮
- **THEN** 系统弹出上传弹窗
- **AND** 弹窗要求上传框架文件（.xlsx）和内容文件（.md）
- **AND** 未选择文件时确认按钮禁用

### Requirement: 扩充文件格式校验

系统必须校验上传的扩充文件格式。

#### Scenario: 上传非 xlsx 框架文件
- **WHEN** 教师选择的框架文件不是 .xlsx 格式
- **THEN** 系统拒绝上传并提示框架文件必须是 .xlsx 格式

#### Scenario: 上传非 md 内容文件
- **WHEN** 教师选择的内容文件不是 .md 格式
- **THEN** 系统拒绝上传并提示内容文件必须是 .md 格式

### Requirement: 知识点编号冲突检测

系统必须在写入前检测新知识点编号是否与现有教材知识点编号冲突。

#### Scenario: 存在编号冲突
- **WHEN** 上传的 xlsx 中包含已存在的知识点编号
- **THEN** 系统返回冲突错误，提示具体冲突的编号
- **AND** 不修改原教材文件和数据库

#### Scenario: 无编号冲突
- **WHEN** 上传的 xlsx 中所有知识点编号均不存在于当前教材
- **THEN** 系统继续处理扩充流程

### Requirement: 扩充知识点写入数据库

系统必须将新知识点写入数据库，并更新教材的最后修改时间。

#### Scenario: 成功扩充
- **WHEN** 上传的文件通过所有校验且无冲突
- **THEN** 系统在数据库中创建新的知识点记录
- **AND** 更新教材的 `lastModifiedAt` 字段
- **AND** 返回成功消息和新增的知识点编号列表

### Requirement: 追加到原 xlsx 文件

系统必须将新知识点行追加到原教材框架文件末尾。

#### Scenario: 成功追加 xlsx
- **WHEN** 扩充成功完成
- **THEN** 原 xlsx 文件末尾新增对应知识点行
- **AND** 原文件中的现有知识点数据保持不变

### Requirement: 追加到原 md 文件

系统必须将新知识点内容块追加到原教材内容文件中合适的位置。

#### Scenario: 三级知识点插入父级 block
- **WHEN** 新知识点为三级知识点且其父级二级知识点已存在
- **THEN** 系统将新知识点内容块插入到父级二级 block 内
- **AND** 保持原文件中的现有内容不变

#### Scenario: 无父级 block 时追加到末尾
- **WHEN** 新知识点找不到对应父级 block
- **THEN** 系统将新知识点内容块追加到 md 文件末尾

### Requirement: 并发安全

系统必须保证同一教材的并发扩充操作串行执行。

#### Scenario: 同时发起两个扩充请求
- **WHEN** 两个请求同时尝试扩充同一本教材
- **THEN** 系统通过 PostgreSQL advisory lock 串行处理
- **AND** 后完成的请求能够正确检测到先完成请求写入的新编号

### Requirement: 权限控制

只有教师或管理员可以访问教材详情页和扩充接口。

#### Scenario: 学生访问详情页
- **WHEN** 学生角色访问 `/teacher/textbooks/:id`
- **THEN** 系统返回 403 禁止访问

#### Scenario: 未认证用户访问扩充接口
- **WHEN** 未认证用户调用 `POST /textbooks/:id/expand`
- **THEN** 系统返回 401 未授权

## Interface

### TextbookController

```typescript
@Controller('textbooks')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TextbookController {
  @Get(':id')
  findOne(@Param('id') id: string): Promise<TextbookDetail>;

  @Post(':id/expand')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'framework', maxCount: 1 },
    { name: 'content', maxCount: 1 },
  ]))
  expand(
    @Param('id') id: string,
    @UploadedFiles() files: { framework?: Express.Multer.File[]; content?: Express.Multer.File[] },
  ): Promise<ExpandKnowledgePointsResponse>;
}
```

### DTOs

```typescript
interface TextbookDetail {
  id: string;
  name: string;
  fileName: string;
  frameworkType: 'xlsx' | 'csv';
  hasContent: boolean;
  knowledgePointCount: number;
  lastModifiedAt: string;
  createdAt: string;
}

interface ExpandKnowledgePointsResponse {
  success: boolean;
  message: string;
  data?: {
    addedCodes: string[];
    count: number;
  };
}
```

## Test Cases

### T1: 详情页渲染
- **T1.1** 正常渲染教材名称和知识点列表
- **T1.2** 加载中显示 loading 状态
- **T1.3** 教材不存在时显示错误提示

### T2: 扩充弹窗
- **T2.1** 打开弹窗显示文件上传区域
- **T2.2** 未选择文件时确认按钮禁用
- **T2.3** 点击取消关闭弹窗

### T3: xlsx 追加
- **T3.1** 新行正确追加到原 xlsx 末尾
- **T3.2** 原文件中的现有行保持不变

### T4: md 追加
- **T4.1** 三级知识点插入到父级二级 block 内
- **T4.2** 父级不存在时追加到文件末尾

### T5: 冲突检测
- **T5.1** 上传已存在编号返回 409 冲突
- **T5.2** 并发请求下后完成请求正确检测到冲突

### T6: 权限
- **T6.1** 教师可以访问详情页和扩充接口
- **T6.2** 学生访问返回 403
- **T6.3** 未认证用户访问返回 401

---

*Version: 1.0*
*Capability: textbook-knowledge-point-expansion*
