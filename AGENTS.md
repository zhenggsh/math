# 数学通 (Math Learning System) - Project Documentation

> **Agent 必读**: 本文档是项目总览和入口指南。开始工作前请先阅读 [.agents/skills/project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md) 了解代码生成规则。
> 
> **文档导航**:
> - **[project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md)** ⭐ **代码生成规则** - 技术约束、命名规范、代码风格
> - **[openspec/constitution.md](openspec/constitution.md)** - 项目宪法（核心原则、技术决策、开发工作流）
> - [项目目标](doc/prompt/project_target.md) - 完整需求文档
> - [知识点层级规范](doc/prompt/iksm_hierichy.md) - 知识库数据规范

---

## 项目概述

**数学通**是一个面向高中学生的数学知识点学习系统，支持教材大纲展示、知识点学习、学习情况记录与分析。

### 核心功能

1. **知识库管理**
   - 通过文件方式存放知识库（`iksm/` 目录）
   - 支持 Excel (*.xlsx) 和 CSV (*.csv) 格式的知识点框架文件
   - 支持 Markdown (*.md) 格式的知识点详细内容
   - 支持文件上传、删除、刷新等管理操作

2. **知识点学习**
   - 多栏式灵活布局界面（左侧知识树、中间内容区、右侧AI侧栏、下方反馈区）
   - 树状结构展示知识点框架，支持思维导图和树图两种视图
   - Markdown 预览，支持 LaTeX 数学公式和 Mermaid 图表
   - 学习反馈记录（学习时间、时长、掌握程度评分 A/B/C/D/E）

3. **知识点分析**
   - 学习次数和时长统计
   - 掌握情况分析（针对性学习掌握不佳的知识点）
   - 按重要性级别学习（A类必须掌握、B类重要、C类补充）
   - 随机学习模式

4. **用户管理**
   - 学生角色：学习、反馈、查看分析
   - 教师角色：知识库管理
   - 内置管理员账号：系统全面管理

---

## 技术栈概览

| 层级 | 技术 | 版本/说明 |
|------|------|----------|
| 前端 | React + TypeScript + Vite | React 18+, TypeScript 5+ (严格模式) |
| 后端 | NestJS + Node.js | TypeScript 严格模式 |
| ORM | Prisma | 数据库访问和迁移 |
| 数据库 | PostgreSQL | 14+ |
| 包管理 | pnpm | 8+ (必须) |

### 特色功能支持

| 功能 | 技术方案 |
|------|----------|
| 数学公式展示 | LaTeX (KaTeX/MathJax) |
| 图表展示 | Mermaid.js |
| 数据分析图表 | ECharts |
| API 设计 | RESTful 规范 |
| 部署方式 | 前后端分离，独立部署 |

---

## 项目结构

```
.
├── doc/                          # 项目文档
│   └── prompt/
│       ├── project_target.md     # 项目目标与技术要求
│       ├── iksm_hierichy.md      # 知识库数据规范
│       └── kimi-openspec-init/   # OpenSpec 初始化 Skill
│
├── iksm/                         # 知识库存储目录 (IKSM - Intelligent Knowledge System for Math)
│   ├── math01.xlsx               # 知识点框架文件 (Excel格式)
│   ├── math01.csv                # 知识点框架文件 (CSV格式)
│   ├── math01.md                 # 知识点详细内容 (Markdown格式)
│   └── ...                       # 其他教材文件
│
├── openspec/                     # OpenSpec 配置与变更管理
│   ├── config.yaml               # OpenSpec 配置文件
│   ├── specs/                    # 能力规格定义目录
│   ├── changes/                  # 变更目录
│   │   └── archive/              # 已归档变更
│   └── constitution.md           # 项目宪法 (开发时需要创建)
│
├── .agents/skills/               # Agent Skills
│   ├── project-rule/             # 📍 代码生成规则（SKILL.md）
│   ├── openspec-explore/         # OpenSpec 探索技能
│   ├── openspec-propose/         # OpenSpec 提案技能
│   ├── openspec-apply-change/    # OpenSpec 实施技能
│   └── openspec-archive-change/  # OpenSpec 归档技能
│
├── web/                          # 前端代码 (开发时创建)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── server/                       # 后端代码 (开发时创建)
│   ├── src/
│   ├── prisma/
│   └── package.json
│
└── AGENTS.md                     # 本文档
```

---

## 知识库文件规范

### 知识点框架文件 (*.xlsx / *.csv)

| 字段 | 说明 | 示例 |
|------|------|------|
| 一级知识点 | 大章节名称 | 集合与常用逻辑用语 |
| 二级知识点 | 小节名称 | 集合的概念与表示 |
| 三级知识点 | 具体知识点 | 集合的含义 |
| 定义 | 知识点定义描述 | 研究对象的总体 |
| 特性/运算方式 | 特性或运算方法 | 确定性、互异性、无序性 |
| 知识点编号 | 唯一标识符 | 1.1.1 |
| 重要性级别 | A/B/C 分类 | A类=必须掌握，B类=重要，C类=补充 |

**文件命名规则**:
- 框架文件: `{教材名}.xlsx` 或 `{教材名}.csv`
- 详情文件: `{教材名}.md`
- 示例: `math01.xlsx` + `math01.md`

**忽略规则**:
- 以 `.`、`_`、`tmp` 开头的文件
- 非 `.xlsx`、`.csv`、`.md` 后缀的文件

### 知识点详情文件 (*.md)

使用 Markdown 格式，包含:
- 知识点定义和描述
- LaTeX 数学公式
- Mermaid 关系图和逻辑图
- 定理、公式、二级结论
- 使用场合和前提条件

**Mermaid 转义规则**:
- 图形中文字的特殊字符需转义
- 单双引号、小括号、中括号等使用对应的全角汉字字符代替

---

## 开发工作流

### OpenSpec 理解约束 ⚠️

**OpenSpec 是具体的 [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) 工具，不是通用的 SDD (Spec-Driven Development) 概念。**

在使用 OpenSpec 前必须检查:

| 检查项 | 命令 | 目的 |
|--------|------|------|
| CLI 可用性 | `openspec --help` | 确认 OpenSpec CLI 已安装 |
| 模板实际位置 | `openspec templates` | 确认模板位置，不要假设 |
| 工作流列表 | `openspec schemas` | 了解可用工作流 |
| 活跃变更 | `openspec list --json` | 查看当前进行中的变更 |
| 历史归档 | `ls openspec/changes/archive/` | 查看实际使用的格式 |

**关键原则**:
1. **不要假设**: 务必验证，不要凭直觉理解
2. **以 CLI 为准**: CLI 输出是事实的唯一来源
3. **参考归档**: 已归档的 change 展示了实际生成的格式
4. **必须使用技能**: 使用 skill 调用 openspec 相应指令
5. **技能格式**: Kimi Code 不支持 `/opsx:xxxx` 快捷指令，必须使用 `openspec-xxxx` 格式

### 可用 Skills

本项目使用以下 OpenSpec Skills (位于 `.agents/skills/`):

| Skill | 用途 |
|-------|------|
| `openspec-explore` | 探索模式 - 思考问题、调查问题、澄清需求 |
| `openspec-propose` | 创建变更提案 - 生成 proposal、design、tasks |
| `openspec-apply-change` | 实施变更 - 执行 tasks.md 中的任务 |
| `openspec-archive-change` | 归档变更 - 完成后归档 |

**重要**: Kimi Code 不支持 `/opsx:xxxx` 快捷指令，必须使用 skill 名称格式（如 `openspec-propose`）

### 开发流程

```
探索 → 创建提案 → 实施 → 验证 → 归档
```

1. **探索**（可选）: 使用 `openspec-explore` 思考问题
2. **创建提案**: 使用 `openspec-propose` 创建变更
3. **实施**: 使用 `openspec-apply-change` 执行 tasks
4. **归档**: 使用 `openspec-archive-change` 完成变更

### 变更大小分类

| 变更类型 | 说明 | 推荐方式 |
|----------|------|----------|
| 微小变更 | typo 修复、样式微调 | 直接编辑，无需 OpenSpec |
| 小型变更 | 单文件重构 | `openspec-propose` + 快速实施 |
| 中型变更 | 新功能 | `openspec-propose` 完整流程 |
| 大型变更 | 架构调整 | `openspec-propose` + Design 文档 |

### 变更命名规范

- **格式**: kebab-case
- **模式**: `<action>-<object>-<description>`
- **示例**: `add-user-authentication`, `implement-knowledge-tree`

---

## 代码规范

### TypeScript 严格规范

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

| 规则 | 要求 |
|------|------|
| ✅ DO | 函数参数和返回值使用显式类型 |
| ❌ DON'T | 使用 `any`（除非有注释说明理由） |

### React 组件规范

| 规则 | 要求 |
|------|------|
| ✅ ONLY | 函数组件 |
| ✅ MUST | 定义 Props 接口 |
| ❌ NO | 类组件 |

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `UserProfile.tsx` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型定义 | PascalCase + .types | `User.types.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| 数据库表 | snake_case, 复数 | `users` |
| 数据库列 | snake_case | `created_at` |
| OpenSpec 变更 | kebab-case | `add-user-auth` |

### API 设计规范

RESTful 设计:
- HTTP 方法: GET, POST, PUT, DELETE, PATCH
- 状态码: 200, 201, 400, 401, 403, 404, 500
- 统一响应格式

---

## 质量门禁

### 代码质量检查清单

**实施前**:
- [ ] 已阅读相关 OpenSpec 工件（如有活跃变更）
- [ ] 确认技术方案（如有 Design 文档）

**实施后**:
- [ ] `tsc --noEmit` 无错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 无 `console.log` / `debugger` 语句
- [ ] 无未使用变量/导入
- [ ] 所有函数有返回类型
- [ ] 所有组件有 Props 接口

### OpenSpec 检查清单

**提交变更前**:
- [ ] 变更名称符合 kebab-case
- [ ] proposal.md 包含所有必需章节
- [ ] tasks.md 任务粒度合适（30分钟-2小时/任务）
- [ ] 生成的代码符合技术约束

---

## 快速开始

### 开始工作前

1. 检查是否有活跃的 OpenSpec 变更:
   ```bash
   openspec list --json
   ```

2. 如果有活跃变更，先阅读其 `proposal.md`、`design.md`、`tasks.md`

3. 了解当前项目代码结构和规范

### 修改代码

**注意事项**:
- 遵循命名规范：组件 PascalCase，工具函数 camelCase，常量 UPPER_SNAKE_CASE
- TypeScript 严格模式，禁止 `any` 类型
- React 函数组件 + Hooks，必须有 Props 接口

### 常用命令速查

| 任务 | 命令 |
|------|------|
| 检查变更 | `openspec list --json` |
| 查看状态 | `openspec status --change <name> --json` |
| 类型检查 | `tsc --noEmit` |

---

## 参考资源

| 资源 | 路径 | 说明 |
|------|------|------|
| OpenSpec GitHub | https://github.com/Fission-AI/OpenSpec | 官方文档 |
| 项目目标 | `doc/prompt/project_target.md` | 完整需求和技术要求 |
| 知识库规范 | `doc/prompt/iksm_hierichy.md` | 知识点数据规范 |
| 示例数据 | `iksm/math01.csv`, `iksm/math01.md` | 知识库文件示例 |

---

## 重要提示

1. **知识库目录**: 所有教材文件存放在 `iksm/` 目录下
2. **文件格式**: 同时支持 Excel (.xlsx) 和 CSV (.csv) 作为框架文件
3. **内容安全**: Markdown 中的 Mermaid 图表需要对特殊字符进行转义
4. **OpenSpec 工作流**: 所有功能开发建议通过 OpenSpec 变更管理

---

*Last Updated: 2026-03-12*
*Version: 1.0*
