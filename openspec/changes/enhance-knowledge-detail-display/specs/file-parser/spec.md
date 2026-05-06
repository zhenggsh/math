## MODIFIED Requirements

### Requirement: Markdown 文件读取

系统必须支持读取 `.md` 格式的 Markdown 文件，并支持按知识点编号或知识点名称查找对应章节内容。

#### Scenario: 按知识点编号查找内容
- **GIVEN** Markdown 文件包含以 `#### 知识点 {code}` 格式标记的章节
- **WHEN** 系统按 code（如 `1.1.1`）查找内容
- **THEN** 系统 SHALL 返回该 code 对应的章节内容
- **AND** 内容范围 SHALL 从该章节标题开始，到下一个同级或更高级标题结束

#### Scenario: 按知识点名称查找一级章节
- **GIVEN** 用户点击一级知识点节点（level1 为"集合与常用逻辑用语"）
- **WHEN** 系统尝试查找对应 MD 内容
- **THEN** 系统 SHALL 尝试匹配以下模式的标题：
  - `## 集合与常用逻辑用语`
  - `### 集合与常用逻辑用语`
  - `#### 集合与常用逻辑用语`
- **AND** 返回第一个匹配到的章节内容

#### Scenario: 按知识点名称查找二级章节
- **GIVEN** 用户点击二级知识点节点（level2 为"集合的概念"）
- **WHEN** 系统尝试查找对应 MD 内容
- **THEN** 系统 SHALL 尝试匹配以下模式的标题：
  - `## 集合的概念`
  - `### 集合的概念`
  - `#### 集合的概念`
- **AND** 返回第一个匹配到的章节内容

#### Scenario: 按知识点名称查找三级章节
- **GIVEN** 用户点击三级知识点节点（level3 为"集合的定义"）
- **WHEN** 系统尝试查找对应 MD 内容
- **THEN** 系统 SHALL 先尝试按 code 精确匹配
- **AND** 若 code 匹配失败，SHALL 尝试按 level3 名称匹配（同二级匹配规则）
- **AND** 返回匹配到的章节内容

#### Scenario: 查找失败时返回空内容
- **GIVEN** 系统中不存在对应知识点的 MD 章节
- **WHEN** 系统尝试查找内容
- **THEN** 系统 SHALL 返回空字符串
- **AND** 前端 SHALL 展示友好提示（如"暂无详细内容"）

## ADDED Requirements

### Requirement: 知识点内容查找接口

系统 SHALL 提供统一的知识点内容查找接口，支持多种匹配策略。

#### Scenario: 接口按知识点信息查找
- **GIVEN** 知识点信息包含 code、level1、level2、level3
- **WHEN** 系统调用查找接口
- **THEN** 系统 SHALL 按以下优先级匹配：
  1. code 精确匹配（`#### 知识点 {code}` 格式）
  2. level3 名称匹配（三级知识点标题）
  3. level2 名称匹配（二级知识点标题）
  4. level1 名称匹配（一级知识点标题）
- **AND** 返回第一个匹配成功的内容
