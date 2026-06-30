## ADDED Requirements

### Requirement: 分析页面按教材聚焦

学生分析页面 SHALL 仅针对全局教材选择器中第一个选中的教材展示分析数据。

#### Scenario: 已选择教材

- **GIVEN** 用户在全局教材选择器中选择了教材 A 和教材 B
- **WHEN** 用户进入学生分析页面
- **THEN** 页面 SHALL 针对教材 A 展示分析数据
- **AND** 页面标题或头部 SHALL 显示当前分析教材为教材 A

#### Scenario: 未选择教材

- **GIVEN** 用户未在全局教材选择器中选择任何教材
- **WHEN** 用户进入学生分析页面
- **THEN** 页面 SHALL 显示空状态提示
- **AND** 提示 SHALL 引导用户先选择教材

---

### Requirement: 多维度标签布局

学生分析页面 SHALL 使用多标签页展示 4 个分析维度。

#### Scenario: 页面结构

- **GIVEN** 用户进入学生分析页面
- **THEN** 页面 SHALL 显示 4 个标签页：教材维度、学习行为维度、知识点维度、总结与建议
- **AND** 默认激活标签 SHALL 为"教材维度"

#### Scenario: 切换标签

- **GIVEN** 用户位于"教材维度"标签
- **WHEN** 用户点击"学习行为维度"标签
- **THEN** 页面 SHALL 展示学习行为维度的内容
- **AND** 已加载的数据 SHALL 保留，不重新请求

---

### Requirement: 教材维度展示

"教材维度"标签 SHALL 展示当前教材的整体学习覆盖情况。

#### Scenario: 教材概览统计

- **GIVEN** 用户位于"教材维度"标签
- **THEN** 页面 SHALL 显示：
  - 当前教材知识点总数
  - 已学习知识点数
  - 未学习知识点数

#### Scenario: 掌握度分布

- **GIVEN** 用户位于"教材维度"标签
- **THEN** 页面 SHALL 显示已学知识点的掌握度分布（A/B/C/D/E）
- **AND** 每个级别 SHALL 显示数量和占比

#### Scenario: 重要性分布

- **GIVEN** 用户位于"教材维度"标签
- **THEN** 页面 SHALL 显示教材中知识点按重要性级别（A/B/C）的分布

---

### Requirement: 学习行为维度展示

"学习行为维度"标签 SHALL 以日期为轴展示用户的学习行为数据。

#### Scenario: 每日学习时长

- **GIVEN** 用户位于"学习行为维度"标签
- **THEN** 页面 SHALL 展示每日学习时长折线图
- **AND** 默认时间范围 SHALL 为 30 天

#### Scenario: 每日学习次数

- **GIVEN** 用户位于"学习行为维度"标签
- **THEN** 页面 SHALL 展示每日学习次数柱状图
- **AND** 默认时间范围 SHALL 为 30 天

#### Scenario: 行为统计

- **GIVEN** 用户位于"学习行为维度"标签
- **THEN** 页面 SHALL 显示总学习时长、总学习次数、日均学习时长统计卡片

#### Scenario: 切换时间范围

- **GIVEN** 用户位于"学习行为维度"标签
- **WHEN** 用户选择 7 天、30 天或 90 天
- **THEN** 页面 SHALL 重新加载对应时间范围的数据
- **AND** 图表和统计卡片 SHALL 同步更新

---

### Requirement: 知识点维度展示

"知识点维度"标签 SHALL 展示单个知识点的掌握变化及薄弱点列表。

#### Scenario: 知识点选择

- **GIVEN** 用户位于"知识点维度"标签
- **THEN** 页面 SHALL 提供当前教材已学知识点的下拉选择器
- **AND** 默认选中 SHALL 为最近一个薄弱点（掌握度 D 或 E）

#### Scenario: 掌握度轨迹

- **GIVEN** 用户在知识点选择器中选中某个知识点
- **THEN** 页面 SHALL 展示该知识点的掌握度轨迹图
- **AND** 图表 SHALL 包含折线（掌握度变化）和柱状（学习时长）

#### Scenario: 薄弱知识点列表

- **GIVEN** 用户位于"知识点维度"标签
- **THEN** 页面 SHALL 列出当前教材中掌握度为 D 或 E 的知识点
- **AND** 列表 SHALL 显示知识点 code、name、重要性、最近掌握度、最近学习日期
- **AND** 每个薄弱知识点 SHALL 提供"去学习"按钮

#### Scenario: 去学习按钮

- **GIVEN** 用户在薄弱知识点列表中点击"去学习"按钮
- **THEN** 页面 SHALL 跳转至 `/smart-learning?focusKnowledgePointId={id}`
- **AND** SmartLearningPage SHALL 自动定位到该知识点

#### Scenario: 进步退步标识

- **GIVEN** 某知识点有至少两次学习记录
- **THEN** 页面 SHALL 根据最近两次掌握度判断该知识点是进步、退步还是持平
- **AND** 进步/退步 SHALL 在知识点列表或轨迹旁显示标识

#### Scenario: 知识点筛选

- **GIVEN** 用户位于"知识点维度"标签
- **THEN** 页面 SHALL 提供筛选器：全部、进步中、退步中、薄弱点
- **AND** 默认 SHALL 为"全部"
- **AND** 切换筛选 SHALL 即时更新列表

---

### Requirement: 总结与建议生成

"总结与建议"标签 SHALL 基于已有学习数据生成中文规则总结文本。

#### Scenario: 生成学习总结

- **GIVEN** 用户点击"总结与建议"标签
- **THEN** 页面 SHALL 根据当前教材的学习数据生成个性化总结
- **AND** 总结 SHALL 包含：已学知识点数、总学习时长、薄弱点数量、优先复习建议

#### Scenario: 无薄弱点时的降级文本

- **GIVEN** 用户当前没有薄弱知识点
- **THEN** 总结 SHALL 显示鼓励性文本
- **AND** 不再建议优先复习某个知识点

---

### Requirement: 学生端分析 API 支持教材过滤

学生端分析 API SHALL 支持通过 `textbookId` 查询参数按教材过滤数据。

#### Scenario: 概览 API 过滤

- **GIVEN** 用户请求 `GET /analytics/student/overview?textbookId=xxx`
- **THEN** 系统 SHALL 返回该用户在该教材下的总学习次数、总学习时长、已学知识点数

#### Scenario: 掌握度分布 API 过滤

- **GIVEN** 用户请求 `GET /analytics/student/mastery-distribution?textbookId=xxx`
- **THEN** 系统 SHALL 返回该用户在该教材下的掌握度分布

#### Scenario: 学习趋势 API 过滤

- **GIVEN** 用户请求 `GET /analytics/student/learning-trend?textbookId=xxx&days=30`
- **THEN** 系统 SHALL 返回该用户在该教材下最近 30 天的每日学习趋势

#### Scenario: 薄弱点 API 过滤

- **GIVEN** 用户请求 `GET /analytics/student/weak-points?textbookId=xxx&limit=10`
- **THEN** 系统 SHALL 返回该用户在该教材下的薄弱知识点

#### Scenario: 已学知识点 API 过滤

- **GIVEN** 用户请求 `GET /analytics/student/learned-knowledge-points?textbookId=xxx`
- **THEN** 系统 SHALL 返回该用户在该教材下的已学知识点列表
- **AND** 每个知识点 SHALL 包含最近两次学习记录的 `masteryLevel`

---

### Requirement: 教材维度总览 API

系统 SHALL 提供教材维度总览 API，用于一次性获取教材维度所需的关键指标。

#### Scenario: 成功获取总览

- **GIVEN** 用户请求 `GET /analytics/student/textbook-summary?textbookId=xxx`
- **THEN** 系统 SHALL 返回教材名称、知识点总数、已学习数、未学习数、掌握度分布、重要性分布

#### Scenario: 教材不存在

- **GIVEN** 用户请求 `GET /analytics/student/textbook-summary?textbookId=不存在的ID`
- **THEN** 系统 SHALL 返回 404 Not Found
- **AND** 错误信息 SHALL 指明教材不存在
