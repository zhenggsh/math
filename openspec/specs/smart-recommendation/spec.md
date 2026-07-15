## ADDED Requirements

### Requirement: 推荐评分算法
智能学习系统的推荐引擎 SHALL 使用多维评分模型对候选知识点进行排序。

#### Scenario: 弱项学习推荐排序
- **WHEN** 学生进入弱项学习模式
- **THEN** 系统 SHALL 计算每个非已掌握知识点的评分，按评分降序返回推荐列表

#### Scenario: 重要性学习推荐排序
- **WHEN** 学生进入重要性学习模式并选择某一重要性级别
- **THEN** 系统 SHALL 计算该级别所有未掌握知识点的评分，按评分降序返回推荐列表

### Requirement: 评分模型维度
评分模型 SHALL 包含以下维度：

#### Scenario: 掌握度基础分
- **WHEN** 系统计算知识点评分
- **THEN** 基础分 SHALL 根据最近一次学习记录的掌握度确定：A=10, B=20, C=40, D=70, E=100

#### Scenario: 遗忘时间加成
- **WHEN** 系统计算知识点评分
- **THEN** 遗忘时间加成 SHALL 为距离上次学习的天数乘以每天分值（默认 2 分），上限为最大分值（默认 30 分）

#### Scenario: 近期学习惩罚
- **WHEN** 知识点在最近 7 天内存在学习记录
- **THEN** 系统 SHALL 减去固定惩罚值（默认 15 分），与具体学习次数无关

#### Scenario: 重要性权重
- **WHEN** 系统计算最终评分
- **THEN** 加权基础分 SHALL 乘以重要性权重：A 级重要性 = 1.5，B 级 = 1.2，C 级 = 1.0

#### Scenario: 进步速度调整
- **WHEN** 知识点有至少两次学习记录
- **THEN** 系统 SHALL 计算最近两次掌握度的数值差（A=5, B=4, C=3, D=2, E=1），进步降低优先级（相减），退步提升优先级（负负得正）
- **WHEN** 知识点不足两次学习记录
- **THEN** 进步速度 SHALL 设为 0

### Requirement: 评分公式
系统 SHALL 使用以下公式计算最终评分：

#### Scenario: 标准评分计算
- **WHEN** 所有维度计算完成
- **THEN** 最终评分 SHALL 按以下公式计算：
  ```
  weightedBase = baseScore + decayBonus - recentStudyPenalty - improvementVelocity
  finalScore = weightedBase * importanceWeight
  ```
  其中 `improvementVelocity` 正值表示进步（降低优先级），负值表示退步（提升优先级）

#### Scenario: 评分可配置
- **WHEN** 系统启动
- **THEN** 所有评分参数 SHALL 从环境变量读取，支持不重启服务调整（通过容器重启或配置重载）

### Requirement: 推荐理由生成
每个推荐知识点 SHALL 附带一条可解释的推荐理由。

#### Scenario: 推荐理由按优先级匹配
- **WHEN** 系统生成推荐理由
- **THEN** SHALL 按以下优先级选择第一条匹配的规则：
  1. 近期学习过 → "近期已学习过，建议先复习其他知识点"
  2. 遗忘时间 >= 10 天 → "距离上次学习已超过 10 天，建议复习"
  3. 掌握度为 D 或 E → "掌握度较低，需要加强"
  4. 近期退步 → "近期掌握度下降，需要巩固"
  5. A 级重要性 → "重要知识点，优先掌握"
  6. 默认 → "根据你的学习情况推荐"

### Requirement: 推荐 API 响应扩展
弱项学习和重要性学习的 API 响应 SHALL 包含推荐理由字段。重要性学习的响应对象 SHALL 同时包含最近的学习记录，以便生成推荐理由。

#### Scenario: API 返回推荐理由
- **WHEN** 前端请求弱项学习或重要性学习数据
- **THEN** 响应中的每个知识点对象 SHALL 包含 `recommendationReason` 字段

#### Scenario: 重要性学习响应包含学习记录
- **WHEN** 前端请求重要性学习数据
- **THEN** 响应中的每个 `ByImportanceItem` SHALL 包含 `learningRecord` 字段（最近一条学习记录，若无记录则为 null）

### Requirement: 前端推荐理由展示
前端 SHALL 在智能学习列表中展示推荐理由。

#### Scenario: 弱项学习展示推荐理由
- **WHEN** 学生在弱项学习列表查看推荐知识点
- **THEN** 每个知识点卡片 SHALL 展示推荐理由（一行灰色小字，位于知识点名称下方）

#### Scenario: 重要性学习展示推荐理由
- **WHEN** 学生在重要性学习列表查看推荐知识点
- **THEN** 每个知识点卡片 SHALL 展示推荐理由（一行灰色小字，位于知识点名称下方）

### Requirement: 性能保障
系统 SHALL 在大数据量场景下保持推荐响应性能。

#### Scenario: 大课本候选集过滤
- **WHEN** 候选知识点数量超过 500
- **THEN** 系统 SHALL 先按最近学习时间升序取前 200 个候选知识点，再对这 200 个做评分排序

#### Scenario: 批量查询避免 N+1
- **WHEN** 计算多个知识点的进步速度
- **THEN** 系统 SHALL 使用单个数据库查询获取所有候选知识点的最近学习记录，在内存中分组计算

### Requirement: 零记录学生回退
系统 SHALL 对没有学习记录的学生提供合理的回退行为。

#### Scenario: 新学生弱项学习
- **WHEN** 新学生（无学习记录）进入弱项学习模式
- **THEN** 系统 SHALL 返回空列表

#### Scenario: 新学生重要性学习
- **WHEN** 新学生（无学习记录）进入重要性学习模式
- **THEN** 系统 SHALL 返回该重要性级别的所有知识点，按 code 升序排列

### Requirement: 平局打破规则
当多个知识点评分相同时，系统 SHALL 使用确定性排序。

#### Scenario: 评分相同的情况
- **WHEN** 两个知识点最终评分相同
- **THEN**  SHALL 按以下顺序排序：重要性级别降序（A > B > C）→ 最近学习时间升序 → code 升序

### Requirement: 随机学习模式不受影响
随机学习模式的推荐逻辑 SHALL 保持原有行为，不应用新的评分模型。

#### Scenario: 随机学习保持不变
- **WHEN** 学生进入随机学习模式
- **THEN** 系统 SHALL 按原有的随机排序返回知识点
- **AND**  SHALL 不展示推荐理由

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
