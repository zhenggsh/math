# Spec: Smart Learning Capability

## Overview

智能学习模式能力，提供薄弱点学习、重要性分级学习和随机学习三种模式，帮助学生高效规划学习路径。

## Requirements

### R1: 薄弱知识点查询

**R1.1** 系统应能根据用户ID查询其薄弱知识点
- 定义：掌握程度为 C（一般）、D（较差）、E（未掌握）的知识点
- 排序规则：E > D > C，同级别按最后学习时间升序

**R1.2** 系统应支持按教材筛选薄弱知识点
- 输入参数：textbookId（可选）
- 只返回指定教材下的薄弱知识点

**R1.3** 系统应支持按章节筛选薄弱知识点
- 输入参数：chapterId（可选）
- 只返回指定章节下的薄弱知识点

**R1.4** 系统应返回薄弱知识点的优先级分数
- E 级：优先级 100
- D 级：优先级 80
- C 级：优先级 60
- 超过 7 天未复习：额外 +10 分

### R2: 按重要性级别查询

**R2.1** 系统应支持按重要性级别筛选知识点
- A 类：必须掌握的核心知识点
- B 类：重要但非核心的知识点
- C 类：补充性知识点

**R2.2** 系统应支持按顺序获取所有级别的知识点
- 默认顺序：A → B → C
- 支持指定单个级别查询

**R2.3** 系统应支持排除已完全掌握的知识点
- 默认排除掌握程度为 A 的知识点
- 可通过参数控制是否排除

### R3: 随机知识点查询

**R3.1** 系统应能随机返回指定数量的知识点
- 默认数量：10 个
- 支持自定义数量（1-50）

**R3.2** 系统应支持按教材随机筛选
- 输入参数：textbookId（可选）
- 只在指定教材范围内随机

**R3.3** 系统应确保随机结果的均匀分布
- 使用数据库随机函数实现
- 避免连续多次随机到同一知识点（基于会话去重）

### R4: 学习模式切换界面

**R4.1** 界面应提供三种学习模式的入口
- 薄弱点学习模式
- 重要性分级学习模式
- 随机学习模式

**R4.2** 模式选择器应显示各模式的统计信息
- 薄弱点模式：显示薄弱知识点数量
- 重要性模式：显示各级别知识点数量
- 随机模式：显示可选总数

**R4.3** 界面应支持模式间的快速切换
- 切换时保留当前模式的筛选状态
- 切换动画时长不超过 300ms

### R5: 学习路径推荐

**R5.1** 系统应基于薄弱点生成学习路径
- 优先推荐 E 级知识点
- 同等级按依赖关系排序（如有）
- 默认路径长度：5-10 个知识点

**R5.2** 系统应支持学习路径的导出
- 导出为学习计划列表
- 支持添加到个人学习计划

## API Specification

### GET /api/smart-learning/weak-points

获取用户的薄弱知识点列表。

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| textbookId | string | 否 | 教材ID |
| chapterId | string | 否 | 章节ID |
| limit | number | 否 | 返回数量，默认 20 |

**Response:**
```json
{
  "code": 200,
  "data": {
    "total": 15,
    "items": [
      {
        "knowledgePoint": {
          "id": "kp-001",
          "code": "1.1.1",
          "name": "集合的含义",
          "importanceLevel": "A",
          "chapterId": "ch-001"
        },
        "learningRecord": {
          "id": "lr-001",
          "proficiencyLevel": "E",
          "lastStudiedAt": "2026-03-10T08:00:00Z",
          "studyCount": 1
        },
        "priority": 110
      }
    ]
  }
}
```

### GET /api/smart-learning/by-importance

按重要性级别获取知识点。

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| level | 'A' \| 'B' \| 'C' | 否 | 指定级别，不指定则返回全部 |
| excludeMastered | boolean | 否 | 排除已掌握，默认 true |
| limit | number | 否 | 每级别返回数量，默认 20 |

**Response:**
```json
{
  "code": 200,
  "data": {
    "groups": [
      {
        "level": "A",
        "total": 25,
        "items": [...]
      },
      {
        "level": "B",
        "total": 18,
        "items": [...]
      }
    ]
  }
}
```

### GET /api/smart-learning/random

获取随机知识点。

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| textbookId | string | 否 | 教材ID |
| count | number | 否 | 随机数量，默认 10，最大 50 |

**Response:**
```json
{
  "code": 200,
  "data": {
    "items": [...],
    "seed": 12345
  }
}
```

## Data Models

### SmartLearningQuery (DTO)
```typescript
interface SmartLearningQuery {
  textbookId?: string;
  chapterId?: string;
  limit?: number;
}
```

### WeakPointResult
```typescript
interface WeakPointResult {
  knowledgePoint: KnowledgePoint;
  learningRecord: LearningRecord;
  priority: number;
}
```

### ImportanceGroup
```typescript
interface ImportanceGroup {
  level: 'A' | 'B' | 'C';
  total: number;
  items: KnowledgePoint[];
}
```

## Error Handling

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 参数错误 | 检查 limit/count 是否在有效范围 |
| 401 | 未认证 | 引导用户登录 |
| 404 | 教材/章节不存在 | 检查 textbookId/chapterId 有效性 |
| 500 | 服务器错误 | 重试或联系管理员 |

## Performance Requirements

- 薄弱点查询响应时间 < 300ms
- 重要性查询响应时间 < 200ms
- 随机查询响应时间 < 200ms
- 支持并发用户 > 100

## Testing Requirements

### 单元测试
- SmartLearningService 所有方法覆盖率 > 80%
- 边界条件：无学习记录、无薄弱点、参数边界

### 集成测试
- API 端到端测试
- 数据库查询性能测试

### E2E 测试
- 模式切换流程
- 学习路径生成流程
