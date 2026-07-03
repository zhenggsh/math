## Context

当前 `SmartLearningService` 的推荐逻辑过于简单：

- `getWeakPoints`: 按 `masteryLevel: 'desc'` + `startTime: 'asc'` 排序
- `getByImportance`: 按 `importanceLevel` 过滤 + 排除 `masteryLevel === 'A'` 的知识点
- `getRandomPoints`: 随机排序

这些规则没有利用 `LearningRecord` 中的时间维度（遗忘曲线）、频次维度（重复学习惩罚）和趋势维度（进步/退步速度）。同时，分析页面展示了丰富的统计数据，但学生很少主动查看。分析数据应该隐形地驱动推荐，而不是等待学生来阅读。

## Goals / Non-Goals

**Goals:**
- 用多维评分模型替代当前简单的排序规则
- 每个推荐附带可解释的推荐理由
- 评分参数可配置，支持上线后调优
- 推荐算法有完整的单元测试覆盖

**Non-Goals:**
- 不修改数据库 Schema
- 不引入机器学习模型（基于规则的评分即可）
- 不改动分析页面的展示逻辑
- 不改动随机学习模式
- 不引入 A/B 测试框架

## Decisions

### Decision 1: 纯后端改动，前端仅增加推荐理由展示

**Rationale**: 最小化改动范围。推荐算法的核心变化在后端，前端只需在知识点卡片中展示一行推荐理由文字。这符合"先让引擎变聪明，再让用户感受到"的渐进策略。

**Alternative considered**: 方案 B（嵌入式分析）需要前后端大量改动，延迟上线时间。

### Decision 2: 基于规则的加权评分，而非机器学习

**Rationale**: 当前数据量（`LearningRecord` 的 5 个维度）不足以支撑有意义的 ML 模型。基于规则的评分更透明、可解释、可调试。参数通过环境变量配置，可以根据反馈快速调整。

**Alternative considered**: 协同过滤或序列模型——需要更多用户数据和更长的训练周期，不适合当前阶段。

### Decision 3: 环境变量配置评分参数

**Rationale**: 评分公式中的权重（每天+2分、上限30、惩罚15分等）是经验值，需要根据真实使用数据调整。NestJS `ConfigModule` 可以让运维人员在不停机的情况下调整参数。

**Alternative considered**: 数据库表存储配置——增加了不必要的复杂度和查询开销。环境变量足够。

### Decision 4: `improvementVelocity` 退步时提升优先级

**Rationale**: 如果学生在某个知识点上退步了（最新掌握度低于上一次），说明需要巩固，优先级应该提高。进步的学生可以暂时降低优先级，让位给更需要复习的知识点。

**Alternative considered**: 进步也提升优先级——会导致学生反复学习已经掌握的知识点，浪费时间。

### Decision 5: 批量查询避免 N+1

**Rationale**: 计算 `improvementVelocity` 需要每个知识点的最近两次学习记录。对每个候选知识点单独查询会产生 N+1 问题。使用单个 `findMany` 查询所有候选知识点的记录，在内存中按 `knowledgePointId` 分组。

## Risks / Trade-offs

- **[Risk] 评分参数需要调优** → **Mitigation**: 参数通过环境变量配置，默认值基于教育领域经验值。上线后观察 2 周，根据使用数据调整。
- **[Risk] 大课本场景下候选集过大（500+ 知识点）** → **Mitigation**: 预过滤策略——先按 `startTime` 升序取前 200 个最久未学的候选知识点，再对这 200 个做评分排序。
- **[Risk] 零记录学生看到空弱项列表** → **Mitigation**: 弱项学习对新学生返回空列表是合理的（确实没有弱项）。重要性学习对新学生返回该级别的所有知识点。
- **[Trade-off] 分析仍然藏在后台** → 这是方案 A 的已知局限。方案 B（嵌入式分析）会解决这个问题，但不在本次范围内。

## Migration Plan

1. 后端部署：新评分逻辑是服务端计算，不涉及数据迁移。部署新版本后，API 响应自动包含 `recommendationReason` 字段。
2. 前端部署：前端展示推荐理由的改动是向后兼容的——旧前端忽略新增的 `recommendationReason` 字段，新前端展示它。可以独立部署。
3. 回滚：如果推荐效果不理想，将环境变量恢复为等效当前行为的值（如 `decayBonus = 0`、`recentStudyPenalty = 0`、`importanceWeight` 全部设为 1.0），即可退回到近似当前的排序逻辑。

## Open Questions

1. 默认参数是否适合大多数学生？需要上线后收集数据验证。
2. 是否需要根据学科/课本调整参数？当前设计是全局参数，未来可考虑按课本配置。
