## MODIFIED Requirements

### Requirement: 选中知识点

系统 SHALL 支持树形结构展示知识点层级，支持展开/折叠和选中操作。

#### Scenario: 点击三级知识点节点
- **GIVEN** 知识树已加载
- **WHEN** 用户点击某个三级知识点节点
- **THEN** 该节点 SHALL 高亮显示为选中状态
- **AND** 系统 SHALL 触发选中事件，通知内容区加载对应知识点详情

#### Scenario: 点击二级知识点节点
- **GIVEN** 知识树已加载
- **WHEN** 用户点击某个二级知识点节点
- **THEN** 该节点 SHALL 高亮显示为选中状态
- **AND** 系统 SHALL 触发选中事件，通知内容区加载对应二级知识点详情
- **AND** 内容区 SHALL 展示该二级知识点对应的 MD 章节内容

#### Scenario: 点击一级知识点节点
- **GIVEN** 知识树已加载
- **WHEN** 用户点击某个一级知识点节点
- **THEN** 该节点 SHALL 高亮显示为选中状态
- **AND** 系统 SHALL 触发选中事件，通知内容区加载对应一级知识点详情
- **AND** 内容区 SHALL 展示该一级知识点对应的 MD 章节内容

#### Scenario: 导航时自动高亮对应节点
- **GIVEN** 用户通过"上一个"/"下一个"按钮切换知识点
- **THEN** 知识树 SHALL 自动展开并高亮目标节点
- **AND** 若目标节点不在可视区域，SHALL 自动滚动到可视区域

## ADDED Requirements

### Requirement: 树构建逻辑（按 code 层级）

系统 SHALL 按知识点 code 的层级关系构建真实父子树，替代原有的按名称虚拟分组。

#### Scenario: 按 code 层级建立父子关系
- **GIVEN** 后端返回的扁平知识点列表（包含一、二、三级）
- **WHEN** 系统构建树形结构
- **THEN** 系统 SHALL 按 code 中 `.` 的数量判断层级：
  - 0 个 `.` → 一级节点（根）
  - 1 个 `.` → 二级节点
  - 2 个或更多 `.` → 三级节点（叶子）
- **AND** 每个节点 SHALL 通过 code 前缀查找父节点（如 `1.1` 的父节点是 `1`）
- **AND** 所有节点 SHALL 使用数据库 `id` 作为 `key`，不再使用虚拟 key（如 `l1-xxx`、`l2-xxx`）

#### Scenario: 无父节点的处理
- **GIVEN** 某知识点找不到对应的父节点（数据不完整）
- **THEN** 该知识点 SHALL 作为根节点展示
- **AND** 系统 SHALL 在控制台输出警告

### Requirement: 树形遍历序列

系统 SHALL 支持将树形结构转换为扁平化的遍历序列，用于前驱后继导航。

#### Scenario: 生成遍历序列
- **GIVEN** 知识树数据
- **WHEN** 系统初始化或树数据变化
- **THEN** 系统 SHALL 生成深度优先遍历（DFS）的扁平序列
- **AND** 序列中的每个元素 SHALL 包含节点 id、code、层级信息

#### Scenario: 获取当前节点的索引
- **GIVEN** 遍历序列和当前选中的知识点
- **THEN** 系统 SHALL 能快速定位当前节点在序列中的索引
- **AND** 基于索引 SHALL 能获取前一个和后一个节点
