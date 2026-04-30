## 1. 后端 - LearningModule 基础结构

- [x] 1.1 创建 `server/src/modules/learning/learning.module.ts`，导入 PrismaModule
- [x] 1.2 在 `server/src/app.module.ts` 中导入 LearningModule

## 2. 后端 - DTO 定义

- [x] 2.1 创建 `server/src/modules/learning/dto/create-learning-record.dto.ts`
  - knowledgePointId: string（必填）
  - masteryLevel: enum('A', 'B', 'C', 'D', 'E')（必填）
  - durationMinutes: number（必填，正整数）
  - notes: string（可选，最大长度 500）
  - startTime: Date（可选，默认为当前时间）
- [x] 2.2 创建 `server/src/modules/learning/dto/learning-record-response.dto.ts`
  - 包含所有 LearningRecord 字段
  - 包含关联的 KnowledgePoint 基本信息
- [x] 2.3 创建 `server/src/modules/learning/dto/query-learning-records.dto.ts`
  - knowledgePointId: string（可选）
  - page: number（可选，默认 1）
  - limit: number（可选，默认 20，最大 100）

## 3. 后端 - LearningRecordService

- [x] 3.1 创建 `server/src/modules/learning/learning-record.service.ts`
- [x] 3.2 实现 `create()` 方法：创建学习记录
  - 验证 knowledgePointId 存在
  - 使用当前用户 ID 作为 userId
  - 返回创建的记录
- [x] 3.3 实现 `findAll()` 方法：查询用户的学习记录列表
  - 支持按 knowledgePointId 过滤
  - 支持分页
  - 按 createdAt 倒序排列
  - 包含关联的 KnowledgePoint 信息
- [x] 3.4 实现 `findByKnowledgePoint()` 方法：查询特定知识点的学习记录
  - 验证用户对知识点的访问权限
  - 返回该用户对该知识点的所有记录

## 4. 后端 - LearningRecordController

- [x] 4.1 创建 `server/src/modules/learning/learning-record.controller.ts`
  - 使用 `@Controller('learning-records')` 装饰器
- [x] 4.2 实现 POST /learning-records 端点
  - 使用 `@Post()` 装饰器
  - 使用 ValidationPipe 验证请求体
  - 返回 201 Created
- [x] 4.3 实现 GET /learning-records 端点
  - 使用 `@Get()` 装饰器
  - 支持 query 参数（knowledgePointId、page、limit）
  - 返回分页结果
- [x] 4.4 实现 GET /learning-records/:knowledgePointId 端点
  - 使用 `@Get(':knowledgePointId')` 装饰器
  - 返回特定知识点的学习记录列表

## 5. 后端 - 单元测试

- [x] 5.1 创建 `server/src/modules/learning/learning-record.service.spec.ts`
  - 测试 create() 方法
  - 测试 findAll() 方法
  - 测试 findByKnowledgePoint() 方法
  - 覆盖率 >= 80%
- [x] 5.2 创建 `server/src/modules/learning/learning-record.controller.spec.ts`
  - 测试 POST 端点
  - 测试 GET 端点
  - 测试验证错误处理
  - 覆盖率 >= 80%

## 6. 前端 - MasteryRating 组件

- [x] 6.1 创建 `web/src/components/learning/MasteryRating.tsx`
  - Props 接口：{ value?: string; onChange?: (value: string) => void; disabled?: boolean }
  - 显示 A/B/C/D/E 五个选项
  - 每个选项显示对应的颜色
  - 支持受控和非受控模式
- [x] 6.2 创建 `web/src/components/learning/MasteryRating.module.css`
- [x] 6.3 创建 `web/src/components/learning/__tests__/MasteryRating.test.tsx`
  - 测试选项渲染
  - 测试选择功能
  - 测试禁用状态

## 7. 前端 - LearningTimer 组件

- [x] 7.1 创建 `web/src/components/learning/LearningTimer.tsx`
  - Props 接口：{ startTime: Date; onDurationChange?: (minutes: number) => void }
  - 实时显示学习时长（MM:SS 格式）
  - 每秒更新显示
  - 提供获取当前分钟数的方法
- [x] 7.2 创建 `web/src/components/learning/__tests__/LearningTimer.test.tsx`
  - 测试计时功能
  - 测试格式显示
  - 测试 onDurationChange 回调

## 8. 前端 - RecordHistory 组件

- [x] 8.1 创建 `web/src/components/learning/RecordHistory.tsx`
  - Props 接口：{ records: LearningRecord[]; loading?: boolean }
  - 显示历史记录列表
  - 每条记录显示：日期、时长、掌握程度、备注
  - 支持备注展开/折叠
  - 空状态提示
- [x] 8.2 创建 `web/src/types/learning-record.types.ts`
  - 定义 LearningRecord 接口
  - 定义相关类型
- [x] 8.3 创建 `web/src/components/learning/__tests__/RecordHistory.test.tsx`
  - 测试列表渲染
  - 测试空状态
  - 测试备注展开功能

## 9. 前端 - FeedbackPanel 组件

- [x] 9.1 创建 `web/src/components/learning/FeedbackPanel.tsx`
  - Props 接口：{ knowledgePointId: string; onSubmitSuccess?: () => void }
  - 整合 MasteryRating、LearningTimer、RecordHistory
  - 表单状态管理
  - 提交逻辑处理
  - 加载和错误状态
- [x] 9.2 创建 API 调用函数 `web/src/services/learningRecordApi.ts`
  - createLearningRecord(data)
  - getLearningRecords(knowledgePointId?)
- [x] 9.3 创建 `web/src/components/learning/__tests__/FeedbackPanel.test.tsx`
  - 测试表单提交
  - 测试 API 错误处理
  - 测试提交成功后的刷新

## 10. 前端 - LearningPage 集成

- [x] 10.1 修改 `web/src/pages/LearningPage/LearningPage.tsx`
  - 导入 FeedbackPanel 组件：`import { FeedbackPanel } from '../../components/learning/FeedbackPanel'`
  - 将 `showBottomPanel={false}` 改为 `showBottomPanel={true}`
  - 添加 `learningFeedbackPanel` prop，传递 FeedbackPanel 组件：
    ```tsx
    learningFeedbackPanel={
      selectedNode?.data.id ? (
        <FeedbackPanel
          key={selectedNode.data.id} // 知识点切换时重新挂载
          knowledgePointId={selectedNode.data.id}
          onSubmitSuccess={() => {
            // 提交成功后刷新历史记录（FeedbackPanel 内部处理）
          }}
        />
      ) : null
    }
    ```
  - 确保知识点切换时 FeedbackPanel 正确重新挂载（使用 key 属性）
- [x] 10.2 确保计时器在知识点切换时正确重置（FeedbackPanel 内部处理）
- [x] 10.3 添加必要的样式调整，确保底部面板显示正常

## 11. 集成测试

- [x] 11.1 创建端到端测试流程
  - 打开学习页面 → 计时器启动 → 选择掌握程度 → 提交反馈 → 验证记录创建
- [x] 11.2 验证前后端数据一致性

## 执行前检查

### 环境检查
- [x] Node.js 版本 >= 18
- [x] pnpm 版本 >= 8
- [x] PostgreSQL 服务正在运行

### 前置变更检查
- [x] `init-project-structure` 已完成（项目基础结构就绪）
- [x] `setup-database-schema` 已完成（数据库模型就绪，LearningRecord 模型已创建）
- [x] `implement-knowledge-learning-ui` 已完成（学习界面就绪，MultiPaneLayout 支持底部面板）

### 项目状态检查
- [x] 当前工作目录为项目根目录
- [x] `web/` 和 `server/` 目录存在
- [x] Prisma Client 已生成
- [x] LearningRecord 模型已在数据库中创建

## 执行过程注意事项

### 后端注意事项
1. **不可更新原则**：LearningRecord 只实现 create 和 read 操作，不实现 update 和 delete
2. **权限验证**：所有查询必须过滤当前用户，防止数据泄露
3. **外键验证**：创建记录前验证 knowledgePointId 存在
4. **DTO 验证**：使用 class-validator 确保数据有效性
5. **错误处理**：返回友好的错误信息和适当的 HTTP 状态码

### 前端注意事项
1. **计时器实现**：使用 useEffect + setInterval，组件卸载时清理
2. **颜色对应**：严格遵循 constitution.md 的掌握程度颜色规范
3. **状态管理**：表单状态使用 useState，提交后重置
4. **错误处理**：API 错误显示在表单下方，保留用户输入
5. **加载状态**：提交按钮显示 loading，禁用重复提交

### 命名规范
- 组件：PascalCase（如 FeedbackPanel、MasteryRating）
- 服务/函数：camelCase（如 learningRecordService、createLearningRecord）
- DTO：PascalCase + Dto 后缀（如 CreateLearningRecordDto）
- 文件：与导出内容同名（如 FeedbackPanel.tsx）

## 执行后检查

### 代码质量检查
- [x] `tsc --noEmit` 在前端和后端分别执行无错误
- [x] `pnpm lint` 无 ESLint 错误
- [x] `pnpm format` 格式化后无变更
- [x] 无 `any` 类型（有文档的例外允许）
- [x] 无 `console.log` / `debugger` 语句

### 功能检查
- [x] 学习计时器在页面打开时自动启动
- [x] 计时器显示格式为 MM:SS
- [x] 掌握程度评分组件显示 A/B/C/D/E 五级
- [x] 每个评分选项显示正确的颜色
- [x] 可成功提交学习反馈
- [x] 提交后历史记录列表刷新
- [x] 历史记录按时间倒序排列

### API 检查
- [x] POST /learning-records 返回 201
- [x] GET /learning-records 返回用户的学习记录
- [x] GET /learning-records?knowledgePointId=xxx 返回特定知识点的记录
- [x] 缺少必填字段返回 400
- [x] 无效 masteryLevel 返回 400

### 测试检查
- [x] LearningRecordService 单元测试通过（Jest）
- [x] LearningRecordController 单元测试通过（Jest）
- [x] MasteryRating 组件测试通过（Vitest）
- [x] LearningTimer 组件测试通过（Vitest）
- [x] RecordHistory 组件测试通过（Vitest）
- [x] FeedbackPanel 组件测试通过（Vitest）
- [x] 所有测试覆盖率 >= 80%

### 规范检查
- [x] 所有组件使用 PascalCase 命名
- [x] 所有服务/函数使用 camelCase 命名
- [x] 类型定义使用 PascalCase
- [x] API 端点符合 RESTful 规范
- [x] 颜色使用符合 constitution.md 规范
