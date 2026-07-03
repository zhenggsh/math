## ADDED Requirements

### Requirement: 推荐模式切换
左侧导航顶部 SHALL 提供三种推荐模式的 tabs 切换。

#### Scenario: 切换推荐模式
- **WHEN** 学生点击"薄弱点"、"重要性"或"随机" tab
- **THEN** 左侧列表 SHALL 加载对应模式的推荐数据
- **AND** SHALL 自动选中列表中的第一个知识点
- **AND** 中间内容区 SHALL 切换到该知识点的内容

#### Scenario: 默认模式
- **WHEN** 学生首次进入智能学习页
- **THEN** 系统 SHALL 默认选中"薄弱点"模式

### Requirement: 薄弱点列表分组
薄弱点列表 SHALL 按教材章节（level1/level2）分组展示。

#### Scenario: 按章节分组显示
- **WHEN** 学生查看薄弱点列表
- **THEN** 知识点 SHALL 按 level1（章）和 level2（节）分组
- **AND** 每组 SHALL 使用折叠面板（Collapse）展示
- **AND** 默认 SHALL 展开前两个分组，其余折叠

#### Scenario: 空状态
- **WHEN** 学生没有薄弱知识点（全部掌握为 A）
- **THEN** 左侧 SHALL 显示空状态提示"恭喜！暂无薄弱知识点"
- **AND** SHALL 提供切换到"随机模式"的快捷入口

### Requirement: 列表项信息展示
每个列表项 SHALL 展示知识点的关键信息和推荐上下文。

#### Scenario: 列表项基本信息
- **WHEN** 学生查看推荐列表中的任意项
- **THEN** 每项 SHALL 显示：知识点编码、名称、当前掌握度标签、推荐理由

#### Scenario: 列表项掌握度趋势
- **WHEN** 学生查看薄弱点列表中的任意项
- **THEN** 每项 SHALL 显示掌握度变化趋势标识
- **AND** improvementVelocity > 0 SHALL 显示"↗ 上升"
- **AND** improvementVelocity = 0 SHALL 显示"→ 持平"
- **AND** improvementVelocity < 0 SHALL 显示"↘ 下降"
- **AND** 不足两次学习记录 SHALL 显示"— 暂无趋势"

#### Scenario: 列表项上次学习时间
- **WHEN** 学生查看推荐列表
- **THEN** 每项 SHALL 显示距离上次学习的天数（如"3 天前"）

### Requirement: 列表刷新
学生 SHALL 能够手动刷新推荐列表。

#### Scenario: 手动刷新
- **WHEN** 学生点击列表右上角的刷新按钮
- **THEN** 系统 SHALL 重新请求当前模式的推荐数据
- **AND** SHALL 保持当前选中的知识点（如果仍在列表中）
- **AND** 如果当前选中项已不在列表中，SHALL 自动选中第一个

### Requirement: 列表加载状态
列表加载过程中 SHALL 提供明确的加载反馈。

#### Scenario: 加载中
- **WHEN** 列表数据正在加载
- **THEN** 左侧区域 SHALL 显示骨架屏或加载动画
- **AND** 中间内容区 SHALL 保持当前内容或显示骨架屏
