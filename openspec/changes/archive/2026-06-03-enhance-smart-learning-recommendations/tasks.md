## 1. 配置与基础设施

- [x] 1.1 在 `server/src/modules/smart-learning/` 下创建 `recommendation.config.ts`，定义评分参数的配置 Schema（decayPerDay, decayMax, recentPenalty, frequencyWindowDays, importanceWeightA/B/C, velocityMultiplier）
- [x] 1.2 在 `SmartLearningModule` 中注册 `ConfigModule`，读取环境变量并注入到 `SmartLearningService`
- [x] 1.3 在根目录 `.env.example` 中新增推荐参数的环境变量示例

## 2. 后端评分算法核心

- [x] 2.1 在 `server/src/modules/smart-learning/` 下创建 `recommendation-scorer.ts`，实现 `RecommendationScore` 接口和评分计算函数
- [x] 2.2 实现 `calculateBaseScore(masteryLevel)` 函数：A=10, B=20, C=40, D=70, E=100
- [x] 2.3 实现 `calculateDecayBonus(latestStartTime, config)` 函数：daysSince * decayPerDay，上限 decayMax
- [x] 2.4 实现 `calculateRecentStudyPenalty(records, config)` 函数：最近 frequencyWindowDays 天内有记录则返回 recentPenalty，否则 0
- [x] 2.5 实现 `calculateImportanceWeight(importanceLevel, config)` 函数：A=weightA, B=weightB, C=weightC
- [x] 2.6 实现 `calculateImprovementVelocity(records, config)` 函数：最近两次掌握度数值差（A=5,B=4,C=3,D=2,E=1），乘以 velocityMultiplier，不足两次返回 0
- [x] 2.7 实现 `calculateFinalScore(score)` 函数：(base + decay - penalty - velocity) * importanceWeight
- [x] 2.8 实现 `generateRecommendationReason(score)` 函数：按优先级匹配规则生成推荐理由字符串
- [ ] 2.9 实现 `masteryLevelToNumeric(level)` 和 `numericToMasteryLevel(num)` 辅助函数
  - `masteryLevelToNumeric` 已实现并在多处使用
  - `numericToMasteryLevel` 未实现（代码库中无调用方，按 YAGNI 原则未添加）

## 3. 后端服务层改造

- [x] 3.1 重构 `SmartLearningService.getWeakPoints()`：先查询非已掌握知识点，批量获取最近学习记录，调用评分函数排序，返回带推荐理由的结果
- [x] 3.2 重构 `SmartLearningService.getByImportance()`：过滤目标级别未掌握知识点，批量获取最近学习记录，调用评分函数排序，返回带 `learningRecord` 和 `recommendationReason` 的结果
- [x] 3.3 在 `SmartLearningService` 中实现批量查询辅助函数 `getRecentRecordsForCandidates(userId, candidateIds)`，避免 N+1
- [x] 3.4 更新 `WeakPointItem` 和 `ByImportanceItem` 接口，增加 `recommendationReason: string` 字段
- [x] 3.5 在 `SmartLearningService` 中实现预过滤逻辑：候选集超过 500 时按 startTime 升序取前 200
- [x] 3.6 在 `SmartLearningService` 中实现零记录学生回退逻辑

## 4. 后端 API 与 DTO

- [x] 4.1 在 `server/src/modules/smart-learning/dto/` 下创建 `smart-learning-response.dto.ts`，定义 `WeakPointResponseDto` 和 `ByImportanceResponseDto`
- [x] 4.2 `WeakPointResponseDto` 包含 `recommendationReason: string` 字段，加 `@ApiProperty()` 装饰器
- [x] 4.3 `ByImportanceResponseDto` 包含 `learningRecord` 和 `recommendationReason` 字段，加 `@ApiProperty()` 装饰器
- [x] 4.4 更新 `SmartLearningController`，使用新的响应 DTO 替代直接返回 service 结果
- [x] 4.5 验证 Swagger 文档中正确显示新增字段

## 5. 前端展示

- [x] 5.1 更新 `web/src/components/smart-learning/WeakPointView.tsx`，在知识点卡片中展示 `recommendationReason`（一行灰色小字，位于知识点名称下方）
- [x] 5.2 更新 `web/src/components/smart-learning/ImportanceView.tsx`，在知识点卡片中展示 `recommendationReason`
- [x] 5.3 更新前端 `ByImportanceItem` 类型，增加 `learningRecord` 和 `recommendationReason` 字段
- [x] 5.4 更新前端 API 类型定义，确保 `WeakPointItem` 包含 `recommendationReason`
- [x] 5.5 验证 `RandomView` 保持不变，不展示推荐理由

## 6. 单元测试

- [x] 6.1 为 `calculateBaseScore` 编写测试，覆盖所有掌握度级别
- [x] 6.2 为 `calculateDecayBonus` 编写测试，覆盖正常计算和上限截断
- [x] 6.3 为 `calculateRecentStudyPenalty` 编写测试，覆盖"近期学过"和"未学过"两种情况
- [x] 6.4 为 `calculateImportanceWeight` 编写测试，覆盖 A/B/C 三种权重
- [x] 6.5 为 `calculateImprovementVelocity` 编写测试，覆盖进步、退步、不变、记录不足四种情况
- [x] 6.6 为 `calculateFinalScore` 编写测试，验证公式正确性（特别是退步时优先级提升的场景）
- [x] 6.7 为 `generateRecommendationReason` 编写测试，验证按优先级匹配规则
- [x] 6.8 为 `SmartLearningService.getWeakPoints()` 编写集成测试，验证新排序逻辑和推荐理由
- [x] 6.9 为 `SmartLearningService.getByImportance()` 编写集成测试，验证返回结果包含 `learningRecord` 和 `recommendationReason`
- [x] 6.10 为预过滤逻辑（>500 候选集）编写测试
- [x] 6.11 为零记录学生回退逻辑编写测试
- [x] 6.12 为平局打破规则编写测试

## 7. 质量门禁

- [x] 7.1 运行 `pnpm typecheck`，确保零类型错误
  - smart-learning 模块零错误；analytics 模块有 pre-existing 错误，与本次改动无关
- [x] 7.2 运行 `pnpm lint`，确保无 lint 错误
- [x] 7.3 运行 `pnpm test`，确保所有测试通过
  - server 46/46 通过；web 有 8 个 pre-existing 失败，与本次改动无关
- [x] 7.4 手动验证：进入弱项学习模式，确认推荐列表按新算法排序，每个推荐显示推荐理由
- [x] 7.5 手动验证：进入重要性学习模式，确认推荐列表按新算法排序，每个推荐显示推荐理由
- [x] 7.6 手动验证：随机学习模式不受任何影响
