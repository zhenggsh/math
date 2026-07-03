## ADDED Requirements

### Requirement: 知识点掌握度轨迹查询 API
系统 SHALL 提供查询单个知识点掌握度演变轨迹的 API，返回该用户对该知识点的历次学习记录。

#### Scenario: 成功查询轨迹
- **GIVEN** 用户已登录且对某知识点有多次学习记录
- **WHEN** 用户请求 GET /analytics/student/knowledge-point-progress?knowledgePointId=xxx
- **THEN** 系统 SHALL 返回该用户对该知识点的所有学习记录
- **AND** 记录 SHALL 按 startTime 升序排列（从旧到新）
- **AND** 每条记录 SHALL 包含：date（YYYY-MM-DD 格式）、masteryLevel（A/B/C/D/E）、durationMinutes
- **AND** 响应 SHALL 同时包含知识点基本信息：knowledgePointId、code、title、level1、level2、level3

#### Scenario: 无学习记录
- **GIVEN** 用户已登录但从未学习过该知识点
- **WHEN** 用户请求 GET /analytics/student/knowledge-point-progress?knowledgePointId=xxx
- **THEN** 系统 SHALL 返回空数组 progressRecords: []
- **AND** SHALL 仍然返回知识点基本信息
- **AND** 状态码 SHALL 为 200 OK

#### Scenario: 知识点不存在
- **GIVEN** 用户已登录
- **WHEN** 用户请求 GET /analytics/student/knowledge-point-progress?knowledgePointId=不存在的ID
- **THEN** 系统 SHALL 返回 404 Not Found
- **AND** 错误信息 SHALL 指明知识点不存在

#### Scenario: 权限控制
- **GIVEN** 用户 A 和用户 B 都对同一知识点有学习记录
- **WHEN** 用户 A 请求查询该知识点轨迹
- **THEN** 系统 SHALL 只返回用户 A 自己的学习记录
- **AND** 不会返回用户 B 的任何记录

#### Scenario: 支持按日期范围过滤
- **GIVEN** 用户已登录且对某知识点有学习记录
- **WHEN** 用户请求 GET /analytics/student/knowledge-point-progress?knowledgePointId=xxx&startDate=2026-01-01&endDate=2026-12-31
- **THEN** 系统 SHALL 只返回 startTime 在指定日期范围内的记录
- **AND** 记录 SHALL 仍按 startTime 升序排列

---

### Requirement: 知识点掌握度轨迹图表展示
系统 SHALL 在学习分析页面展示单个知识点的掌握度变化轨迹图表。

#### Scenario: 默认展示薄弱点轨迹
- **GIVEN** 用户进入学习分析页面
- **THEN** 系统 SHALL 默认展示该用户最近一个薄弱点（掌握度为 D 或 E 的知识点）的轨迹
- **AND** 图表 SHALL 包含：折线（掌握度变化）+ 柱状（每次学习时长）
- **AND** 图表 SHALL 自动标注关键节点：首次学习、首次达到 C、达到 A（如有）

#### Scenario: 切换知识点
- **GIVEN** 用户在学习分析页面
- **WHEN** 用户从知识点下拉选择器中选择另一个知识点
- **THEN** 系统 SHALL 重新查询并展示该知识点的轨迹
- **AND** 图表 SHALL 自动更新，保持相同的坐标轴刻度便于对比

#### Scenario: 图表交互
- **GIVEN** 轨迹图表已展示
- **WHEN** 用户 hover 到某个数据点
- **THEN** 系统 SHALL 显示 tooltip：具体日期、掌握度、学习时长（分钟）
- **AND** 如果有备注，tooltip SHALL 显示备注的前 50 个字符

#### Scenario: 知识点选择器数据
- **GIVEN** 用户进入学习分析页面
- **THEN** 知识点选择器 SHALL 只展示该用户至少有一条学习记录的知识点
- **AND** 选项 SHALL 按掌握度从低到高排序（E→D→C→B→A）
- **AND** 选项 SHALL 显示知识点 code 和 title，如"1.1.1 集合的含义"

#### Scenario: 单条记录状态
- **GIVEN** 用户选择了某个只有一条学习记录的知识点
- **THEN** 图表 SHALL 只显示单个数据点
- **AND** SHALL 显示提示："该知识点只有 1 条学习记录，继续学习以查看进步轨迹"

#### Scenario: 空状态
- **GIVEN** 用户进入学习分析页面且没有任何学习记录
- **THEN** 知识点轨迹区域 SHALL 显示空状态
- **AND** 提示 SHALL 引导用户："开始学习知识点后，这里将展示你的掌握度进步轨迹"
