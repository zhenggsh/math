## ADDED Requirements

### Requirement: 原始视图可编辑

系统 SHALL 允许有权限的用户在原始视图模式下直接编辑 Markdown 内容。

#### Scenario: 教师/管理员编辑原始内容
- **GIVEN** 用户角色为 `TEACHER` 或 `ADMIN`
- **WHEN** 用户切换到原始视图（Raw）模式
- **THEN** 系统 SHALL 显示可编辑的 `<textarea>` 而非只读的 `<pre>`
- **AND** 用户 SHALL 能直接修改 Markdown 文本
- **AND** toolbar 上 SHALL 显示"保存"按钮

#### Scenario: 学生不可编辑
- **GIVEN** 用户角色为 `STUDENT`
- **WHEN** 用户切换到原始视图模式
- **THEN** 系统 SHALL 显示只读的 `<pre>` 代码块
- **AND** SHALL 不显示"保存"按钮

#### Scenario: 保存内容到 MD 文件
- **GIVEN** 教师在 raw 模式下修改了内容
- **WHEN** 用户点击"保存"按钮
- **THEN** 系统 SHALL 将修改后的内容写回对应教材的 `.md` 文件
- **AND** 系统 SHALL 仅替换当前知识点对应的内容块（保持文件其余部分不变）
- **AND** 保存成功后 SHALL 显示成功提示
- **AND** 预览模式下的内容 SHALL 同步更新

#### Scenario: 切换节点时重置编辑状态
- **GIVEN** 用户在 raw 模式下编辑了内容但未保存
- **WHEN** 用户切换到另一个知识点
- **THEN** 编辑状态 SHALL 重置为新知识点的原始内容
- **AND** 未保存的修改 SHALL 被丢弃

## Types

```typescript
interface MarkdownPreviewProps {
  content: string;
  showRaw?: boolean;
  loading?: boolean;
  className?: string;
  editable?: boolean;
  onContentChange?: (content: string) => void;
}

interface SaveContentRequest {
  knowledgePointId: string;
  content: string;
}
```

## UI Specifications

| 元素 | 规格 |
|-----|------|
| 编辑区域 | `<textarea>`，等宽字体，背景 `#f6f8fa`，边框 `#d0d7de` |
| 编辑区域高度 | 自适应内容，最小高度 300px |
| 保存按钮 | Ant Design `Button` `type="primary"`，`size="small"` |
| 保存中状态 | 按钮显示 loading，禁用点击 |
| 权限控制 | 仅 `TEACHER` / `ADMIN` 可见编辑和保存功能 |

## API Specifications

```
PUT /textbooks/:textbookId/content
Authorization: Bearer <token>
Body: { knowledgePointId: string, content: string }
Response: { success: true, message: "内容已保存" }
```

## Performance Requirements

- 编辑响应：textarea 输入无延迟
- 保存响应：<= 500ms（文件 I/O）
