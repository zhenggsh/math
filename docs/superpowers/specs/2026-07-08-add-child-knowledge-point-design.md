# Add Child Knowledge Point Design

**Date:** 2026-07-08
**Scope:** 在学习页面和智能学习页面中支持为当前选中的知识点新增子知识点
**Approach:** 右侧内容工具栏按钮 + Modal 表单

---

## Overview

在学习页面和智能学习页面中，为当前选中的知识点增加一个“新增子知识点”入口。点击后弹出 Modal 表单，填写子知识点的名称、编号、定义、特性和重要性，保存后：

1. 在数据库 `knowledge_points` 表中创建新记录。
2. 在对应教材的 `.md` 内容文件中追加一个占位内容块，内容为 `#### 知识点 {code}：{name}\n\n[待输入]`。
3. 左侧知识树自动刷新，新节点被选中并进入编辑状态（Raw 模式）。

---

## 1. UI Placement

### 1.1 按钮位置

在内容工具栏右侧，与“隐藏概要区”、“隐藏反馈区”、“导出”按钮并列：

```
[Preview | Raw]   [隐藏概要区] [隐藏反馈区] [新增子知识点] [<] [>] [导出]
```

- 按钮仅对 **教师/管理员** 显示（`user.role === 'TEACHER' || user.role === 'ADMIN'`）。
- 当前未选中知识点，或选中节点为三级节点时，按钮禁用。
- 按钮使用 Ant Design `Button`，`size="small"`。

### 1.2 禁用规则

| 场景 | 按钮状态 | 说明 |
|------|----------|------|
| 未选中知识点 | 禁用 | 无父节点可挂靠 |
| 选中一级节点 | 可用 | 可新增二级节点 |
| 选中二级节点 | 可用 | 可新增三级节点 |
| 选中三级节点 | 禁用 | 限制最大层级为 3 |
| 当前用户为学生 | 不显示 | 无新增权限 |

---

## 2. Modal Form

### 2.1 表单字段

使用 Ant Design `Modal` + `Form`：

| 字段 | 组件 | 必填 | 默认值 | 校验规则 |
|------|------|------|--------|----------|
| 名称 | `Input` | 是 | - | 非空，最多 200 字符 |
| 编号 | `Input` | 是 | 自动推导 | 非空，符合 code 格式（如 `1.1.4`），在当前教材内唯一 |
| 定义 | `TextArea` | 否 | - | 最多 2000 字符 |
| 特性 | `TextArea` | 否 | - | 最多 2000 字符 |
| 重要性 | `Select` | 是 | C | A / B / C |

### 2.2 编号自动推导

根据父节点 code 和当前已有兄弟节点推导下一个可用编号：

- 父节点为 `1`（一级）：已有二级节点 `1.1`、`1.2`，则默认 `1.3`。
- 父节点为 `1.1`（二级）：已有三级节点 `1.1.1`、`1.1.2`，则默认 `1.1.3`。
- 推导时跳过已有编号，取下一个连续整数。
- 用户可手动修改，但需校验在当前教材内的唯一性。

### 2.3 提交按钮

- 表单验证通过且后端返回成功前，显示 `loading` 状态。
- 提交成功后关闭 Modal，并提示“新增成功”。

---

## 3. Backend API

### 3.1 新增端点

```
POST /api/textbooks/:textbookId/knowledge-points
```

**请求体（CreateKnowledgePointDto）：**

```typescript
interface CreateKnowledgePointDto {
  parentId: string;          // 父节点 ID
  code: string;              // 如 "1.1.4"
  level1: string;           // 继承父节点 level1
  level2?: string;          // 继承父节点 level2（若为新增三级节点）
  level3?: string;          // 新增三级节点时填写
  name: string;              // 知识点名称（用于生成 md 标题）
  definition?: string;
  characteristics?: string;
  importanceLevel: 'A' | 'B' | 'C';
}
```

**响应：**

```typescript
{
  success: true;
  data: KnowledgePoint;  // 新创建的知识点
}
```

### 3.2 服务端处理流程

1. **权限校验**：使用 `JwtAuthGuard` + `RolesGuard`，仅允许 `TEACHER` / `ADMIN`。
2. **父节点校验**：
   - 父节点必须存在。
   - 父节点必须属于当前 `textbookId`。
   - 父节点 code 不能是三级节点（`code.split('.').length >= 3`）。
3. **code 校验**：
   - 格式正确（父节点 code + `.` + 数字）。
   - 在当前教材内唯一。
4. **事务写入**：
   - 创建 `knowledgePoint` 记录。
   - 在教材内容 `.md` 文件中追加占位块。
5. **返回新记录**。

### 3.3 MD 文件占位块

在父节点对应内容块之后插入新内容：

```markdown
#### 知识点 1.1.4：新增知识点名称

[待输入]
```

若父节点为一级节点（`code = 1`），则使用二级标题格式：

```markdown
### 1.3 新增知识点名称

[待输入]
```

若父节点为二级节点（`code = 1.1`），则使用三级标题格式：

```markdown
#### 知识点 1.1.3：新增知识点名称

[待输入]
```

---

## 4. Frontend Data Flow

### 4.1 学习页面（LearningPage）

1. 用户点击“新增子知识点”。
2. Modal 弹出，编号自动推导。
3. 用户填写并提交。
4. 调用 `knowledgeApi.createKnowledgePoint(activeTextbookId, dto)`。
5. 成功后：
   - 重新加载知识树 `knowledgeApi.getKnowledgeTree(activeTextbookId)`。
   - 自动选中新建节点。
   - 切换到 Raw 模式，显示占位内容 `[待输入]`，光标定位在文本区。

### 4.2 智能学习页面（SmartLearningPage）

1. 用户点击“新增子知识点”。
2. 后续流程与 LearningPage 一致。
3. 由于智能学习页面使用推荐列表，新增后需要刷新推荐列表以包含新节点（可选：若当前模式为“随机”或新节点命中弱项条件）。

### 4.3 API 客户端

在 `web/src/services/knowledgeApi.ts` 中新增方法：

```typescript
createKnowledgePoint: (
  textbookId: string,
  dto: CreateKnowledgePointDto
) => Promise<KnowledgePoint>
```

---

## 5. Component Architecture

```
LearningPage / SmartLearningPage
├── contentToolbar
│   └── AddChildKnowledgePointButton   ← NEW
├── AddChildKnowledgePointModal        ← NEW
│   ├── Form (name, code, definition, characteristics, importanceLevel)
│   └── Code auto-fill logic
└── KnowledgeTree
    └── auto-select new node after create
```

---

## 6. File Changes

### New Files

| File | Description |
|------|-------------|
| `web/src/components/knowledge-point/AddChildKnowledgePointModal.tsx` | 新增子知识点 Modal 表单 |
| `web/src/components/knowledge-point/AddChildKnowledgePointButton.tsx` | 工具栏按钮（含权限/禁用逻辑） |
| `web/src/types/knowledge-point.types.ts` | 新增 DTO/类型定义 |
| `server/src/modules/textbook/dto/create-knowledge-point.dto.ts` | 后端 DTO |
| `server/src/modules/textbook/knowledge-point.service.ts` | 新增知识点业务逻辑 |
| `server/src/modules/textbook/knowledge-point.controller.ts` | 新增知识点 API 端点 |

### Modified Files

| File | Changes |
|------|---------|
| `web/src/services/knowledgeApi.ts` | 增加 `createKnowledgePoint` 方法 |
| `web/src/pages/LearningPage/LearningPage.tsx` | 集成按钮和 Modal，刷新树后自动选中新节点 |
| `web/src/pages/smart-learning/SmartLearningPage.tsx` | 同上 |
| `server/src/modules/textbook/textbook.module.ts` | 注册 KnowledgePointService / Controller |
| `server/src/modules/textbook/textbook.service.ts` | 提取/复用 MD 文件读写逻辑（可选） |

---

## 7. Testing Considerations

- 学生用户看不到“新增子知识点”按钮。
- 三级节点选中时按钮禁用。
- 编号自动推导正确（跳过已存在编号）。
- 提交后 DB 中存在新记录，MD 文件中存在占位块。
- code 在当前教材内唯一，重复提交后端返回 409。
- 创建成功后左侧知识树刷新并选中新节点。
- 网络失败时显示错误提示，Modal 不关闭。

---

## 8. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| 按钮位置 | 右侧内容工具栏（与导出按钮并列） |
| 新增节点关系 | 当前选中节点的子节点 |
| 最大层级 | 3 级，三级节点不允许新增子节点 |
| 编辑字段 | 名称、编号、定义、特性、重要性 |
| MD 占位内容 | `#### 知识点 {code}：{name}\n\n[待输入]` |
| 权限 | 仅 TEACHER / ADMIN |
| 创建后行为 | 刷新知识树，自动选中新节点，进入 Raw 编辑模式 |
