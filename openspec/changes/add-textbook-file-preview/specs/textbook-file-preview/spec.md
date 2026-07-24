# Delta Spec: textbook-file-preview (新能力)

## ADDED Requirements

### Requirement: 框架文件预览端点

系统必须提供 `GET /textbooks/:id/framework-file` 端点，读取并解析 iksm 目录下该教材的框架文件（xlsx 或 csv），返回全量行数据。文件是真相源，端点不得从数据库读取框架数据。

响应必须包含：`fileName`、`fileType`（xlsx|csv）、`sheetName`（xlsx 时）、`rows`（全量，不截断）、`totalRows`、`lastModifiedAt`（文件系统 mtime）。

xlsx 多 sheet 时，必须使用与框架解析器一致的 sheet 检测逻辑（选择第一个含合规框架结构的 sheet），不得固定使用第一个 sheet。

#### Scenario: 成功返回 xlsx 框架行
- **WHEN** 教师请求框架文件预览且教材为 xlsx 类型
- **THEN** 系统解析 parser 检测到的框架 sheet，返回全部行（含一级/二级/三级知识点、定义、特性、重要性、编号）
- **AND** 响应包含所选 sheetName 和文件 mtime

#### Scenario: 多 sheet xlsx 选中框架 sheet
- **WHEN** xlsx 文件的第一个 sheet 为封面等非框架 sheet
- **THEN** 系统仍返回框架 sheet 的数据，且 sheetName 标识该框架 sheet

#### Scenario: 成功返回 csv 框架行
- **WHEN** 教材框架文件为 csv 类型
- **THEN** 系统解析 csv 并返回全量行，fileType 为 csv

#### Scenario: 教材不存在
- **WHEN** 请求的教材 id 不存在
- **THEN** 系统返回 404

#### Scenario: 磁盘文件缺失
- **WHEN** 数据库有教材记录但 iksm 目录下框架文件不存在
- **THEN** 系统返回 404 及友好错误信息

#### Scenario: 文件解析失败
- **WHEN** 框架文件内容损坏或无合规框架结构
- **THEN** 系统返回 422 及友好错误信息

### Requirement: 内容文件预览端点

系统必须提供 `GET /textbooks/:id/content-file` 端点，返回 iksm 目录下该教材 md 内容文件的完整原文。

响应必须包含：`fileName`、`content`（完整原文）、`totalLines`、`lastModifiedAt`（文件系统 mtime）。

#### Scenario: 成功返回 md 原文
- **WHEN** 教师请求内容文件预览且 md 文件存在
- **THEN** 系统返回完整 md 原文（不截断）及行数和 mtime

#### Scenario: 教材无内容文件
- **WHEN** 教材记录的 contentPath 为空
- **THEN** 系统返回空状态标记而非错误，前端据以展示空态提示

#### Scenario: 内容文件缺失
- **WHEN** contentPath 有值但磁盘文件不存在
- **THEN** 系统返回 404 及友好错误信息

### Requirement: 预览端点权限控制

两个文件预览端点必须仅允许 TEACHER 和 ADMIN 角色访问。

#### Scenario: 学生访问被拒绝
- **WHEN** STUDENT 角色请求文件预览端点
- **THEN** 系统返回 403

### Requirement: 双栏文件预览界面

教材详情页必须以可拖拽双栏布局展示文件预览：左侧为框架文件表格，右侧为 md 行号视图。UI 风格与扩充知识点弹窗的预览保持一致（复用同一套共享组件）。窄屏（<768px）必须退化为垂直堆叠。

#### Scenario: 打开详情页加载双栏
- **WHEN** 教师进入教材详情页
- **THEN** 左栏显示框架文件全量行表格，右栏显示 md 行号视图
- **AND** 两栏均有加载中和错误状态的独立展示

#### Scenario: 文件加载失败展示错误态
- **WHEN** 任一文件端点返回 404 或 422
- **THEN** 对应栏位显示友好错误提示，页面不白屏

### Requirement: 框架行点击定位 md 内容

点击左侧框架行时，系统必须在右侧 md 视图中定位并高亮该知识点编号对应的标题行（支持一级/二级/三级编号）。定位逻辑必须防止前缀误匹配（如编号 1.1 不得匹配标题 1.10），无匹配时不得报错。

#### Scenario: 点击三级编号定位
- **WHEN** 教师点击编号为 1.1.1 的框架行
- **THEN** 右侧 md 视图滚动到 `#### 知识点 1.1.1：…` 标题行并高亮

#### Scenario: 前缀不误匹配
- **WHEN** 教师点击编号为 1.1 的框架行且 md 中存在 1.10 的标题
- **THEN** 系统定位到 1.1 的标题（或其后代退化匹配），不得定位到 1.10

#### Scenario: 编号无对应标题
- **WHEN** 点击的编号在 md 中无对应标题
- **THEN** 右侧不产生高亮，页面无错误提示

### Requirement: 文件重新加载

详情页必须提供「重新加载」操作，重新读取磁盘上的两个文件并更新预览。该操作不得触碰数据库。

#### Scenario: 外部修改后重新加载
- **WHEN** 教师在外部编辑器修改了 iksm 文件后点击「重新加载」
- **THEN** 双栏显示文件的最新内容，数据库记录不变

### Requirement: 文件与数据库分歧提示

详情页必须展示文件 mtime 与数据库 lastModifiedAt 的对比，两者不一致时显示警告提示。本期不提供数据库同步操作。

#### Scenario: 文件与数据库修改时间不一致
- **WHEN** 文件 mtime 与数据库 lastModifiedAt 不一致
- **THEN** 页面显示黄色警告 Tag 提示数据可能不一致

### Requirement: 扩充成功后的预览联动

知识点扩充成功后，系统必须自动重新拉取两个文件预览端点，并在框架预览中高亮新增知识点行（约 3 秒后自动取消高亮）。滚动定位必须在刷新后的行数据渲染完成后触发。

#### Scenario: 扩充成功高亮新增行
- **WHEN** 扩充流程成功完成并返回新增编号列表
- **THEN** 双栏自动刷新为最新文件内容
- **AND** 框架预览滚动定位并高亮新增行，约 3 秒后取消高亮
