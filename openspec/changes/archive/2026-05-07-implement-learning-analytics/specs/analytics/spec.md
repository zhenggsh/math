# Spec: analytics

> **Capability**: analytics  
> **Change**: implement-learning-analytics  
> **Status**: Draft  
> **Created**: 2026-03-14

---

## Overview

学习数据分析能力，提供学生和教师两个视角的学习数据可视化分析功能。

---

## Requirements

### R1: 学习次数统计

**描述**: 统计用户的学习记录数量

**验收标准**:
- [ ] 学生可以查看自己的总学习次数
- [ ] 教师可以查看班级平均学习次数
- [ ] 统计基于 `learning_records` 表的记录数

**API**:
```typescript
// GET /api/analytics/student/overview
// Response
{
  "totalLearningCount": 42,
  "totalDurationMinutes": 180,
  "uniqueKnowledgePoints": 35
}
```

---

### R2: 学习时长统计

**描述**: 统计用户的累计学习时长

**验收标准**:
- [ ] 学生可以查看总学习时长（分钟）
- [ ] 支持按时间段统计（日、周、月）
- [ ] 展示学习时长趋势图

**API**:
```typescript
// GET /api/analytics/student/learning-trend?days=30
// Response
{
  "trend": [
    { "date": "2026-03-01", "durationMinutes": 45, "count": 3 },
    { "date": "2026-03-02", "durationMinutes": 30, "count": 2 }
  ]
}
```

---

### R3: 掌握情况分布统计

**描述**: 统计用户对知识点的掌握程度分布（A/B/C/D/E）

**验收标准**:
- [ ] 按掌握程度级别分组统计
- [ ] 计算各级别占比
- [ ] 使用饼图/环形图展示

**API**:
```typescript
// GET /api/analytics/student/mastery-distribution
// Response
{
  "distribution": [
    { "level": "A", "count": 15, "percentage": 42.9 },
    { "level": "B", "count": 10, "percentage": 28.6 },
    { "level": "C", "count": 5, "percentage": 14.3 },
    { "level": "D", "count": 3, "percentage": 8.6 },
    { "level": "E", "count": 2, "percentage": 5.7 }
  ]
}
```

---

### R4: 薄弱知识点识别

**描述**: 识别用户掌握程度较低的知识点

**验收标准**:
- [ ] 筛选掌握程度为 D/E 的知识点
- [ ] 按重要性级别（A/B/C）排序
- [ ] 显示最近学习时间和掌握程度

**API**:
```typescript
// GET /api/analytics/student/weak-points?limit=10
// Response
{
  "weakPoints": [
    {
      "knowledgePointId": "kp-001",
      "code": "1.1.2",
      "name": "集合的表示法",
      "importanceLevel": "A",
      "lastMasteryLevel": "E",
      "lastLearningDate": "2026-03-10T10:30:00Z"
    }
  ]
}
```

---

### R5: 知识点热度统计

**描述**: 统计各知识点被学习的热度

**验收标准**:
- [ ] 统计每个知识点被学习的总次数
- [ ] 统计学习该知识点的独立学生数
- [ ] 展示热度排行榜

**API**:
```typescript
// GET /api/analytics/teacher/knowledge-heat?limit=20
// Response
{
  "heatList": [
    {
      "knowledgePointId": "kp-001",
      "code": "1.1.1",
      "name": "集合的含义",
      "learnCount": 156,
      "uniqueStudentCount": 42
    }
  ]
}
```

---

### R6: 班级学习概览

**描述**: 教师查看班级整体学习情况

**验收标准**:
- [ ] 显示班级学生总数和活跃学生数
- [ ] 显示班级平均学习次数和时长
- [ ] 支持按班级筛选

**API**:
```typescript
// GET /api/analytics/teacher/class-overview?classId=class-001
// Response
{
  "studentCount": 45,
  "activeStudentCount": 38,
  "avgLearningCount": 38.5,
  "avgDurationMinutes": 160
}
```

---

### R7: 学生对比分析

**描述**: 教师对比多个学生的学习情况

**验收标准**:
- [ ] 支持选择多个学生进行对比
- [ ] 对比维度包括：学习时长、掌握分布
- [ ] 使用分组柱状图展示

**API**:
```typescript
// GET /api/analytics/teacher/student-comparison?studentIds=s1,s2,s3
// Response
{
  "students": [
    {
      "id": "s1",
      "name": "张三",
      "totalDuration": 180,
      "masteryStats": { "A": 15, "B": 10, "C": 5, "D": 3, "E": 2 }
    }
  ]
}
```

---

### R8: ECharts 图表展示

**描述**: 使用 ECharts 实现数据可视化

**验收标准**:
- [ ] 封装统一的 ECharts 容器组件
- [ ] 实现 PieChart、BarChart、LineChart 基础组件
- [ ] 实现业务组件：MasteryDistributionChart、LearningTrendChart 等
- [ ] 图表主题与 Ant Design 配色一致

**组件清单**:
| 组件 | 用途 |
|------|------|
| `EChartsWrapper` | 通用图表容器，处理初始化/销毁 |
| `PieChart` | 饼图基础组件 |
| `BarChart` | 柱状图基础组件 |
| `LineChart` | 折线图基础组件 |
| `MasteryDistributionChart` | 掌握分布饼图 |
| `LearningTrendChart` | 学习趋势折线图 |
| `KnowledgeHeatChart` | 知识点热度柱状图 |
| `StudentComparisonChart` | 学生对比分组柱状图 |

---

### R9: 数据导出功能

**描述**: 教师可以导出学习数据

**验收标准**:
- [ ] 支持导出为 Excel (.xlsx) 格式
- [ ] 支持导出为 CSV 格式
- [ ] 可指定时间范围和班级

**API**:
```typescript
// POST /api/analytics/teacher/export
// Request
{
  "classId": "class-001",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "format": "xlsx"
}
// Response: File download
```

---

### R10: 权限控制

**描述**: 根据角色控制数据访问权限

**验收标准**:
- [ ] 学生只能查看自己的分析数据
- [ ] 教师可以查看所教班级的数据
- [ ] 管理员可以查看全部数据

**权限矩阵**:
| API | 学生 | 教师 | 管理员 |
|-----|------|------|--------|
| GET /analytics/student/* | 本人 | 所教学生 | 全部 |
| GET /analytics/teacher/* | ✗ | 所教班级 | 全部 |
| POST /analytics/teacher/export | ✗ | 所教班级 | 全部 |

---

## Data Models

### DTOs

```typescript
// 学生概览响应
interface StudentOverviewDto {
  totalLearningCount: number;
  totalDurationMinutes: number;
  uniqueKnowledgePoints: number;
}

// 掌握分布响应
interface MasteryDistributionDto {
  distribution: Array<{
    level: 'A' | 'B' | 'C' | 'D' | 'E';
    count: number;
    percentage: number;
  }>;
}

// 学习趋势响应
interface LearningTrendDto {
  trend: Array<{
    date: string;
    durationMinutes: number;
    count: number;
  }>;
}

// 薄弱知识点响应
interface WeakPointsDto {
  weakPoints: Array<{
    knowledgePointId: string;
    code: string;
    name: string;
    importanceLevel: 'A' | 'B' | 'C';
    lastMasteryLevel: 'D' | 'E';
    lastLearningDate: string;
  }>;
}

// 班级概览响应
interface ClassOverviewDto {
  studentCount: number;
  activeStudentCount: number;
  avgLearningCount: number;
  avgDurationMinutes: number;
}

// 知识点热度响应
interface KnowledgeHeatDto {
  heatList: Array<{
    knowledgePointId: string;
    code: string;
    name: string;
    learnCount: number;
    uniqueStudentCount: number;
  }>;
}

// 学生对比响应
interface StudentComparisonDto {
  students: Array<{
    id: string;
    name: string;
    totalDuration: number;
    masteryStats: Record<string, number>;
  }>;
}
```

---

## Error Handling

| 场景 | HTTP 状态码 | 错误信息 |
|------|-------------|----------|
| 无权限访问 | 403 | "无权访问该学生数据" |
| 学生不存在 | 404 | "学生不存在" |
| 班级不存在 | 404 | "班级不存在" |
| 日期格式错误 | 400 | "日期格式错误，请使用 YYYY-MM-DD" |
| 无效的时间范围 | 400 | "结束日期不能早于开始日期" |

---

## Performance Requirements

- 单次统计查询响应时间 < 500ms
- 图表渲染时间 < 200ms
- 数据导出支持最多 10000 条记录
