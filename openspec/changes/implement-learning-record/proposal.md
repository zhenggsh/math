## Why

数学通项目的核心功能之一是记录学生的学习情况。用户在学习界面查看知识点内容后，需要记录学习时间、学习时长和掌握程度评分，以便后续进行学习分析和针对性复习。前置变更 `implement-knowledge-learning-ui` 已完成学习界面的搭建，现在需要实现学习记录的数据层和反馈交互功能。

## What Changes

- 实现学习记录 API（创建、查询）
- 开发学习反馈面板组件（下方反馈区）
- 实现掌握程度评分组件（A/B/C/D/E 五级）
- 开发学习计时器功能（自动计算学习时长）
- 实现学习历史记录列表展示
- 在学习页面集成反馈面板

## Capabilities

### New Capabilities
- `learning-record`: 学习记录管理能力，包含学习记录的创建、查询、历史列表展示

### Modified Capabilities
- `knowledge-learning`: 在学习界面中集成反馈面板和计时器功能

## Impact

- 新增 `server/src/learning/` 目录：LearningModule、LearningRecordService、LearningRecordController、DTO
- 新增 `web/src/components/learning/` 目录：FeedbackPanel、MasteryRating、LearningTimer、RecordHistory
- 修改 `web/src/pages/LearningPage/`：集成反馈面板和计时器
- 新增 API 端点：`POST /learning-records`、`GET /learning-records`、`GET /learning-records/:knowledgePointId`

---

## 执行前检查

### 环境检查
- [ ] Node.js 版本 >= 18
- [ ] pnpm 版本 >= 8
- [ ] PostgreSQL 已运行且可连接

### 前置变更检查
- [ ] `init-project-structure` 变更已完成（项目基础结构）
- [ ] `setup-database-schema` 变更已完成（数据库模型）
- [ ] `implement-knowledge-learning-ui` 变更已完成（学习界面就绪）

### 项目状态检查
- [ ] 当前工作目录为项目根目录
- [ ] `web/` 和 `server/` 目录存在
- [ ] Prisma Client 已生成（`prisma generate` 已执行）
- [ ] LearningRecord 模型已在数据库中创建

---

## 执行过程注意事项

### 后端开发注意事项
1. **学习记录不可更新**：根据 constitution.md 定义，学习记录仅可创建，不可修改或删除
2. **外键关联**：LearningRecord 关联 User 和 KnowledgePoint，创建时需验证外键有效性
3. **DTO 验证**：使用 class-validator 验证 masteryLevel 必须是 A/B/C/D/E 之一
4. **权限控制**：用户只能创建和查看自己的学习记录

### 前端开发注意事项
1. **计时器实现**：使用 React Hook 实现，学习开始时启动，提交反馈时停止并计算时长
2. **掌握程度颜色**：根据 constitution.md 色彩规范，A(#52C41A)、B(#73D13D)、C(#FAAD14)、D(#FA8C16)、E(#F5222D)
3. **面板位置**：反馈面板位于学习页面下方，采用折叠/展开设计
4. **状态管理**：使用本地 state 管理计时器，提交成功后清空表单

### API 集成注意事项
1. **错误处理**：提交失败时显示友好提示，不丢失用户输入
2. **加载状态**：提交按钮显示 loading 状态，防止重复提交
3. **成功反馈**：提交成功后显示成功消息，更新历史记录列表

---

## 执行后检查

### 代码质量检查
- [ ] `tsc --noEmit` 在前端和后端分别执行无错误
- [ ] `pnpm lint` 无 ESLint 错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 无 `console.log` / `debugger` 语句（除入口文件外）

### 功能检查
- [ ] 学习计时器可正常启动和停止
- [ ] 掌握程度评分组件可正常选择和显示
- [ ] 可成功创建学习记录（API 返回 201）
- [ ] 可成功查询学习记录列表
- [ ] 历史记录列表正确展示
- [ ] 用户只能看到自己的学习记录

### 测试检查
- [ ] LearningRecordService 单元测试通过（Jest）
- [ ] LearningRecordController 单元测试通过（Jest）
- [ ] FeedbackPanel 组件测试通过（Vitest）
- [ ] MasteryRating 组件测试通过（Vitest）
- [ ] 单元测试覆盖率 >= 80%

### 规范检查
- [ ] 所有组件使用 PascalCase 命名
- [ ] 所有服务/函数使用 camelCase 命名
- [ ] DTO 类使用 CreateLearningRecordDto 命名规范
- [ ] API 端点符合 RESTful 规范
