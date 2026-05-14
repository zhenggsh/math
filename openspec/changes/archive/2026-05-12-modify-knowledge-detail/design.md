## Context

当前学习页面的原始视图（Raw）模式下，Markdown 内容以只读的 `<pre>` 代码块展示。教师发现内容错误时，需要：下载 md 文件 → 本地编辑 → 重新上传 → 刷新教材，流程冗长。本变更提供页面内直接编辑和保存能力。

## Goals / Non-Goals

**Goals:**
- 教师/管理员可在原始视图模式下直接编辑 Markdown 内容
- 编辑后的内容可保存回对应教材的 md 文件
- 保存时仅替换当前知识点对应的内容块，不破坏文件其他部分
- 学生角色不可编辑，只能查看

**Non-Goals:**
- 不支持协同编辑（无冲突解决机制）
- 不支持版本历史和回滚
- 不涉及 Markdown 渲染逻辑的修改

## Decisions

### 1. 编辑组件：textarea 替代 pre
- **Decision**: `MarkdownPreview` 在 raw 模式下根据 `editable` prop 决定渲染 `<textarea>`（可编辑）或 `<pre>`（只读）。
- **Rationale**: textarea 是浏览器原生支持的多行文本输入组件，无需引入额外富文本编辑器库，保持轻量。
- **Trade-off**: 无语法高亮和自动补全，但教师通常只需做简单修正，textarea 足够。

### 2. 权限控制：前端 + 后端双重校验
- **Decision**: 
  - 前端：通过 `useAuth` 获取用户角色，仅 `TEACHER`/`ADMIN` 显示"保存"按钮和 textarea
  - 后端：`PUT /textbooks/:id/content` endpoint 使用 `@Roles(Role.TEACHER, Role.ADMIN)` 守卫
- **Rationale**: 前端隐藏可防止学生误操作，后端校验防止接口绕过。

### 3. 内容块定位：复用现有匹配逻辑
- **Decision**: 后端新增 `findContentBlockRange` 方法，复用 `readContentFromFile` 的 code/名称匹配策略，返回内容块在文件中的起始和结束行索引。
- **Rationale**: 保持匹配逻辑一致性，避免维护两套规则。起始索引指向标题行，结束索引为不包含的边界。
- **Implementation**: 
  - 一级：匹配 `^##` 标题行，结束于下一个 `^##` 或 `^---`
  - 二级：匹配 `^###` 标题行，结束于下一个 `^###` 或更高级标题
  - 三级：匹配 `^#### 知识点 {code}`，结束于下一个 `^#### 知识点` 或 `^---` 或更高级标题

### 4. 编辑状态管理：LearningPage 维护
- **Decision**: `LearningPage` 维护 `editedContent` state，切换知识点时重置为当前知识点原始内容。
- **Rationale**: MarkdownPreview 作为纯受控组件，不维护内部状态。编辑状态由父组件统一管理，便于保存时获取最新内容。
- **Trade-off**: 切换知识点时未保存的修改会丢失（已作为预期行为在 spec 中明确）。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 用户误操作保存错误内容 | 教师/管理员角色本身具备内容管理能力；目前无版本回滚，后续可扩展 |
| 多用户同时编辑同一文件 | 本变更不涉及协同编辑；如有冲突，后保存的覆盖先保存的 |
| 内容块定位失败导致文件损坏 | 定位失败时接口返回 404，不执行写入；写入前验证内容块边界 |
| 保存后前端缓存未刷新 | 保存成功后同步更新 `content` state，预览模式立即生效 |

## Migration Plan

无需数据迁移。本变更为纯功能增强，不影响已有数据。

部署步骤：
1. 合并代码
2. 重新构建前后端并部署
