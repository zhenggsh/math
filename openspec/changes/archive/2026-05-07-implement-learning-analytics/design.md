# Design: implement-learning-analytics

> **Change**: implement-learning-analytics  
> **Status**: Draft  
> **Created**: 2026-03-14

---

## Context

### 背景

`implement-learning-record` 变更完成后，系统已积累大量学习记录数据。每条学习记录包含：
- 用户标识 (`user_id`)
- 知识点标识 (`knowledge_point_id`)
- 学习时长 (`duration_minutes`)
- 掌握程度 (`mastery_level`: A/B/C/D/E)
- 学习时间 (`start_time`, `created_at`)

这些数据需要被聚合分析，提供学生和教师两个视角的数据洞察。

### 数据规模假设

- 单个学生：最多 500 条学习记录（约 200 个知识点 × 2-3 次学习）
- 单个班级：最多 50 名学生
- 单个教师：最多 10 个班级
- 系统总知识点：约 1000 个

基于以上规模，聚合查询无需复杂的大数据方案，Prisma + PostgreSQL 足以支持。

---

## Goals

### 学生学习分析

1. **学习概览**
   - 总学习次数
   - 总学习时长
   - 已学习知识点数量

2. **掌握情况分布**
   - A/B/C/D/E 五级掌握程度占比
   - 可视化：饼图或环形图

3. **学习趋势**
   - 按日期统计学习时长
   - 可视化：折线图

4. **薄弱知识点识别**
   - 掌握程度为 D/E 的知识点列表
   - 按重要性级别排序

### 教师全局分析

1. **班级概览**
   - 班级平均学习次数
   - 班级平均学习时长
   - 参与学习的学生数

2. **知识点热度统计**
   - 被学习次数最多的知识点
   - 可视化：柱状图

3. **学生对比分析**
   - 多学生掌握情况对比
   - 可视化：分组柱状图

4. **数据导出**
   - 导出班级学习数据为 Excel/CSV

### Non-Goals

- 复杂的机器学习分析（如预测模型）
- 实时数据流处理
- 学生行为路径分析

---

## Decisions

### 1. 聚合策略

**决策**: 使用 Prisma 聚合查询 + 内存处理

**理由**:
- 数据规模小，无需引入额外的分析引擎
- 保持技术栈简单
- 查询结果可缓存

**实现方式**:
```typescript
// 按掌握程度分组统计
const masteryDistribution = await prisma.learningRecord.groupBy({
  by: ['mastery_level'],
  where: { user_id: studentId },
  _count: { id: true },
});
```

### 2. 图表类型选择

| 数据类型 | 图表类型 | 理由 |
|----------|----------|------|
| 占比分布 | 饼图/环形图 | 直观展示各部分占比 |
| 时间趋势 | 折线图 | 清晰展示变化趋势 |
| 排名对比 | 柱状图 | 便于比较数值大小 |
| 多维度对比 | 分组柱状图 | 支持多系列数据对比 |

### 3. 数据刷新策略

**决策**: 实时查询，不做缓存

**理由**:
- 数据量小，查询性能足够
- 学习数据实时性要求高
- 避免缓存一致性问题

### 4. 日期分组策略

**决策**: 按天聚合展示趋势

**细节**:
- 最近 7 天：日粒度
- 最近 30 天：日粒度
- 自定义范围：根据跨度自动选择日/周粒度

### 5. ECharts 封装策略

**决策**: 分层封装

```
EChartsWrapper (底层容器)
    ↓
BaseChart (基础配置)
    ↓
PieChart / BarChart / LineChart (特定类型)
    ↓
MasteryDistributionChart / LearningTrendChart (业务组件)
```

### 6. 权限控制

**决策**: 基于角色的数据范围控制

| API | 角色 | 数据范围 |
|-----|------|----------|
| `GET /analytics/student` | 学生 | 仅本人数据 |
| `GET /analytics/student/:id` | 教师/管理员 | 指定学生数据 |
| `GET /analytics/teacher/class` | 教师 | 本人班级 |
| `GET /analytics/teacher/global` | 教师/管理员 | 全部班级 |

---

## API Design

### 学生学习统计

```typescript
// GET /api/analytics/student/overview
interface StudentOverviewResponse {
  totalLearningCount: number;      // 总学习次数
  totalDurationMinutes: number;    // 总学习时长
  uniqueKnowledgePoints: number;   // 已学习知识点数
}

// GET /api/analytics/student/mastery-distribution
interface MasteryDistributionResponse {
  distribution: {
    level: 'A' | 'B' | 'C' | 'D' | 'E';
    count: number;
    percentage: number;
  }[];
}

// GET /api/analytics/student/learning-trend?days=30
interface LearningTrendResponse {
  trend: {
    date: string;                    // YYYY-MM-DD
    durationMinutes: number;
    count: number;
  }[];
}

// GET /api/analytics/student/weak-points?limit=10
interface WeakPointsResponse {
  weakPoints: {
    knowledgePointId: string;
    code: string;
    name: string;
    importanceLevel: 'A' | 'B' | 'C';
    lastMasteryLevel: 'D' | 'E';
    lastLearningDate: string;
  }[];
}
```

### 教师全局统计

```typescript
// GET /api/analytics/teacher/class-overview?classId=xxx
interface ClassOverviewResponse {
  studentCount: number;            // 班级学生数
  activeStudentCount: number;      // 有学习记录的学生数
  avgLearningCount: number;        // 平均学习次数
  avgDurationMinutes: number;      // 平均学习时长
}

// GET /api/analytics/teacher/knowledge-heat?limit=20
interface KnowledgeHeatResponse {
  heatList: {
    knowledgePointId: string;
    code: string;
    name: string;
    learnCount: number;              // 被学习次数
    uniqueStudentCount: number;      // 学习人数
  }[];
}

// GET /api/analytics/teacher/student-comparison?studentIds=1,2,3
interface StudentComparisonResponse {
  students: {
    id: string;
    name: string;
    totalDuration: number;
    masteryStats: { [level: string]: number };
  }[];
}

// POST /api/analytics/teacher/export
interface ExportRequest {
  classId?: string;
  startDate?: string;
  endDate?: string;
  format: 'xlsx' | 'csv';
}
```

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Page    │────▶│  Analytics API  │────▶│   StatsService  │
│                 │     │   (NestJS)      │     │   (Aggregation) │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │                                               ▼
         │                                      ┌─────────────────┐
         │                                      │  Prisma Client  │
         │                                      └────────┬────────┘
         │                                               │
         │                                               ▼
         │                                      ┌─────────────────┐
         │                                      │  PostgreSQL     │
         │                                      │  learning_records
         │                                      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  ECharts Charts │
│  (Visualization)│
└─────────────────┘
```

---

## UI/UX Design

### 学生分析页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  学习概览                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 总学习次数    │ │ 总学习时长    │ │ 已学知识点   │            │
│  │    42       │ │   180分钟    │ │    35       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  掌握情况分布                          学习趋势                 │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │                          │  │                              ││
│  │       饼图/环形图         │  │         折线图                ││
│  │     (A/B/C/D/E占比)      │  │     (近30天学习时长)         ││
│  │                          │  │                              ││
│  └──────────────────────────┘  └──────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  薄弱知识点 (需加强)                                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 知识点编号 │ 知识点名称       │ 重要性 │ 最后掌握程度 │ 时间  ││
│  │  1.1.2    │ 集合的表示法      │   A    │      E      │ 3天前 ││
│  │  2.3.1    │ 函数的定义        │   A    │      D      │ 1周前 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 教师分析页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  班级概览                                         [导出数据]    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 学生人数      │ │ 平均学习次数  │ │ 平均时长     │            │
│  │    45       │ │    38       │ │  160分钟     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  知识点热度排行                                                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                    柱状图                                   ││
│  │          (被学习次数最多的知识点)                            ││
│  └────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  学生对比分析                                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                   分组柱状图                                ││
│  │        (多学生掌握程度分布对比)                              ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据量大时查询慢 | 高 | 添加索引、考虑分页、未来可引入缓存 |
| ECharts 包体积大 | 中 | 按需引入组件、考虑懒加载 |
| 权限边界模糊 | 高 | 明确的 DTO 和 Guard 验证 |

---

## Implementation Notes

1. **数据库索引**: 确保 `learning_records` 表有 `(user_id, created_at)` 复合索引
2. **ECharts 主题**: 使用与 Ant Design 一致的配色方案
3. **响应式**: 图表需适配不同屏幕尺寸
4. **空状态**: 无数据时显示友好的空状态提示
