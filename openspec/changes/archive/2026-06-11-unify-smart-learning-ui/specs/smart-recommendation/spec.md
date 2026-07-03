## ADDED Requirements

### Requirement: 推荐数据支持趋势展示
推荐 API 响应 SHALL 包含足够的数据，供前端计算掌握度趋势。

#### Scenario: API 返回改进速度
- **WHEN** 前端请求弱项学习或重要性学习数据
- **THEN** 响应中的每个知识点对象 SHALL 包含 `improvementVelocity` 字段
- **AND** 该字段 SHALL 直接复用后端评分模型中已计算的进步速度值

### Requirement: 推荐列表受教材范围约束
智能学习页面的推荐列表 SHALL 仅展示全局教材选择器当前选中的教材范围内的知识点。

#### Scenario: 用户选择特定教材
- **GIVEN** 用户在全局教材选择器中选择了教材 A 和教材 B
- **WHEN** 用户打开智能学习页面
- **THEN** 薄弱点/重要性/随机三种模式的推荐列表 SHALL 仅包含教材 A 和教材 B 的知识点
- **AND** 不属于选中教材的知识点 SHALL 被过滤掉

#### Scenario: 用户未选择任何教材
- **GIVEN** 用户未在全局教材选择器中选择任何教材
- **WHEN** 用户打开智能学习页面
- **THEN** 推荐列表 SHALL 显示空状态，提示用户先选择教材

## MODIFIED Requirements

（本次变更的推荐算法逻辑、评分模型或 API 契约不做修改。教材过滤在前端实现，后端保持现有行为。）
