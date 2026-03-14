# Proposal: 智能学习模式实现

## Why

当前系统仅支持用户手动浏览知识点进行学习，缺乏针对性的学习推荐功能。学生在学习过程中需要：

1. **查漏补缺**：针对掌握不牢的知识点进行强化学习
2. **优先级排序**：按知识点重要性合理分配学习时间
3. **打破惯性**：通过随机学习拓宽知识覆盖面

实现智能学习模式能够：
- 提高学习效率，让学生聚焦于薄弱环节
- 帮助建立科学的学习路径规划
- 增加学习趣味性，避免单一的学习方式

## What Changes

### 1. 薄弱点学习模式
- 基于学习记录筛选掌握程度为 C/D/E 的知识点
- 按掌握程度排序（E → D → C）
- 支持按学科/章节进一步筛选

### 2. 重要性分级学习模式
- 按 A→B→C 重要性级别顺序推荐知识点
- A类：必须掌握的核心知识点
- B类：重要但非核心的知识点
- C类：补充性知识点

### 3. 随机学习模式
- 从全部知识点中随机抽取
- 支持设置随机数量（默认 5/10/20 个）
- 避免连续随机到同一知识点

## Capabilities

| Capability | Description | Priority |
|------------|-------------|----------|
| `smart-learning` | 智能学习模式核心能力，包含薄弱点、分级、随机三种学习模式 | P0 |

## Impact

### 新增组件/模块
| 层级 | 名称 | 说明 |
|------|------|------|
| 前端 | `LearningModeSelector` | 学习模式选择器组件 |
| 前端 | `WeakPointView` | 薄弱点学习视图 |
| 前端 | `ImportanceView` | 重要性分级学习视图 |
| 前端 | `RandomView` | 随机学习视图 |
| 后端 | `SmartLearningService` | 智能学习推荐服务 |
| 后端 | `SmartLearningController` | 智能学习 API 控制器 |

### API 变更
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/smart-learning/weak-points` | 获取薄弱知识点列表 |
| GET | `/api/smart-learning/by-importance` | 按重要性获取知识点 |
| GET | `/api/smart-learning/random` | 获取随机知识点 |

### 依赖变更
- 依赖前置变更 `implement-learning-record`（已完成）
- 需要访问 `LearningRecord` 表查询掌握程度数据

## References

- 前置变更: `implement-learning-record` - 学习记录功能已实现
- 知识点重要性级别定义: `doc/prompt/iksm_hierichy.md`
