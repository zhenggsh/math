# Design: 智能学习模式

## Context

智能学习模式基于已有的学习记录系统，通过分析用户对知识点的掌握程度（A/B/C/D/E 评级），提供个性化的学习推荐。

### 已有基础
- `LearningRecord` 表：存储用户对每个知识点的学习记录和掌握程度
- `KnowledgePoint` 表：存储知识点基本信息（包含重要性级别 A/B/C）
- 用户认证系统：可识别当前用户

### 待解决问题
1. 如何高效查询用户的薄弱知识点？
2. 如何设计推荐算法平衡"薄弱点优先"和"重要性优先"？
3. 如何提供流畅的模式切换体验？

## Goals

### 功能目标
| 目标 | 说明 | 优先级 |
|------|------|--------|
| 薄弱点学习 | 筛选掌握程度为 C/D/E 的知识点，E 级优先 | P0 |
| 重要性分级学习 | 按 A→B→C 顺序推荐知识点 | P0 |
| 随机学习 | 随机输出指定数量的知识点 | P0 |
| 模式切换 | 提供直观的学习模式选择界面 | P1 |
| 学习路径推荐 | 基于当前薄弱点生成学习路径 | P2 |

### 非功能目标
- 查询响应时间 < 500ms
- 支持至少 10000 条学习记录的快速筛选

## Decisions

### 1. 推荐算法设计

#### 薄弱点筛选算法
```
输入: userId, textbookId?, chapterId?
输出: 薄弱知识点列表

步骤:
1. 查询该用户的所有学习记录
2. 筛选 proficiency_level IN ['C', 'D', 'E']
3. 按 proficiency_level 排序（E > D > C）
4. 同级别按 last_studied_at 升序（较早学习的优先复习）
5. 返回知识点详情列表
```

#### 重要性分级算法
```
输入: userId, importanceLevel?, limit?
输出: 知识点列表

步骤:
1. 查询指定重要性级别的知识点
2. 排除已掌握（A级）的知识点（可选）
3. 按编号顺序返回
```

#### 随机选择算法
```
输入: userId, limit?
输出: 随机知识点列表

步骤:
1. 查询所有知识点
2. 使用数据库随机函数（PostgreSQL: RANDOM()）
3. 限制返回数量（默认 10）
4. 返回结果
```

### 2. 数据库查询优化

#### 索引设计
```sql
-- 学习记录查询优化
CREATE INDEX idx_learning_record_user_proficiency 
ON learning_records(user_id, proficiency_level);

CREATE INDEX idx_learning_record_user_date 
ON learning_records(user_id, last_studied_at);

-- 知识点查询优化
CREATE INDEX idx_knowledge_point_importance 
ON knowledge_points(importance_level);
```

### 3. UI 交互设计

#### 模式选择界面
```
┌─────────────────────────────────────────────────────┐
│  学习模式                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 薄弱点   │ │ 重要性   │ │ 随机     │            │
│  │ 学习     │ │ 分级     │ │ 学习     │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  [当前模式内容区域]                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 交互流程
1. 用户点击模式卡片选择学习模式
2. 右侧/下方显示对应的知识点列表
3. 点击知识点进入学习详情页
4. 学习完成后返回列表，自动移除/更新该知识点

### 4. 组件架构

```
SmartLearningPage
├── LearningModeSelector (模式选择器)
│   ├── WeakPointCard
│   ├── ImportanceCard
│   └── RandomCard
├── WeakPointView (薄弱点视图)
│   ├── WeakPointStats (统计)
│   └── KnowledgePointList
├── ImportanceView (重要性视图)
│   ├── ImportanceFilter (A/B/C 筛选)
│   └── KnowledgePointList
└── RandomView (随机视图)
    ├── RandomSettings (数量设置)
    └── KnowledgePointList
```

### 5. API 设计

#### GET /api/smart-learning/weak-points
```typescript
interface WeakPointsQuery {
  textbookId?: string;  // 可选，筛选特定教材
  limit?: number;       // 默认 20
}

interface WeakPointsResponse {
  total: number;
  items: {
    knowledgePoint: KnowledgePoint;
    learningRecord: LearningRecord;
    priority: number;  // 优先级分数
  }[];
}
```

#### GET /api/smart-learning/by-importance
```typescript
interface ByImportanceQuery {
  level?: 'A' | 'B' | 'C';  // 不指定则按 A→B→C 返回
  excludeMastered?: boolean; // 默认 true，排除已掌握的
  limit?: number;
}

interface ByImportanceResponse {
  level: 'A' | 'B' | 'C';
  total: number;
  items: KnowledgePoint[];
}
```

#### GET /api/smart-learning/random
```typescript
interface RandomQuery {
  textbookId?: string;
  count?: number;  // 默认 10
}

interface RandomResponse {
  items: KnowledgePoint[];
}
```

## References

- 项目规范: `.agents/skills/project-rule/SKILL.md`
- API 规范: `AGENTS.md` 中 API 设计规范章节
