# Tasks: implement-learning-analytics

> **Change**: implement-learning-analytics  
> **Status**: Ready  
> **Created**: 2026-03-14

---

## 执行前检查

### 前置依赖确认
- [ ] `implement-learning-record` 变更已完成并合并
- [ ] 数据库中已有学习记录数据（至少测试数据）
- [ ] `web/` 和 `server/` 项目目录存在且可正常运行

### 环境检查
- [ ] Node.js 18+ 已安装
- [ ] pnpm 8+ 已安装
- [ ] PostgreSQL 运行正常

### 数据库索引检查
执行以下 SQL 确认索引存在：
```sql
-- 确保有 user_id + created_at 复合索引
CREATE INDEX IF NOT EXISTS idx_learning_records_user_created 
ON learning_records(user_id, created_at);

-- 确保有 knowledge_point_id 索引
CREATE INDEX IF NOT EXISTS idx_learning_records_kp 
ON learning_records(knowledge_point_id);
```

---

## 1. 后端 Analytics 模块

### 1.1 创建 AnalyticsModule 基础结构

**任务描述**: 创建 NestJS 模块基础文件

**文件**:
- `server/src/modules/analytics/analytics.module.ts`
- `server/src/modules/analytics/analytics.controller.ts`
- `server/src/modules/analytics/analytics.service.ts`

**检查点**:
- [ ] 模块正确导出并在 AppModule 中导入
- [ ] 控制器路由前缀为 `/api/analytics`
- [ ] 服务使用 `@Injectable()` 装饰器

**预计时间**: 30 分钟

---

### 1.2 创建 DTO 和类型定义

**任务描述**: 定义所有 API 的 DTO 和接口

**文件**:
- `server/src/modules/analytics/dto/student-stats.dto.ts`
- `server/src/modules/analytics/dto/teacher-stats.dto.ts`
- `server/src/modules/analytics/dto/query-params.dto.ts`
- `server/src/modules/analytics/interfaces/stats.interfaces.ts`

**检查点**:
- [ ] 所有 DTO 使用 class-validator 装饰器验证
- [ ] 类型定义完整覆盖所有响应结构
- [ ] 导出的类型可以被其他模块使用

**预计时间**: 45 分钟

---

### 1.3 实现 StatsService 核心逻辑

**任务描述**: 实现数据统计聚合服务

**文件**: `server/src/modules/analytics/analytics.service.ts`

**方法清单**:
| 方法 | 描述 |
|------|------|
| `getStudentOverview(userId)` | 学生学习概览 |
| `getMasteryDistribution(userId)` | 掌握程度分布 |
| `getLearningTrend(userId, days)` | 学习趋势 |
| `getWeakPoints(userId, limit)` | 薄弱知识点 |
| `getClassOverview(classId)` | 班级概览 |
| `getKnowledgeHeat(limit)` | 知识点热度 |
| `getStudentComparison(studentIds)` | 学生对比 |

**检查点**:
- [ ] 使用 Prisma 聚合查询，避免 N+1 问题
- [ ] 方法返回类型显式声明
- [ ] 无 `any` 类型

**预计时间**: 2 小时

---

### 1.4 实现 AnalyticsController API

**任务描述**: 实现 RESTful API 端点

**文件**: `server/src/modules/analytics/analytics.controller.ts`

**端点清单**:
| 方法 | 路径 | 权限 |
|------|------|------|
| GET | `/analytics/student/overview` | Student(本人) |
| GET | `/analytics/student/mastery-distribution` | Student(本人) |
| GET | `/analytics/student/learning-trend` | Student(本人) |
| GET | `/analytics/student/weak-points` | Student(本人) |
| GET | `/analytics/teacher/class-overview` | Teacher |
| GET | `/analytics/teacher/knowledge-heat` | Teacher |
| GET | `/analytics/teacher/student-comparison` | Teacher |
| POST | `/analytics/teacher/export` | Teacher |

**检查点**:
- [ ] 使用 `@UseGuards(AuthGuard)` 保护所有端点
- [ ] 使用 `@Roles()` 装饰器控制角色权限
- [ ] 使用 `ValidationPipe` 验证查询参数

**预计时间**: 1.5 小时

---

### 1.5 实现数据导出功能

**任务描述**: 实现 Excel/CSV 导出

**文件**: 
- `server/src/modules/analytics/export.service.ts`
- 新增依赖: `xlsx` 包

**检查点**:
- [ ] 支持 .xlsx 格式导出
- [ ] 支持 .csv 格式导出
- [ ] 导出数据包含学生姓名、知识点、学习时间、掌握程度
- [ ] 处理大数据量导出（流式写入）

**预计时间**: 1.5 小时

---

### 1.6 后端单元测试

**任务描述**: 为 Analytics 模块编写 Jest 测试

**文件**: 
- `server/src/modules/analytics/analytics.service.spec.ts`
- `server/src/modules/analytics/analytics.controller.spec.ts`

**测试覆盖**:
- [ ] StatsService 所有方法
- [ ] AnalyticsController 所有端点
- [ ] 权限验证测试
- [ ] 覆盖率 ≥ 80%

**检查命令**:
```bash
cd server
pnpm test analytics --coverage
```

**预计时间**: 1.5 小时

---

## 2. 前端 ECharts 封装

### 2.1 安装 ECharts 依赖

**任务描述**: 安装并配置 ECharts

**命令**:
```bash
cd web
pnpm add echarts
pnpm add -D @types/echarts
```

**检查点**:
- [ ] 依赖安装成功
- [ ] TypeScript 类型识别正常

**预计时间**: 10 分钟

---

### 2.2 创建 EChartsWrapper 基础组件

**任务描述**: 封装 ECharts 初始化、销毁、响应式逻辑

**文件**: `web/src/components/features/analytics/EChartsWrapper.tsx`

**Props 接口**:
```typescript
interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  onClick?: (params: any) => void;
  loading?: boolean;
}
```

**检查点**:
- [ ] 组件正确初始化 ECharts 实例
- [ ] 组件卸载时正确销毁实例
- [ ] 窗口大小变化时自动 resize
- [ ] Props 有明确类型定义

**预计时间**: 45 分钟

---

### 2.3 创建基础图表组件

**任务描述**: 创建 PieChart、BarChart、LineChart

**文件**:
- `web/src/components/features/analytics/PieChart.tsx`
- `web/src/components/features/analytics/BarChart.tsx`
- `web/src/components/features/analytics/LineChart.tsx`

**检查点**:
- [ ] 组件继承 EChartsWrapper
- [ ] 提供友好的数据接口（而非原始 ECharts option）
- [ ] 使用 Ant Design 配色方案

**预计时间**: 1 小时

---

### 2.4 创建业务图表组件

**任务描述**: 创建面向业务的图表组件

**文件**:
- `web/src/components/features/analytics/MasteryDistributionChart.tsx`
- `web/src/components/features/analytics/LearningTrendChart.tsx`
- `web/src/components/features/analytics/KnowledgeHeatChart.tsx`
- `web/src/components/features/analytics/StudentComparisonChart.tsx`

**检查点**:
- [ ] 每个组件对应一个业务场景
- [ ] 图表配置项完整（标题、图例、提示等）
- [ ] 空状态处理

**预计时间**: 1.5 小时

---

### 2.5 创建 Analytics 类型定义

**任务描述**: 定义分析模块的类型

**文件**: `web/src/types/analytics.types.ts`

**内容**:
- 所有 API 响应类型
- 图表数据类型
- 组件 Props 类型

**检查点**:
- [ ] 类型与后端 DTO 保持一致
- [ ] 类型复用（不要重复定义）

**预计时间**: 30 分钟

---

### 2.6 创建 Analytics API 服务

**任务描述**: 创建前端 API 调用服务

**文件**: `web/src/services/analytics.service.ts`

**方法清单**:
| 方法 | 对应 API |
|------|----------|
| `getStudentOverview()` | GET /analytics/student/overview |
| `getMasteryDistribution()` | GET /analytics/student/mastery-distribution |
| `getLearningTrend(days)` | GET /analytics/student/learning-trend |
| `getWeakPoints(limit)` | GET /analytics/student/weak-points |
| `getClassOverview(classId)` | GET /analytics/teacher/class-overview |
| `getKnowledgeHeat(limit)` | GET /analytics/teacher/knowledge-heat |
| `exportData(params)` | POST /analytics/teacher/export |

**检查点**:
- [ ] 所有方法返回类型显式声明
- [ ] 错误处理统一封装

**预计时间**: 45 分钟

---

## 3. 前端分析页面

### 3.1 创建 StudentAnalyticsPage

**任务描述**: 创建学生学习分析页面

**文件**: `web/src/pages/analytics/StudentAnalyticsPage.tsx`

**页面结构**:
```
StudentAnalyticsPage
├── OverviewCards (学习概览卡片)
├── MasteryDistributionChart (掌握分布饼图)
├── LearningTrendChart (学习趋势折线图)
└── WeakPointsTable (薄弱知识点表格)
```

**检查点**:
- [ ] 使用 Ant Design 的 Card、Row、Col 布局
- [ ] 数据加载时显示 Spin 状态
- [ ] 响应式布局适配

**预计时间**: 1.5 小时

---

### 3.2 创建 TeacherAnalyticsPage

**任务描述**: 创建教师全局分析页面

**文件**: `web/src/pages/analytics/TeacherAnalyticsPage.tsx`

**页面结构**:
```
TeacherAnalyticsPage
├── ClassSelector (班级选择器)
├── OverviewCards (班级概览卡片)
├── KnowledgeHeatChart (知识点热度柱状图)
├── StudentComparisonChart (学生对比图表)
└── ExportButton (导出按钮)
```

**检查点**:
- [ ] 班级选择使用 Select 组件
- [ ] 学生对比支持多选
- [ ] 导出按钮调用 export API

**预计时间**: 1.5 小时

---

### 3.3 配置路由

**任务描述**: 添加分析页面路由

**文件**: `web/src/router/index.tsx` (或对应路由配置文件)

**路由配置**:
```typescript
{
  path: '/analytics/student',
  element: <StudentAnalyticsPage />,
  roles: ['STUDENT', 'TEACHER', 'ADMIN']
},
{
  path: '/analytics/teacher',
  element: <TeacherAnalyticsPage />,
  roles: ['TEACHER', 'ADMIN']
}
```

**检查点**:
- [ ] 路由权限控制正确
- [ ] 侧边栏菜单项已添加

**预计时间**: 30 分钟

---

### 3.4 前端单元测试

**任务描述**: 为组件编写 Vitest 测试

**文件**:
- `web/src/components/features/analytics/EChartsWrapper.test.tsx`
- `web/src/pages/analytics/StudentAnalyticsPage.test.tsx`
- `web/src/pages/analytics/TeacherAnalyticsPage.test.tsx`
- `web/src/services/analytics.service.test.ts`

**检查点**:
- [ ] 组件渲染测试
- [ ] 用户交互测试
- [ ] API 调用测试（mock）
- [ ] 覆盖率 ≥ 80%

**检查命令**:
```bash
cd web
pnpm test analytics --coverage
```

**预计时间**: 1.5 小时

---

## 4. 集成与验证

### 4.1 端到端测试

**任务描述**: 完整流程验证

**测试场景**:
1. 学生登录 → 访问分析页面 → 查看个人数据
2. 教师登录 → 访问分析页面 → 查看班级数据 → 导出数据

**检查点**:
- [ ] 前后端 API 对接正常
- [ ] 图表正确渲染
- [ ] 数据导出文件可正常打开

**预计时间**: 30 分钟

---

### 4.2 性能优化

**任务描述**: 确保性能达标

**优化项**:
- [ ] ECharts 使用按需引入减少包体积
- [ ] API 响应时间 < 500ms
- [ ] 图表渲染时间 < 200ms

**检查命令**:
```bash
# 前端包体积分析
cd web
pnpm build
# 检查 dist 中 echarts 包大小
```

**预计时间**: 30 分钟

---

## 执行过程注意事项

### 编码规范
- 遵循 `project-rule` SKILL 中的 TypeScript 严格规范
- 所有函数和组件必须有显式返回类型
- 禁止 `any` 类型

### 代码质量
- 每个任务完成后运行类型检查：`tsc --noEmit`
- 提交前运行代码检查：`pnpm lint`
- 提交前运行测试：`pnpm test`

### Git 提交
- 每个主要任务完成后提交
- 提交信息格式：`feat(analytics): <description>`

---

## 执行后检查

### 代码质量检查
- [ ] `tsc --noEmit` 通过（前后端）
- [ ] `pnpm lint` 无错误
- [ ] 无 `console.log` 或 `debugger` 语句
- [ ] 无未使用变量/导入

### 测试检查
- [ ] 后端单元测试覆盖率 ≥ 80%
- [ ] 前端单元测试覆盖率 ≥ 80%
- [ ] 所有测试通过

### 功能检查
- [ ] 学生分析页面可正常访问
- [ ] 教师分析页面可正常访问
- [ ] 所有图表正确渲染
- [ ] 数据导出功能正常

### 文档检查
- [ ] API 文档已更新（如有）
- [ ] CHANGELOG 已更新

---

## 任务总览

| 分组 | 任务数 | 预计总时间 |
|------|--------|-----------|
| 后端 Analytics 模块 | 6 | 7.5 小时 |
| 前端 ECharts 封装 | 5 | 4.5 小时 |
| 前端分析页面 | 4 | 4.5 小时 |
| 集成与验证 | 2 | 1 小时 |
| **总计** | **17** | **~17.5 小时** |

---

## 阻塞项

如有以下情况，暂停并联系项目负责人：
1. 发现需要修改 `learning_records` 表结构
2. 数据库性能问题导致聚合查询过慢（> 2s）
3. ECharts 包体积过大影响页面加载（> 500KB gzip）
