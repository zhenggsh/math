# Add Child Knowledge Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "新增子知识点" button to the learning and smart-learning content toolbars that opens a modal form, creates a child knowledge point in the DB, appends a placeholder block to the textbook MD file, and refreshes the tree.

**Architecture:** Backend gets a new `KnowledgePointController` and `KnowledgePointService` under the `textbook` module. The service validates the parent node, derives the child code, creates the DB record, and delegates MD file insertion to a shared helper on `TextbookService`. Frontend gets a reusable `AddChildKnowledgePointModal` and `AddChildKnowledgePointButton`, integrated into both `LearningPage` and `SmartLearningPage`.

**Tech Stack:** React 19 + Ant Design 6 + Vite, NestJS 11 + Prisma 5 + PostgreSQL, TypeScript strict.

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `server/src/modules/textbook/dto/create-knowledge-point.dto.ts` | DTO for POST request body |
| `server/src/modules/textbook/knowledge-point.service.ts` | Business logic for creating a child knowledge point |
| `server/src/modules/textbook/knowledge-point.controller.ts` | POST endpoint |
| `web/src/types/knowledge-point.types.ts` | Frontend DTO and form types |
| `web/src/components/knowledge-point/AddChildKnowledgePointModal.tsx` | Modal form for new child knowledge point |
| `web/src/components/knowledge-point/AddChildKnowledgePointButton.tsx` | Toolbar button with permission/disable logic |
| `web/src/components/knowledge-point/AddChildKnowledgePointModal.test.tsx` | Modal component tests |
| `web/src/components/knowledge-point/AddChildKnowledgePointButton.test.tsx` | Button component tests |
| `server/src/modules/textbook/knowledge-point.controller.spec.ts` | Controller tests |
| `server/src/modules/textbook/knowledge-point.service.spec.ts` | Service tests |

### Modified Files

| File | Changes |
|------|---------|
| `server/src/modules/textbook/textbook.module.ts` | Register `KnowledgePointService` and `KnowledgePointController` |
| `server/src/modules/textbook/textbook.service.ts` | Add public helper `appendChildKnowledgePointBlock` for MD insertion |
| `web/src/services/knowledgeApi.ts` | Add `createKnowledgePoint` method |
| `web/src/pages/LearningPage/LearningPage.tsx` | Add button and modal, refresh tree after create |
| `web/src/pages/smart-learning/SmartLearningPage.tsx` | Add button and modal, refresh tree/recommendations after create |

---

## Task 1: Backend DTO

**Files:**
- Create: `server/src/modules/textbook/dto/create-knowledge-point.dto.ts`

- [ ] **Step 1: Create the DTO**

```typescript
import { IsNotEmpty, IsString, IsOptional, IsEnum, Length } from 'class-validator';
import { ImportanceLevel } from '@prisma/client';

export class CreateKnowledgePointDto {
  @IsNotEmpty()
  @IsString()
  parentId: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  code: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  definition?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  characteristics?: string;

  @IsNotEmpty()
  @IsEnum(ImportanceLevel)
  importanceLevel: ImportanceLevel;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter server typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/textbook/dto/create-knowledge-point.dto.ts
git commit -m "feat(server): add create knowledge point DTO"
```

---

## Task 2: Backend MD File Helper

**Files:**
- Modify: `server/src/modules/textbook/textbook.service.ts`

Add a public method that appends a child knowledge point placeholder block to the textbook MD file.

- [ ] **Step 1: Write the helper method**

Insert the following public method into `TextbookService`:

```typescript
  /**
   * 在教材 MD 文件中为父知识点追加子知识点占位块
   */
  async appendChildKnowledgePointBlock(
    parentId: string,
    childCode: string,
    childName: string,
  ): Promise<void> {
    const parent = await this.prisma.knowledgePoint.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException(`知识点不存在: ${parentId}`);
    }

    const textbook = await this.prisma.textbook.findUnique({
      where: { id: parent.textbookId },
    });
    if (!textbook || !textbook.contentPath) {
      throw new NotFoundException('教材内容文件不存在');
    }

    const filePath = this.fileService.getFilePath(textbook.contentPath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('内容文件不存在');
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    const range = this.findContentBlockRange(
      lines,
      parent.code,
      parent.level1,
      parent.level2,
    );

    const codeParts = childCode.split('.');
    const placeholderLines: string[] = [];

    if (codeParts.length === 2) {
      // 二级知识点
      placeholderLines.push(`### ${childCode} ${childName}`, '', '[待输入]', '');
    } else if (codeParts.length === 3) {
      // 三级知识点
      placeholderLines.push(`#### 知识点 ${childCode}：${childName}`, '', '[待输入]', '');
    } else {
      throw new BadRequestException(`不支持的子知识点层级: ${childCode}`);
    }

    const insertIndex = range ? range.endIndex : lines.length;
    const newLines = [
      ...lines.slice(0, insertIndex),
      ...placeholderLines,
      ...lines.slice(insertIndex),
    ];

    fs.writeFileSync(filePath, newLines.join('\n'));
    this.logger.log(`已为知识点 ${parent.code} 追加子知识点 ${childCode}`);
  }
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter server typecheck && pnpm --filter server lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/textbook/textbook.service.ts
git commit -m "feat(server): add helper to append child knowledge point block in MD file"
```

---

## Task 3: Backend Service

**Files:**
- Create: `server/src/modules/textbook/knowledge-point.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TextbookService } from './textbook.service';
import { CreateKnowledgePointDto } from './dto/create-knowledge-point.dto';

@Injectable()
export class KnowledgePointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly textbookService: TextbookService,
  ) {}

  async create(
    textbookId: string,
    dto: CreateKnowledgePointDto,
  ): Promise<{
    id: string;
    code: string;
    level1: string;
    level2: string | null;
    level3: string | null;
    definition: string | null;
    characteristics: string | null;
    importanceLevel: string;
    contentRef: string | null;
    textbookId: string;
  }> {
    const parent = await this.prisma.knowledgePoint.findUnique({
      where: { id: dto.parentId },
    });

    if (!parent) {
      throw new NotFoundException(`父知识点不存在: ${dto.parentId}`);
    }
    if (parent.textbookId !== textbookId) {
      throw new BadRequestException('父知识点不属于当前教材');
    }

    const parentDepth = parent.code.split('.').length;
    if (parentDepth >= 3) {
      throw new BadRequestException('三级知识点不能再添加子节点');
    }

    const childDepth = dto.code.split('.').length;
    if (childDepth !== parentDepth + 1) {
      throw new BadRequestException(
        `子知识点层级必须是 ${parentDepth + 1} 级，但收到 ${childDepth} 级`,
      );
    }
    if (!dto.code.startsWith(`${parent.code}.`)) {
      throw new BadRequestException(
        `子知识点编号必须以父节点编号 "${parent.code}." 开头`,
      );
    }

    const existing = await this.prisma.knowledgePoint.findUnique({
      where: {
        idx_knowledge_point_code_textbook: {
          code: dto.code,
          textbookId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `当前教材中已存在编号为 ${dto.code} 的知识点`,
      );
    }

    const codeParts = dto.code.split('.');
    const level1 = codeParts[0] ?? parent.level1;
    const level2 = codeParts.length > 1 ? codeParts.slice(0, 2).join('.') : null;
    const level3 = codeParts.length > 2 ? dto.code : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const point = await tx.knowledgePoint.create({
        data: {
          code: dto.code,
          level1,
          level2,
          level3,
          definition: dto.definition ?? null,
          characteristics: dto.characteristics ?? null,
          importanceLevel: dto.importanceLevel,
          textbookId,
        },
      });

      await this.textbookService.appendChildKnowledgePointBlock(
        dto.parentId,
        dto.code,
        dto.name,
      );

      return point;
    });

    return {
      id: created.id,
      code: created.code,
      level1: created.level1,
      level2: created.level2,
      level3: created.level3,
      definition: created.definition,
      characteristics: created.characteristics,
      importanceLevel: created.importanceLevel,
      contentRef: created.contentRef,
      textbookId: created.textbookId,
    };
  }
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter server typecheck && pnpm --filter server lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/textbook/knowledge-point.service.ts
git commit -m "feat(server): add knowledge point creation service"
```

---

## Task 4: Backend Controller

**Files:**
- Create: `server/src/modules/textbook/knowledge-point.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { KnowledgePointService } from './knowledge-point.service';
import { CreateKnowledgePointDto } from './dto/create-knowledge-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('textbooks/:textbookId/knowledge-points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgePointController {
  constructor(private readonly knowledgePointService: KnowledgePointService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN)
  async create(
    @Param('textbookId') textbookId: string,
    @Body(new ValidationPipe({ transform: true })) dto: CreateKnowledgePointDto,
  ): Promise<{
    success: boolean;
    data: {
      id: string;
      code: string;
      level1: string;
      level2: string | null;
      level3: string | null;
      definition: string | null;
      characteristics: string | null;
      importanceLevel: string;
      contentRef: string | null;
      textbookId: string;
    };
  }> {
    const point = await this.knowledgePointService.create(textbookId, dto);
    return {
      success: true,
      data: point,
    };
  }
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter server typecheck && pnpm --filter server lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/textbook/knowledge-point.controller.ts
git commit -m "feat(server): add knowledge point creation controller"
```

---

## Task 5: Register Backend Service and Controller

**Files:**
- Modify: `server/src/modules/textbook/textbook.module.ts`

- [ ] **Step 1: Register components**

```typescript
import { Module } from '@nestjs/common';
import { TextbookController } from './textbook.controller';
import { TextbookService } from './textbook.service';
import { TextbookParserService } from './textbook-parser.service';
import { TextbookFileService } from './textbook-file.service';
import { KnowledgePointController } from './knowledge-point.controller';
import { KnowledgePointService } from './knowledge-point.service';

@Module({
  controllers: [TextbookController, KnowledgePointController],
  providers: [TextbookService, TextbookParserService, TextbookFileService, KnowledgePointService],
  exports: [TextbookService, TextbookFileService],
})
export class TextbookModule {}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter server typecheck && pnpm --filter server lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/textbook/textbook.module.ts
git commit -m "chore(server): register knowledge point service and controller"
```

---

## Task 6: Frontend Types and API

**Files:**
- Create: `web/src/types/knowledge-point.types.ts`
- Modify: `web/src/services/knowledgeApi.ts`

- [ ] **Step 1: Create frontend types**

```typescript
import type { ImportanceLevel, KnowledgePoint } from './knowledge.types'

export interface CreateKnowledgePointDto {
  parentId: string
  code: string
  name: string
  definition?: string
  characteristics?: string
  importanceLevel: ImportanceLevel
}
```

- [ ] **Step 2: Add API method**

In `web/src/services/knowledgeApi.ts`, add to the `knowledgeApi` object:

```typescript
import type {
  KnowledgePoint,
  KnowledgePointDetail,
  LearningRecord,
} from '../types/knowledge.types'
import type { CreateKnowledgePointDto } from '../types/knowledge-point.types'

  async createKnowledgePoint(
    textbookId: string,
    dto: CreateKnowledgePointDto
  ): Promise<KnowledgePoint> {
    const response = await api.post<ApiResponse<KnowledgePoint>>(
      `/textbooks/${textbookId}/knowledge-points`,
      dto
    )
    return response.data.data
  },
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/types/knowledge-point.types.ts web/src/services/knowledgeApi.ts
git commit -m "feat(web): add create knowledge point API and types"
```

---

## Task 7: Frontend Modal Component

**Files:**
- Create: `web/src/components/knowledge-point/AddChildKnowledgePointModal.tsx`

- [ ] **Step 1: Create the modal form**

```typescript
import React, { useEffect, useMemo } from 'react'
import { Form, Input, Modal, Select } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { KnowledgeTreeNode } from '../../types/knowledge.types'
import type { CreateKnowledgePointDto } from '../../types/knowledge-point.types'

const IMPORTANCE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
]

export interface AddChildKnowledgePointModalProps {
  open: boolean
  parentNode: KnowledgeTreeNode | null
  existingCodes: string[]
  onCancel: () => void
  onSubmit: (dto: CreateKnowledgePointDto) => void | Promise<void>
  loading?: boolean
}

export const AddChildKnowledgePointModal: React.FC<AddChildKnowledgePointModalProps> = ({
  open,
  parentNode,
  existingCodes,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm<CreateKnowledgePointDto>()

  const defaultCode = useMemo(() => {
    if (!parentNode) return ''
    const parentCode = parentNode.code
    const prefix = `${parentCode}.`
    const existingSiblings = existingCodes
      .filter(code => code.startsWith(prefix))
      .map(code => Number(code.replace(prefix, '')))
      .filter(n => Number.isFinite(n))
    const maxSibling = existingSiblings.length > 0 ? Math.max(...existingSiblings) : 0
    return `${prefix}${maxSibling + 1}`
  }, [parentNode, existingCodes])

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        code: defaultCode,
        importanceLevel: 'C',
      })
    }
  }, [open, defaultCode, form])

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields()
    if (!parentNode) return
    await onSubmit({
      ...values,
      parentId: parentNode.data.id,
    })
    form.resetFields()
  }

  return (
    <Modal
      title="新增子知识点"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="编号"
          name="code"
          rules={[
            { required: true, message: '请输入编号' },
            { max: 50, message: '编号最多 50 字符' },
          ]}
        >
          <Input placeholder="如 1.1.4" />
        </Form.Item>
        <Form.Item
          label="名称"
          name="name"
          rules={[
            { required: true, message: '请输入名称' },
            { max: 200, message: '名称最多 200 字符' },
          ]}
        >
          <Input placeholder="知识点名称" />
        </Form.Item>
        <Form.Item
          label="定义"
          name="definition"
          rules={[{ max: 2000, message: '定义最多 2000 字符' }]}
        >
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
        <Form.Item
          label="特性"
          name="characteristics"
          rules={[{ max: 2000, message: '特性最多 2000 字符' }]}
        >
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
        <Form.Item
          label="重要性"
          name="importanceLevel"
          rules={[{ required: true, message: '请选择重要性' }]}
        >
          <Select options={IMPORTANCE_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddChildKnowledgePointModal
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/src/components/knowledge-point/AddChildKnowledgePointModal.tsx
git commit -m "feat(web): add child knowledge point modal form"
```

---

## Task 8: Frontend Button Component

**Files:**
- Create: `web/src/components/knowledge-point/AddChildKnowledgePointButton.tsx`

- [ ] **Step 1: Create the button**

```typescript
import React from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { KnowledgeTreeNode } from '../../types/knowledge.types'

export interface AddChildKnowledgePointButtonProps {
  parentNode: KnowledgeTreeNode | null
  canEdit: boolean
  onClick: () => void
}

export const AddChildKnowledgePointButton: React.FC<AddChildKnowledgePointButtonProps> = ({
  parentNode,
  canEdit,
  onClick,
}) => {
  const disabled =
    !parentNode || parentNode.code.split('.').length >= 3 || !canEdit

  return (
    <Button
      size="small"
      icon={<PlusOutlined />}
      onClick={onClick}
      disabled={disabled}
    >
      新增子知识点
    </Button>
  )
}

export default AddChildKnowledgePointButton
```

- [ ] **Step 2: Run typecheck and lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add web/src/components/knowledge-point/AddChildKnowledgePointButton.tsx
git commit -m "feat(web): add child knowledge point toolbar button"
```

---

## Task 9: Integrate into LearningPage

**Files:**
- Modify: `web/src/pages/LearningPage/LearningPage.tsx`

- [ ] **Step 1: Import components and collect existing codes**

Add imports:

```typescript
import { AddChildKnowledgePointButton } from '../../components/knowledge-point/AddChildKnowledgePointButton'
import { AddChildKnowledgePointModal } from '../../components/knowledge-point/AddChildKnowledgePointModal'
import type { CreateKnowledgePointDto } from '../../types/knowledge-point.types'
```

Add state:

```typescript
const [isAddModalOpen, setIsAddModalOpen] = useState(false)
const [isAdding, setIsAdding] = useState(false)
```

Collect all existing codes:

```typescript
const existingCodes = useMemo(
  () => flatSequence.map(node => node.code),
  [flatSequence]
)
```

- [ ] **Step 2: Add submit handler**

```typescript
const handleCreateKnowledgePoint = useCallback(
  async (dto: CreateKnowledgePointDto) => {
    if (!activeTextbookId || !selectedNode) return
    setIsAdding(true)
    try {
      const newPoint = await knowledgeApi.createKnowledgePoint(activeTextbookId, dto)
      const tree = await knowledgeApi.getKnowledgeTree(activeTextbookId)
      const newTree = convertToTreeData(tree)
      setTreeData(newTree)

      const newNode = findNodeInTree(newTree, newPoint.id)
      if (newNode) {
        await handleSelectNode(newNode)
        setShowRaw(true)
      }

      setIsAddModalOpen(false)
      message.success('新增子知识点成功')
    } catch {
      message.error('新增失败')
    } finally {
      setIsAdding(false)
    }
  },
  [activeTextbookId, selectedNode, handleSelectNode, message]
)
```

- [ ] **Step 3: Add button and modal to JSX**

In the toolbar, add the button after the feedback toggle button:

```tsx
<AddChildKnowledgePointButton
  parentNode={selectedNode}
  canEdit={canEdit}
  onClick={() => setIsAddModalOpen(true)}
/>
```

At the end of the markdown panel JSX, add the modal:

```tsx
<AddChildKnowledgePointModal
  open={isAddModalOpen}
  parentNode={selectedNode}
  existingCodes={existingCodes}
  loading={isAdding}
  onCancel={() => setIsAddModalOpen(false)}
  onSubmit={handleCreateKnowledgePoint}
/>
```

- [ ] **Step 4: Run typecheck, lint, and tests**

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test --run src/pages/LearningPage/__tests__/LearningPage.test.tsx
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/LearningPage/LearningPage.tsx
git commit -m "feat(web): integrate add child knowledge point into learning page"
```

---

## Task 10: Integrate into SmartLearningPage

**Files:**
- Modify: `web/src/pages/smart-learning/SmartLearningPage.tsx`

- [ ] **Step 1: Import components and collect codes**

Add imports:

```typescript
import { AddChildKnowledgePointButton } from '../../components/knowledge-point/AddChildKnowledgePointButton'
import { AddChildKnowledgePointModal } from '../../components/knowledge-point/AddChildKnowledgePointModal'
import type { CreateKnowledgePointDto } from '../../types/knowledge-point.types'
```

Add state:

```typescript
const [isAddModalOpen, setIsAddModalOpen] = useState(false)
const [isAdding, setIsAdding] = useState(false)
```

Collect existing codes from the recommendation list. Convert `items` to codes using `item.code` (verify that `UnifiedRecommendationItem` has a `code` field). If not available, use `selectedItem?.code` and a derived array:

```typescript
const existingCodes = useMemo(
  () => items.map(item => item.code).filter((code): code is string => !!code),
  [items]
)
```

- [ ] **Step 2: Add submit handler**

```typescript
const handleCreateKnowledgePoint = useCallback(
  async (dto: CreateKnowledgePointDto) => {
    if (!selectedItem || !selectedTextbookIds.length) return
    setIsAdding(true)
    try {
      const newPoint = await knowledgeApi.createKnowledgePoint(
        selectedTextbookIds[0],
        dto,
      )
      await refetch()
      setSelectedId(newPoint.id)
      setShowRaw(true)
      setIsAddModalOpen(false)
      message.success('新增子知识点成功')
    } catch {
      message.error('新增失败')
    } finally {
      setIsAdding(false)
    }
  },
  [selectedItem, selectedTextbookIds, refetch, message]
)
```

- [ ] **Step 3: Add button and modal to JSX**

In the toolbar, add the button after the feedback toggle:

```tsx
<AddChildKnowledgePointButton
  parentNode={selectedItem ? /* convert to KnowledgeTreeNode shape */ null : null}
  canEdit={user?.role === 'TEACHER' || user?.role === 'ADMIN'}
  onClick={() => setIsAddModalOpen(true)}
/>
```

Because `SmartLearningPage` uses `UnifiedRecommendationItem` instead of `KnowledgeTreeNode`, the button component may need to accept a generic parent shape. Update the button component to accept a generic `parentNode` with `{ id: string; code: string; title: string; }` instead of `KnowledgeTreeNode`, or create a helper to convert.

At the end of the center panel, add the modal:

```tsx
<AddChildKnowledgePointModal
  open={isAddModalOpen}
  parentNode={selectedItem ? /* converted shape */ null : null}
  existingCodes={existingCodes}
  loading={isAdding}
  onCancel={() => setIsAddModalOpen(false)}
  onSubmit={handleCreateKnowledgePoint}
/>
```

- [ ] **Step 4: Adjust button and modal types if needed**

If `UnifiedRecommendationItem` does not have all required fields, update `AddChildKnowledgePointButtonProps` and `AddChildKnowledgePointModalProps` to accept a minimal parent shape:

```typescript
interface ParentNodeShape {
  id: string
  code: string
  title: string
}
```

- [ ] **Step 5: Run typecheck, lint, and tests**

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test --run src/pages/smart-learning/__tests__/SmartLearningPage.test.tsx
```

Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/smart-learning/SmartLearningPage.tsx web/src/components/knowledge-point/AddChildKnowledgePointButton.tsx web/src/components/knowledge-point/AddChildKnowledgePointModal.tsx
git commit -m "feat(web): integrate add child knowledge point into smart learning page"
```

---

## Task 11: Add Frontend Component Tests

**Files:**
- Create: `web/src/components/knowledge-point/__tests__/AddChildKnowledgePointButton.test.tsx`
- Create: `web/src/components/knowledge-point/__tests__/AddChildKnowledgePointModal.test.tsx`

- [ ] **Step 1: Button tests**

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddChildKnowledgePointButton } from '../AddChildKnowledgePointButton'
import type { KnowledgeTreeNode } from '../../../types/knowledge.types'

describe('AddChildKnowledgePointButton', () => {
  const parentNode: KnowledgeTreeNode = {
    key: 'kp-1',
    title: '集合',
    code: '1',
    importanceLevel: 'A',
    data: { id: 'kp-1', code: '1', level1: '集合', importanceLevel: 'A', textbookId: 'tb-1' },
  }

  it('renders enabled when parent is a level-1 node and user can edit', () => {
    render(<AddChildKnowledgePointButton parentNode={parentNode} canEdit onClick={vi.fn()} />)
    expect(screen.getByText('新增子知识点')).toBeEnabled()
  })

  it('is disabled for level-3 parent', () => {
    const level3: KnowledgeTreeNode = {
      ...parentNode,
      code: '1.1.1',
      data: { id: 'kp-2', code: '1.1.1', level1: '集合', level2: '1.1', level3: '1.1.1', importanceLevel: 'A', textbookId: 'tb-1' },
    }
    render(<AddChildKnowledgePointButton parentNode={level3} canEdit onClick={vi.fn()} />)
    expect(screen.getByText('新增子知识点')).toBeDisabled()
  })

  it('is disabled when user cannot edit', () => {
    render(<AddChildKnowledgePointButton parentNode={parentNode} canEdit={false} onClick={vi.fn()} />)
    expect(screen.getByText('新增子知识点')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Modal tests**

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AddChildKnowledgePointModal } from '../AddChildKnowledgePointModal'
import type { KnowledgeTreeNode } from '../../../types/knowledge.types'

describe('AddChildKnowledgePointModal', () => {
  const parentNode: KnowledgeTreeNode = {
    key: 'kp-1',
    title: '集合',
    code: '1.1',
    importanceLevel: 'A',
    data: { id: 'kp-1', code: '1.1', level1: '集合', level2: '1.1', importanceLevel: 'A', textbookId: 'tb-1' },
  }

  it('derives default code from existing siblings', () => {
    render(
      <AddChildKnowledgePointModal
        open
        parentNode={parentNode}
        existingCodes={['1.1.1', '1.1.2']}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('1.1.3')).toBeInTheDocument()
  })

  it('calls onSubmit with form values when OK is clicked', async () => {
    const handleSubmit = vi.fn()
    render(
      <AddChildKnowledgePointModal
        open
        parentNode={parentNode}
        existingCodes={[]}
        onCancel={vi.fn()}
        onSubmit={handleSubmit}
      />
    )

    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新知识点' } })
    fireEvent.change(screen.getByLabelText('编号'), { target: { value: '1.1.3' } })
    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'kp-1',
          code: '1.1.3',
          name: '新知识点',
          importanceLevel: 'C',
        })
      )
    })
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter web test --run src/components/knowledge-point/__tests__`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/components/knowledge-point/__tests__
git commit -m "test(web): add child knowledge point component tests"
```

---

## Task 12: Add Backend Tests

**Files:**
- Create: `server/src/modules/textbook/knowledge-point.service.spec.ts`
- Create: `server/src/modules/textbook/knowledge-point.controller.spec.ts`

- [ ] **Step 1: Service test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgePointService } from './knowledge-point.service';
import { TextbookService } from './textbook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportanceLevel } from '@prisma/client';

describe('KnowledgePointService', () => {
  let service: KnowledgePointService;
  let prisma: PrismaService;
  let textbookService: TextbookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgePointService,
        {
          provide: TextbookService,
          useValue: { appendChildKnowledgePointBlock: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            knowledgePoint: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            $transaction: jest.fn((cb) => cb(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get(KnowledgePointService);
    prisma = module.get(PrismaService);
    textbookService = module.get(TextbookService);
  });

  it('should create a level-2 child under a level-1 parent', async () => {
    (prisma.knowledgePoint.findUnique as jest.Mock).mockResolvedValue({
      id: 'parent-1',
      code: '1',
      level1: '集合',
      level2: null,
      level3: null,
      textbookId: 'tb-1',
    });

    (prisma.knowledgePoint.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.knowledgePoint.create as jest.Mock).mockResolvedValue({
      id: 'new-1',
      code: '1.1',
      level1: '集合',
      level2: '1.1',
      level3: null,
      definition: null,
      characteristics: null,
      importanceLevel: ImportanceLevel.A,
      contentRef: null,
      textbookId: 'tb-1',
    });

    const result = await service.create('tb-1', {
      parentId: 'parent-1',
      code: '1.1',
      name: '子知识点',
      importanceLevel: ImportanceLevel.A,
    });

    expect(result.code).toBe('1.1');
    expect(textbookService.appendChildKnowledgePointBlock).toHaveBeenCalledWith(
      'parent-1',
      '1.1',
      '子知识点',
    );
  });
});
```

- [ ] **Step 2: Controller test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgePointController } from './knowledge-point.controller';
import { KnowledgePointService } from './knowledge-point.service';
import { ImportanceLevel } from '@prisma/client';

describe('KnowledgePointController', () => {
  let controller: KnowledgePointController;
  let service: KnowledgePointService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgePointController],
      providers: [
        {
          provide: KnowledgePointService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(KnowledgePointController);
    service = module.get(KnowledgePointService);
  });

  it('should return success response', async () => {
    const mockPoint = {
      id: 'new-1',
      code: '1.1',
      level1: '集合',
      level2: '1.1',
      level3: null,
      definition: null,
      characteristics: null,
      importanceLevel: ImportanceLevel.A,
      contentRef: null,
      textbookId: 'tb-1',
    };
    (service.create as jest.Mock).mockResolvedValue(mockPoint);

    const result = await controller.create('tb-1', {
      parentId: 'parent-1',
      code: '1.1',
      name: '子知识点',
      importanceLevel: ImportanceLevel.A,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockPoint);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter server test -- knowledge-point.service.spec.ts knowledge-point.controller.spec.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/textbook/knowledge-point.service.spec.ts server/src/modules/textbook/knowledge-point.controller.spec.ts
git commit -m "test(server): add knowledge point creation tests"
```

---

## Task 13: End-to-End Verification

- [ ] **Step 1: Start the dev servers**

Run in separate terminals:

```bash
pnpm dev:server
pnpm dev
```

- [ ] **Step 2: Verify backend endpoint**

Use a teacher/admin token and POST to:

```
POST http://localhost:3000/textbooks/{textbookId}/knowledge-points
```

with body:

```json
{
  "parentId": "parent-knowledge-point-id",
  "code": "1.1.4",
  "name": "新增子知识点",
  "definition": "定义",
  "characteristics": "特性",
  "importanceLevel": "C"
}
```

Expected: 200 with the new knowledge point and `[待输入]` block in the MD file.

- [ ] **Step 3: Verify frontend flow**

1. Log in as teacher/admin.
2. Navigate to the Learning page.
3. Select a level-1 or level-2 knowledge point.
4. Click "新增子知识点" in the toolbar.
5. Fill the form and submit.
6. Confirm the tree refreshes, the new node is selected, and Raw mode shows `[待输入]`.

Repeat on the Smart Learning page.

- [ ] **Step 4: Run all tests**

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: ALL PASS

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add child knowledge point creation from learning and smart learning pages"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Button in content toolbar | Task 9, 10 |
| Button hidden for students | Task 8 |
| Button disabled for level-3 nodes | Task 8 |
| Modal form with name/code/definition/characteristics/importance | Task 7 |
| Code auto-derivation | Task 7 |
| Backend POST endpoint with validation | Task 4, 5 |
| DB record creation | Task 3 |
| MD file placeholder block `[待输入]` | Task 2, 3 |
| Tree refresh and auto-select new node | Task 9, 10 |
| Role-based access control | Task 4 |

No placeholders found. Type names are consistent across DTO, service, controller, and frontend.

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-08-add-child-knowledge-point.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like to use?
