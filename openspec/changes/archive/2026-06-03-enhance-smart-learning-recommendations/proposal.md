## Why

当前系统的智能学习推荐逻辑过于机械：弱项学习仅按 `masteryLevel` 降序 + `startTime` 升序排序；重要性学习仅按重要性级别过滤 + 排除已掌握的知识点。分析页面展示了丰富的学习数据，但学生很少主动查看，分析与推荐之间完全断裂。我们需要将分析数据作为输入，驱动智能学习做出更精准、更可解释的推荐。

## What Changes

- 增强 `SmartLearningService` 的推荐算法，引入多维评分模型（掌握度 + 遗忘时间 + 近期惩罚 + 重要性权重 + 进步速度）
- 弱项学习和重要性学习的推荐结果按新评分模型排序
- API 响应增加 `recommendationReason` 字段，为每个推荐提供可解释的理由
- 前端智能学习列表展示推荐理由
- 评分参数通过环境变量配置，支持调优

## Capabilities

### New Capabilities
- `smart-recommendation`: 智能推荐引擎的评分算法、推荐理由生成、参数配置机制

### Modified Capabilities
- （无 spec-level 需求变更。`LearningRecord` 作为现有数据模型继续作为输入源，但查询模式变化属于实现细节，不在 spec 层面体现）

## Impact

- **后端**：`server/src/modules/smart-learning/smart-learning.service.ts` 核心推荐逻辑重写
- **后端**：新增评分算法工具函数和配置参数
- **API**：`WeakPointItem` 和 `ByImportanceItem` 响应增加 `recommendationReason` 字段
- **前端**：`web/src/components/smart-learning/WeakPointView.tsx` 和 `ImportanceView.tsx` 展示推荐理由
- **配置**：新增 NestJS `ConfigModule` 环境变量（评分权重参数）
- **测试**：新增推荐评分算法单元测试
- **无数据库 Schema 变更**
