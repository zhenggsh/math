## ADDED Requirements

### Requirement: 知识点掌握度进度数据查询 API
系统 SHALL 提供按时间升序查询特定知识点学习记录进度的 API，用于轨迹图表展示。

#### Scenario: 成功查询进度数据
- **GIVEN** 用户已登录且对某知识点有多次学习记录
- **WHEN** 系统内部服务调用查询该知识点的进度数据
- **THEN** 系统 SHALL 返回该用户对该知识点的所有学习记录
- **AND** 记录 SHALL 按 startTime 升序排列
- **AND** 每条记录 SHALL 包含：startTime、masteryLevel、durationMinutes、notes

#### Scenario: 无记录时返回空数组
- **GIVEN** 用户已登录但从未学习过该知识点
- **WHEN** 系统查询该知识点的进度数据
- **THEN** 系统 SHALL 返回空数组
- **AND** 不会抛出错误或返回 404

#### Scenario: 权限隔离
- **GIVEN** 用户 A 和用户 B 都有学习记录
- **WHEN** 为用户 A 查询进度数据
- **THEN** 系统 SHALL 只返回用户 A 的记录
- **AND** 查询参数 SHALL 使用传入的 userId 进行过滤
