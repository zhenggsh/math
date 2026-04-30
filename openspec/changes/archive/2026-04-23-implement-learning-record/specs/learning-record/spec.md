## ADDED Requirements

### Requirement: 创建学习记录 API
系统 SHALL 提供创建学习记录的 RESTful API。

#### Scenario: 成功创建学习记录
- **GIVEN** 用户已登录并正在学习某个知识点
- **WHEN** 用户提交学习反馈（掌握程度、备注）
- **THEN** 系统 SHALL 创建 LearningRecord 记录
- **AND** 记录 SHALL 包含：userId、knowledgePointId、startTime、durationMinutes、masteryLevel、notes
- **AND** 系统 SHALL 返回 201 Created 状态码和创建的记录

#### Scenario: 验证必填字段
- **GIVEN** 用户提交学习记录请求
- **WHEN** 请求缺少 knowledgePointId、masteryLevel 或 durationMinutes
- **THEN** 系统 SHALL 返回 400 Bad Request
- **AND** 错误信息 SHALL 指明缺失的必填字段

#### Scenario: 验证 masteryLevel 枚举值
- **GIVEN** 用户提交学习记录请求
- **WHEN** masteryLevel 不是 A/B/C/D/E 之一
- **THEN** 系统 SHALL 返回 400 Bad Request
- **AND** 错误信息 SHALL 指明 masteryLevel 必须是 A、B、C、D 或 E

#### Scenario: 验证知识点存在
- **GIVEN** 用户提交学习记录请求
- **WHEN** knowledgePointId 对应的知识点不存在
- **THEN** 系统 SHALL 返回 404 Not Found
- **AND** 错误信息 SHALL 指明知识点不存在

#### Scenario: 权限控制
- **GIVEN** 用户 A 尝试创建学习记录
- **WHEN** 请求中包含 userId 不是用户 A 的 ID
- **THEN** 系统 SHALL 忽略请求中的 userId
- **AND** 使用当前登录用户的 ID 作为 userId

---

### Requirement: 查询学习记录列表 API
系统 SHALL 提供查询用户学习记录列表的 API。

#### Scenario: 查询用户所有学习记录
- **GIVEN** 用户已登录
- **WHEN** 用户请求 GET /learning-records
- **THEN** 系统 SHALL 返回该用户的所有学习记录
- **AND** 记录 SHALL 按 createdAt 倒序排列（最新的在前）
- **AND** 每条记录 SHALL 包含关联的 KnowledgePoint 基本信息（code、level1、level2、level3）

#### Scenario: 查询特定知识点的学习记录
- **GIVEN** 用户已登录
- **WHEN** 用户请求 GET /learning-records?knowledgePointId=xxx
- **THEN** 系统 SHALL 返回该用户对该知识点的所有学习记录
- **AND** 记录 SHALL 按 createdAt 倒序排列

#### Scenario: 分页支持
- **GIVEN** 用户已登录且有大量学习记录
- **WHEN** 用户请求 GET /learning-records?page=1&limit=20
- **THEN** 系统 SHALL 返回分页后的结果
- **AND** 响应 SHALL 包含总记录数、当前页、每页数量

#### Scenario: 权限控制
- **GIVEN** 用户 A 和用户 B
- **WHEN** 用户 A 尝试查询用户 B 的学习记录
- **THEN** 系统 SHALL 只返回用户 A 自己的记录
- **AND** 不会返回用户 B 的任何记录

---

### Requirement: 学习计时器功能
系统 SHALL 提供学习计时功能，记录用户学习时长。

#### Scenario: 开始学习计时
- **GIVEN** 用户打开某个知识点的学习页面
- **WHEN** 页面加载完成
- **THEN** 系统 SHALL 自动启动学习计时器
- **AND** 记录学习开始时间 startTime

#### Scenario: 显示学习时长
- **GIVEN** 学习计时器正在运行
- **THEN** 系统 SHALL 在界面上实时显示已学习时长
- **AND** 格式 SHALL 为 MM:SS（如 05:32）

#### Scenario: 提交时计算时长
- **GIVEN** 用户完成学习并点击提交反馈
- **WHEN** 提交学习记录请求
- **THEN** 系统 SHALL 计算从开始到提交的总分钟数
- **AND** durationMinutes SHALL 为整数（向上取整或四舍五入）

#### Scenario: 离开页面处理
- **GIVEN** 用户在学习过程中离开页面（刷新或关闭）
- **WHEN** 用户重新打开该知识点的学习页面
- **THEN** 系统 SHALL 重新开始计时（创建新记录）

---

### Requirement: 掌握程度评分组件
系统 SHALL 提供掌握程度评分组件，支持 A/B/C/D/E 五级评分。

#### Scenario: 显示评分选项
- **GIVEN** 反馈面板已展开
- **THEN** 系统 SHALL 显示五个评分选项：A（优秀）、B（良好）、C（一般）、D（较差）、E（很差）
- **AND** 每个选项 SHALL 显示对应的颜色标识

#### Scenario: 选择评分
- **GIVEN** 评分组件已显示
- **WHEN** 用户点击某个评分选项（如 B）
- **THEN** 系统 SHALL 高亮显示选中的选项
- **AND** 其他选项 SHALL 取消选中状态

#### Scenario: 颜色对应
- **GIVEN** 评分组件已显示
- **THEN** A SHALL 显示为绿色 (#52C41A)
- **AND** B SHALL 显示为浅绿色 (#73D13D)
- **AND** C SHALL 显示为黄色 (#FAAD14)
- **AND** D SHALL 显示为橙色 (#FA8C16)
- **AND** E SHALL 显示为红色 (#F5222D)

#### Scenario: 必填验证
- **GIVEN** 用户尝试提交反馈
- **WHEN** 未选择掌握程度评分
- **THEN** 系统 SHALL 显示验证错误提示
- **AND** 阻止表单提交

---

### Requirement: 学习反馈面板
系统 SHALL 提供学习反馈面板，位于学习页面下方反馈区。

#### Scenario: 面板展开/折叠
- **GIVEN** 用户在学习页面
- **THEN** 反馈面板 SHALL 显示在学习内容下方
- **AND** 用户 SHALL 能够展开/折叠面板

#### Scenario: 表单内容
- **GIVEN** 反馈面板已展开
- **THEN** 面板 SHALL 包含：
  - 掌握程度评分组件
  - 备注输入框（多行文本，可选）
  - 提交按钮

#### Scenario: 显示学习时长
- **GIVEN** 反馈面板已展开
- **THEN** 面板 SHALL 显示当前学习时长
- **AND** 时长 SHALL 随计时器实时更新

#### Scenario: 提交反馈
- **GIVEN** 用户已选择掌握程度并填写备注
- **WHEN** 用户点击提交按钮
- **THEN** 系统 SHALL 调用创建学习记录 API
- **AND** 显示提交成功提示
- **AND** 刷新历史记录列表

#### Scenario: 提交状态
- **GIVEN** 用户点击提交按钮
- **WHEN** 请求正在处理中
- **THEN** 提交按钮 SHALL 显示 loading 状态
- **AND** 按钮 SHALL 禁用，防止重复提交

#### Scenario: 提交错误处理
- **GIVEN** 用户提交反馈
- **WHEN** API 返回错误
- **THEN** 系统 SHALL 显示错误提示信息
- **AND** 保留用户输入，允许重新提交

---

### Requirement: 历史记录列表展示
系统 SHALL 在学习页面显示该知识点的历史学习记录。

#### Scenario: 显示历史记录
- **GIVEN** 用户正在学习某个知识点
- **THEN** 反馈面板 SHALL 显示该知识点的历史学习记录列表
- **AND** 记录 SHALL 按时间倒序排列

#### Scenario: 记录内容
- **GIVEN** 历史记录列表已显示
- **THEN** 每条记录 SHALL 显示：
  - 学习日期和时间
  - 学习时长（分钟）
  - 掌握程度（带颜色标识）
  - 备注内容（如有，截断显示）

#### Scenario: 空状态
- **GIVEN** 用户首次学习该知识点
- **WHEN** 没有历史记录
- **THEN** 系统 SHALL 显示友好的空状态提示
- **AND** 提示 SHALL 引导用户开始学习

#### Scenario: 备注展开
- **GIVEN** 历史记录中有备注内容
- **WHEN** 备注内容较长
- **THEN** 系统 SHALL 默认折叠显示
- **AND** 用户 SHALL 能够点击展开查看完整内容
