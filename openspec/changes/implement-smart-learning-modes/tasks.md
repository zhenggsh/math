# Tasks: 智能学习模式实现

## 前置依赖

- [x] `implement-learning-record` - 学习记录功能已完成
- [x] 数据库表 `learning_records` 可用
- [x] 用户认证系统已集成

---

## 阶段一：后端实现

### Task 1.1: 创建 SmartLearningService 服务

**目标**: 创建智能学习服务，实现三种学习模式的核心逻辑

**文件位置**:
- `server/src/smart-learning/smart-learning.service.ts`
- `server/src/smart-learning/smart-learning.module.ts`

**实现内容**:
1. 创建 `SmartLearningService` 类
2. 实现 `getWeakPoints(userId, query)` 方法
   - 查询掌握程度为 C/D/E 的学习记录
   - 按优先级排序（E > D > C）
   - 计算优先级分数
3. 实现 `getByImportance(userId, query)` 方法
   - 按 A/B/C 级别筛选知识点
   - 支持排除已掌握知识点
4. 实现 `getRandomPoints(userId, query)` 方法
   - 使用 Prisma `$queryRaw` 或随机排序
   - 限制返回数量

**验收标准**:
- [ ] 所有方法有完整的类型定义
- [ ] 单元测试覆盖率 > 80%
- [ ] 无 `any` 类型使用

**预计耗时**: 2 小时

---

### Task 1.2: 创建 SmartLearningController 控制器

**目标**: 实现智能学习 API 接口

**文件位置**:
- `server/src/smart-learning/smart-learning.controller.ts`

**实现内容**:
1. 创建 `SmartLearningController` 类
2. 实现 `GET /api/smart-learning/weak-points` 接口
3. 实现 `GET /api/smart-learning/by-importance` 接口
4. 实现 `GET /api/smart-learning/random` 接口
5. 添加 JWT 认证守卫
6. 添加参数校验（ValidationPipe）

**DTO 定义**:
- `WeakPointsQueryDto`
- `ByImportanceQueryDto`
- `RandomQueryDto`

**验收标准**:
- [ ] 所有接口返回统一响应格式
- [ ] 参数校验错误返回 400
- [ ] 未认证返回 401
- [ ] Swagger 文档可正常显示

**预计耗时**: 1.5 小时

---

### Task 1.3: 添加数据库索引

**目标**: 优化智能学习相关查询性能

**文件位置**:
- `server/prisma/migrations/` (迁移文件)
- `server/prisma/schema.prisma` (如需要)

**实现内容**:
1. 创建复合索引 `idx_learning_record_user_proficiency`
2. 创建复合索引 `idx_learning_record_user_date`
3. 创建索引 `idx_knowledge_point_importance`
4. 生成并执行迁移

**验收标准**:
- [ ] 迁移成功执行
- [ ] 查询性能测试通过（< 300ms）

**预计耗时**: 0.5 小时

---

## 阶段二：前端实现

### Task 2.1: 创建 LearningModeSelector 组件

**目标**: 实现学习模式选择器界面

**文件位置**:
- `web/src/components/smart-learning/LearningModeSelector.tsx`
- `web/src/components/smart-learning/LearningModeSelector.module.css`

**实现内容**:
1. 创建模式选择卡片组件
   - 薄弱点学习卡片（显示薄弱点数量徽章）
   - 重要性分级卡片（显示各级别统计）
   - 随机学习卡片
2. 支持选中状态样式
3. 支持点击切换事件
4. 使用 Ant Design 的 Card/Statistic 组件

**Props 定义**:
```typescript
interface LearningModeSelectorProps {
  activeMode: 'weak' | 'importance' | 'random';
  onModeChange: (mode: 'weak' | 'importance' | 'random') => void;
  stats: {
    weakPointCount: number;
    importanceStats: { A: number; B: number; C: number };
  };
}
```

**验收标准**:
- [ ] 组件有 Props 接口定义
- [ ] 三种模式切换正常
- [ ] 样式符合 Ant Design 设计规范

**预计耗时**: 1.5 小时

---

### Task 2.2: 创建 WeakPointView 组件

**目标**: 实现薄弱点学习视图

**文件位置**:
- `web/src/pages/smart-learning/WeakPointView.tsx`
- `web/src/pages/smart-learning/components/WeakPointList.tsx`

**实现内容**:
1. 调用 `GET /api/smart-learning/weak-points` 获取数据
2. 显示薄弱知识点列表
   - 知识点名称、编号
   - 掌握程度标签（E/D/C 不同颜色）
   - 最后学习时间
   - 优先级分数
3. 支持点击进入学习详情
4. 空状态提示（无薄弱点时）

**状态管理**:
- 使用 React Query 或 useEffect 获取数据
- 加载状态、错误状态处理

**验收标准**:
- [ ] 列表显示正确
- [ ] E/D/C 级别有不同颜色标识
- [ ] 空状态友好提示

**预计耗时**: 2 小时

---

### Task 2.3: 创建 ImportanceView 组件

**目标**: 实现重要性分级学习视图

**文件位置**:
- `web/src/pages/smart-learning/ImportanceView.tsx`

**实现内容**:
1. 实现级别筛选 Tab（A/B/C/全部）
2. 调用 `GET /api/smart-learning/by-importance` 获取数据
3. 显示各级别知识点列表
4. 显示级别说明（A类必须掌握等）
5. 支持排除/包含已掌握知识点切换

**Props 定义**:
```typescript
interface ImportanceViewProps {
  textbookId?: string;
}
```

**验收标准**:
- [ ] Tab 切换正常
- [ ] 各级别列表显示正确
- [ ] 排除已掌握功能正常

**预计耗时**: 1.5 小时

---

### Task 2.4: 创建 RandomView 组件

**目标**: 实现随机学习视图

**文件位置**:
- `web/src/pages/smart-learning/RandomView.tsx`

**实现内容**:
1. 实现数量选择器（5/10/20/自定义）
2. 实现"换一批"按钮（重新随机）
3. 调用 `GET /api/smart-learning/random` 获取数据
4. 显示随机知识点卡片网格
5. 支持卡片点击学习

**交互设计**:
- 换一批时显示加载动画
- 避免短时间内重复随机到相同知识点

**验收标准**:
- [ ] 数量选择正常
- [ ] 换一批功能正常
- [ ] 卡片网格布局美观

**预计耗时**: 1.5 小时

---

### Task 2.5: 创建智能学习主页面

**目标**: 整合所有组件，创建智能学习页面

**文件位置**:
- `web/src/pages/smart-learning/SmartLearningPage.tsx`
- `web/src/pages/smart-learning/index.ts`

**实现内容**:
1. 整合 LearningModeSelector
2. 根据选中模式渲染对应视图
3. 添加页面标题和说明
4. 添加路由配置

**路由配置**:
```typescript
{
  path: '/smart-learning',
  element: <SmartLearningPage />
}
```

**验收标准**:
- [ ] 模式切换流畅
- [ ] 各视图显示正常
- [ ] 页面布局响应式

**预计耗时**: 1 小时

---

## 阶段三：测试

### Task 3.1: 后端单元测试

**目标**: 为 SmartLearningService 编写单元测试

**文件位置**:
- `server/src/smart-learning/smart-learning.service.spec.ts`

**测试用例**:
1. `getWeakPoints`
   - 正常查询
   - 无薄弱点情况
   - 按教材筛选
   - limit 参数
2. `getByImportance`
   - 各级别查询
   - 排除已掌握
3. `getRandomPoints`
   - 正常随机
   - count 边界值

**验收标准**:
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试通过

**预计耗时**: 1.5 小时

---

### Task 3.2: 前端组件测试

**目标**: 为前端组件编写测试

**文件位置**:
- `web/src/components/smart-learning/LearningModeSelector.test.tsx`
- `web/src/pages/smart-learning/WeakPointView.test.tsx`

**测试内容**:
1. LearningModeSelector
   - 渲染三种模式
   - 点击切换
   - 统计信息显示
2. WeakPointView
   - 列表渲染
   - 空状态
   - 点击事件

**验收标准**:
- [ ] 使用 Vitest + React Testing Library
- [ ] 所有测试通过

**预计耗时**: 1.5 小时

---

## 执行前检查清单

- [ ] 已阅读 `project-rule/SKILL.md` 了解代码规范
- [ ] 前置变更 `implement-learning-record` 已完成
- [ ] 数据库 `learning_records` 表有数据
- [ ] 已创建功能分支 `feature/implement-smart-learning-modes`

## 执行过程注意事项

1. **代码规范**
   - 后端：NestJS 控制器必须使用 `ApiTags` 装饰器
   - 前端：组件 Props 必须定义接口
   - 所有函数必须有返回类型

2. **性能考虑**
   - 后端查询使用 Prisma 的 `include` 避免 N+1
   - 前端列表使用虚拟滚动（如数据量大）

3. **错误处理**
   - API 返回统一格式 `{ code, data, message }`
   - 前端显示错误消息时避免技术细节

4. **类型安全**
   - 禁止 `any` 类型
   - DTO 使用 `class-validator` 装饰器

## 执行后检查清单

### 代码质量
- [ ] `tsc --noEmit` 无错误（前后端）
- [ ] 无 `any` 类型（有注释的例外允许）
- [ ] 无 `console.log` / `debugger` 语句
- [ ] ESLint + Prettier 检查通过

### 测试
- [ ] 后端单元测试覆盖率 ≥ 80%
- [ ] 前端组件测试通过
- [ ] 手动测试三种学习模式

### API 验证
- [ ] `/api/smart-learning/weak-points` 返回正确
- [ ] `/api/smart-learning/by-importance` 返回正确
- [ ] `/api/smart-learning/random` 返回正确

### 界面验证
- [ ] 模式选择器样式正确
- [ ] 模式切换流畅
- [ ] 响应式布局正常

---

## 总预计耗时

| 阶段 | 耗时 |
|------|------|
| 后端实现 | 4 小时 |
| 前端实现 | 7.5 小时 |
| 测试 | 3 小时 |
| **总计** | **14.5 小时** |
