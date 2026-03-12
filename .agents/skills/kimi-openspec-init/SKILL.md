---
name: kimi-openspec-init
description: Initialize OpenSpec workflow for Kimi Code project. Use when setting up a new project with OpenSpec spec-driven development methodology.
license: MIT
compatibility: Requires OpenSpec CLI and TRAE initialization.
metadata:
  author: kimi-code
  version: "2.0"
---

Initialize OpenSpec workflow for Kimi Code project, including skill setup and project-level specification files.

⚠️ **CRITICAL WARNING: OpenSpec Understanding Constraint**

Before proceeding, you MUST understand: **OpenSpec is the specific [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) tool, NOT a generic SDD concept.**

**You MUST verify before proceeding:**

| Check | Command | Purpose |
|-------|---------|---------|
| CLI availability | `openspec --help` | Confirm OpenSpec CLI installed |
| Actual template location | `openspec templates` | **Confirm location, don't assume** |
| Workflow list | `openspec schemas` | Understand available workflows |
| Archive check | `ls openspec/changes/archive/` 2>/dev/null \|\| echo "No archive yet" | See actual generated format |
| Skill metadata | `head -20 .agents/skills/openspec-*/SKILL.md` | Confirm skill version |

**Key Principles:**
1. **Don't assume**: Always verify, never rely on intuition
2. **CLI is source of truth**: CLI output is the single source of truth
3. **Reference archives**: Archived changes show actual generated format
4. **Skills first**: Use skills instead of manual template copying
5. **Skill format**: Current Kimi Code does NOT support `/opsx:xxxx` shortcut commands. MUST use `openspec-xxxx` format (e.g., `openspec-new-change` NOT `/opsx:new`)

---

## Prerequisites Check

Before execution, verify the following dependencies:

1. **OpenSpec CLI initialized via TRAE**
   ```bash
   # Check if .trae/skills/openspec-* exist
   ls .trae/skills/openspec-*
   ```
   Expected: 10 skill directories (openspec-new-change, openspec-apply-change, etc.)

2. **Kimi Code initialization complete**
   - AGENTS.md exists in project root
   - .agents/ or .kimi/ directory exists

3. **Project target document exists**
   - doc/prompt/project_target.md contains project goals and requirements

If any prerequisite is missing, stop and inform user to complete initialization first.

---

## Phase 1: OpenSpec Concept Education

### Core Concepts

Explain to user the OpenSpec spec-driven development workflow:

**1. Change (变更)**
- A container for a single feature, fix, or modification
- Named in kebab-case (e.g., `add-user-authentication`)
- Contains artifacts: proposal → design → tasks → spec-deltas

**2. Proposal (提案)**
- **Why**: Motivation and problem statement
- **What Changes**: Description of changes
- **Capabilities**: New/modified system capabilities
- **Impact**: Affected code, APIs, dependencies

**3. Design (设计)** [Optional]
- **Context**: Background and current state
- **Goals / Non-Goals**: Scope definition
- **Decisions**: Key architectural decisions with rationale
- **Risks / Trade-offs**: Known risks and mitigation

**4. Tasks (任务)**
- Actionable implementation checklist
- Format: `## 1. Group Name` → `- [ ] 1.1 Task description`
- Each task should be completable in 30min-2 hours

**5. Spec (规格)**
- Main spec: Source of truth in `openspec/specs/<capability>/spec.md`
- Spec-delta: Changes relative to main spec using semantic markers:
  - `## ADDED Requirements`
  - `## MODIFIED Requirements`
  - `## REMOVED Requirements`

### Reference
- Official OpenSpec: https://github.com/Fission-AI/OpenSpec
- CLI templates: Run `openspec templates` to see actual template locations

---

## Phase 2: Copy OpenSpec Skills

### Step 2.1: List Source Skills
List all OpenSpec skills from TRAE initialization:
```bash
ls .trae/skills/openspec-*/SKILL.md
```

### Step 2.2: Copy to Kimi Code Skills
Copy each skill to `.agents/skills/`:

```bash
# Create directories if not exist
mkdir -p .agents/skills/openspec-new-change
mkdir -p .agents/skills/openspec-continue-change
mkdir -p .agents/skills/openspec-ff-change
mkdir -p .agents/skills/openspec-apply-change
mkdir -p .agents/skills/openspec-verify-change
mkdir -p .agents/skills/openspec-archive-change
mkdir -p .agents/skills/openspec-bulk-archive-change
mkdir -p .agents/skills/openspec-sync-specs
mkdir -p .agents/skills/openspec-explore
mkdir -p .agents/skills/openspec-onboard

# Copy skill files
cp .trae/skills/openspec-new-change/SKILL.md .agents/skills/openspec-new-change/
cp .trae/skills/openspec-continue-change/SKILL.md .agents/skills/openspec-continue-change/
cp .trae/skills/openspec-ff-change/SKILL.md .agents/skills/openspec-ff-change/
cp .trae/skills/openspec-apply-change/SKILL.md .agents/skills/openspec-apply-change/
cp .trae/skills/openspec-verify-change/SKILL.md .agents/skills/openspec-verify-change/
cp .trae/skills/openspec-archive-change/SKILL.md .agents/skills/openspec-archive-change/
cp .trae/skills/openspec-bulk-archive-change/SKILL.md .agents/skills/openspec-bulk-archive-change/
cp .trae/skills/openspec-sync-specs/SKILL.md .agents/skills/openspec-sync-specs/
cp .trae/skills/openspec-explore/SKILL.md .agents/skills/openspec-explore/
cp .trae/skills/openspec-onboard/SKILL.md .agents/skills/openspec-onboard/
```

### Step 2.3: Verify Copy
Verify all skills copied successfully:
```bash
ls .agents/skills/openspec-*/SKILL.md
```
Expected: 10 SKILL.md files in respective directories.

---

## Phase 3: Initialize Project Specification Files

Read `doc/prompt/project_target.md` to extract:
- Project name and purpose
- Technology stack requirements
- Functional requirements
- User roles and permissions

**Document Structure Overview:**

Three project-level specification files must be created with clear responsibilities:

| File | Responsibility | Target Reader |
|------|----------------|---------------|
| **AGENTS.md** | Project overview and entry guide | AI Agent first contact |
| **openspec/constitution.md** | Project constitution (principles + workflow) | Agents needing principles/process |
| **.agents/skills/project-rule/SKILL.md** | Code generation rules | Agents writing code |

**Key Rule**: AGENTS.md contains the **OpenSpec Understanding Constraint** (single source of truth). Other documents reference it, do not duplicate.

### Step 3.1: Create/Update AGENTS.md

Create comprehensive project overview:

```markdown
# [Project Name] - Project Documentation

> **Agent 必读**: 本文档是项目总览和入口指南。开始工作前请先阅读 [.agents/skills/project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md) 了解代码生成规则。

---

## 项目概述

**[Project Name]** 是一个 [brief description based on project_target.md].

### 核心功能
- [Feature 1 from project_target.md]
- [Feature 2 from project_target.md]
- [Feature 3 from project_target.md]

---

## 技术栈概览

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | [From project_target.md] | [Version] |
| 后端 | [From project_target.md] | [Version] |
| ORM | [From project_target.md] | [Version] |
| 数据库 | [From project_target.md] | [Version] |
| 包管理 | pnpm | 8+ |

### 特色功能
- [Special features from project_target.md]

---

## 文档导航

| 文档 | 用途 | 何时阅读 |
|------|------|----------|
| **[project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md)** | ⭐ **代码生成规则** - 技术约束、命名规范、代码风格 | **每次编码前必须阅读** |
| **[openspec/constitution.md](openspec/constitution.md)** | 项目宪法 - 核心原则、技术决策、质量门禁、开发工作流 | 首次接触项目时 |
| **[doc/prompt/project_target.md](doc/prompt/project_target.md)** | 原始需求文档 - 完整功能要求 | 了解需求细节时 |

---

## 项目结构

```
.
├── openspec/                    # OpenSpec 配置与变更管理
│   ├── constitution.md          # 📍 项目宪法（原则、决策、工作流）
│   ├── specs/                   # 能力规格定义目录（source of truth）
│   └── changes/                 # 变更目录
│       └── archive/             # 已归档变更
│
├── doc/
│   └── prompt/
│       └── project_target.md    # 项目目标与技术要求
│
├── .agents/
│   └── skills/
│       ├── project-rule/        # 代码生成规则（SKILL.md）
│       └── openspec-*/          # OpenSpec 工作流技能
│
└── [src/web/server]/            # 源代码（根据实际结构）
```

---

## 快速开始

### 1. 开始工作前

**必须执行**：
1. 检查是否有活跃的 OpenSpec 变更：
   ```bash
   openspec list --json
   ```
2. 如果有活跃变更，先阅读其 `proposal.md`、`design.md`、`tasks.md`
3. 阅读 [project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md) 了解代码约束

### 2. 使用 OpenSpec 开发新功能

⚠️ **重要提醒：OpenSpec 理解约束**

OpenSpec 是具体的 [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) 工具，不是通用的 SDD 概念。在操作前必须：

| 检查项 | 命令 | 目的 |
|--------|------|------|
| CLI 可用性 | `openspec --help` | 确认 OpenSpec CLI 已安装 |
| 模板实际位置 | `openspec templates` | **确认模板位置，不要假设** |
| 工作流列表 | `openspec schemas` | 了解可用工作流 |
| 历史归档检查 | `ls openspec/changes/archive/` | 查看实际使用的格式 |
| 技能元数据 | `head -20 .agents/skills/openspec-*/SKILL.md` | 确认 skill 版本和来源 |

**关键原则**：
1. **不要假设**：务必验证，不要凭直觉理解
2. **以 CLI 为准**：CLI 输出是事实的唯一来源
3. **参考归档**：已归档的 change 展示了实际生成的格式
4. **必须使用技能**：使用 skill 调用 openspec 相应指令，而不是手动复制模板和自行创作模板
5. **技能格式**：当前 Kimi Code 不支持 `/opsx:xxxx` 格式的快捷指令，必须使用 `openspec-xxxx` 格式的 skill（如 `openspec-new-change` 而非 `/opsx:new`）

**开发流程**：
1. **探索**（可选）：使用 `openspec-explore` 技能思考问题
2. **创建变更**：使用 `openspec-new-change` 或 `openspec-ff-change` 技能
3. **实施**：使用 `openspec-apply-change` 技能执行 tasks.md
4. **验证**：使用 `openspec-verify-change` 技能检查质量
5. **归档**：使用 `openspec-archive-change` 技能完成变更

### 3. 修改代码

**注意事项**：
- 阅读 [project-rule/SKILL.md](.agents/skills/project-rule/SKILL.md) 了解代码约束
- 遵循命名规范：组件 PascalCase，工具函数 camelCase，常量 UPPER_SNAKE_CASE
- TypeScript 严格模式，禁止 `any` 类型
- React 函数组件 + Hooks，必须有 Props 接口

---

## 关键规范速查

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `UserProfile.tsx` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型定义 | PascalCase + .types | `User.types.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` |
| 数据库表 | snake_case, 复数 | `users` |
| OpenSpec 变更 | kebab-case | `add-user-auth` |

### 代码要求

- **TypeScript**：严格模式（`strict: true`），禁止 `any` 类型
- **React**：函数组件 + Hooks，必须有 Props 接口
- **API**：RESTful 设计，统一响应格式

### 质量门禁

- [ ] `tsc --noEmit` 无错误
- [ ] 无 `console.log` / `debugger`
- [ ] 无未使用变量/导入
- [ ] 所有函数有返回类型
- [ ] 所有组件有 Props 接口

---

## 参考资源

| 资源 | 路径 | 说明 |
|------|------|------|
| OpenSpec GitHub | https://github.com/Fission-AI/OpenSpec | 官方文档 |
| 项目目标 | `doc/prompt/project_target.md` | 完整需求 |
| 项目宪法 | `openspec/constitution.md` | 原则、决策、工作流 |
| 代码规则 | `.agents/skills/project-rule/SKILL.md` | 强制规则 |

---

*Last Updated: [Date]*
*Version: 1.0*
```

### Step 3.2: Create openspec/constitution.md

Create project constitution (principles + workflow merged):

```markdown
# Project Constitution - [Project Name]

> 项目宪法 - 定义基本原则、约束条件、决策框架和开发工作流
> 
> **何时阅读**：首次接触项目时阅读，了解项目核心原则、技术决策和开发流程。

---

## Project Mission

[Brief description from project_target.md]

**核心目标**:
1. [Goal 1 from project_target.md]
2. [Goal 2 from project_target.md]
3. [Goal 3 from project_target.md]

---

## Core Principles

### 1. Data Ownership

[Define data ownership principles based on project_target.md]

### 2. Separation of Concerns

**前端层**
- 技术: [From project_target.md]
- 职责: 用户界面渲染、用户交互、状态管理
- 约束: 无直接数据库访问，通过 API 通信

**后端层**
- 技术: [From project_target.md]
- 职责: 业务逻辑、数据验证、数据库访问
- 约束: 无状态设计，可水平扩展

**数据层**
- 技术: [From project_target.md]
- 约束: 清晰的数据边界

### 3. Extensibility

[Define extensibility principles]

---

## Technical Constraints

### Stack Requirements

| 层级 | 技术 | 版本要求 | 备注 |
|------|------|----------|------|
| 前端 | [From project_target.md] | [Version] | [Notes] |
| 后端 | [From project_target.md] | [Version] | [Notes] |
| ORM | [From project_target.md] | [Version] | [Notes] |
| 数据库 | [From project_target.md] | [Version] | [Notes] |
| 包管理 | pnpm | 8+ | 必须 |

### Project Structure

```
project-root/
├── [web/src/ or frontend/]     # 前端
├── [server/src/ or backend/]   # 后端
├── openspec/                   # OpenSpec 配置
│   ├── constitution.md         # 📍 本文档
│   ├── specs/                  # 能力规格
│   └── changes/                # 变更目录
│       └── archive/            # 已归档变更
└── doc/                        # 需求文档
```

### Code Standards (Summary)

**详细规则见**：[.agents/skills/project-rule/SKILL.md](../.agents/skills/project-rule/SKILL.md)

**TypeScript**
- strict: true
- noImplicitAny: true
- 显式返回类型 on 公共函数

**React**
- 仅使用函数组件
- Props 必须定义接口

**命名规范**
- 组件: PascalCase
- 工具函数: camelCase
- 常量: UPPER_SNAKE_CASE

---

## Development Workflow (OpenSpec)

> **前置检查**：在使用 OpenSpec 前，请先阅读 [AGENTS.md](../AGENTS.md) 中的「OpenSpec 理解约束」章节，确保正确理解 OpenSpec 工具。

本项目采用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 进行结构化开发管理。

### 核心概念

| 概念 | 说明 | 对应文件 |
|------|------|----------|
| **Change** | 变更容器 | `openspec/changes/<name>/` |
| **Proposal** | 提案 | `proposal.md` |
| **Spec** | 规格 | `specs/<capability>/spec.md` |
| **Design** | 设计 | `design.md` |
| **Task** | 任务 | `tasks.md` |

### 完整工作流程

```
Explore → New/FF → Create Artifacts → Apply → Verify → Archive
```

### 变更大小分类

| 变更类型 | 说明 | 推荐方式 |
|----------|------|----------|
| **微小变更** | typo 修复、样式微调 | 直接编辑，无需 OpenSpec |
| **小型变更** | 单文件重构 | `openspec-ff-change` |
| **中型变更** | 新功能 | `openspec-new-change` |
| **大型变更** | 架构调整 | `openspec-new-change`，完整 Proposal + Design |

### 命名规范

#### 变更名称
- **格式**: kebab-case
- **模式**: `<action>-<object>-<description>`
- **示例**: `add-user-authentication`

#### 能力名称
- **格式**: kebab-case
- **示例**: `auth`, `knowledge`, `learning`

### 工件格式

#### proposal.md
```markdown
## Why
## What Changes
## Capabilities
## Impact
```

#### design.md (Optional)
```markdown
## Context
## Goals / Non-Goals
## Decisions
## Risks / Trade-offs
```

#### tasks.md
```markdown
## 1. Module Name
- [ ] 1.1 Task description
- [ ] 1.2 Task description
```

### OpenSpec CLI 命令

```bash
openspec list --json
openspec new change <kebab-case-name>
openspec status --change <name>
openspec archive <name>
```

---

## Quality Gates

### Code Quality Checklist

**实施前**:
- [ ] 已阅读相关 OpenSpec 工件（如有）
- [ ] 确认技术方案（如有 Design）

**实施中**:
- [ ] 遵循项目代码规范
- [ ] TypeScript 严格模式通过

**实施后**:
- [ ] 无 `console.log` / `debugger`
- [ ] 无未使用变量/导入

### OpenSpec Checklist

**提交变更前检查**:
- [ ] 变更名称符合 kebab-case
- [ ] proposal.md 包含所有必需章节
- [ ] tasks.md 任务粒度合适（30分钟-2小时/任务）
- [ ] 生成的代码符合 project-rule 技术约束

---

## Decision Records

### 技术决策

| 日期 | 决策 | 理由 | 状态 |
|------|------|------|------|
| [Date] | [Decision from project_target.md] | [Rationale] | 已确定 |

---

## References

- [OpenSpec GitHub](https://github.com/Fission-AI/OpenSpec)
- [AGENTS.md](../AGENTS.md) - 项目总览
- [.agents/skills/project-rule/SKILL.md](../.agents/skills/project-rule/SKILL.md) - 代码规则

---

*Last Updated: [Date]*
*Version: 1.0*
```

### Step 3.3: Create project-rule/SKILL.md

Create code generation rules:

```markdown
---
name: project-rule
description: Code generation rules for [Project Name]. Apply when generating any code for this project.
license: MIT
metadata:
  author: kimi-code
  version: "1.0"
---

# [Project Name] 项目代码生成规则

> **Agent 必读**: 本文档是代码生成的唯一权威规范。开始编码前请先阅读本文档，了解技术约束和代码风格。
> 
> **相关文档**：
> - [AGENTS.md](../../AGENTS.md) - 项目总览和导航
> - [openspec/constitution.md](../../../openspec/constitution.md) - 项目宪法（核心原则、技术决策、开发工作流）

---

## 工作前检查清单

### 第一步：检查活跃变更

```bash
openspec list --json
```

- 如果有活跃变更 → 先阅读其 `proposal.md`、`design.md`、`tasks.md`
- 如果有多个变更 → 询问用户关注哪个

### 第二步：确认项目结构

- 前端: `[web/src/ or frontend path]`
- 后端: `[server/src/ or backend path]`
- 数据库: `[prisma schema location]`

---

## 技术栈规范

### 前端

| 技术 | 版本 | 要求 |
|------|------|------|
| [From project_target.md] | [Version] | [Requirements] |
| TypeScript | 5+ | Strict 模式 |

### 后端

| 技术 | 版本 | 要求 |
|------|------|------|
| [From project_target.md] | [Version] | [Requirements] |
| TypeScript | 5+ | Strict 模式 |

### 开发工具

- **包管理**: pnpm 8+（必须）

---

## TypeScript 严格规范

### 编译器配置（必须）

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

### 类型规则

| 规则 | 要求 |
|------|------|
| ✅ DO | 函数参数和返回值使用显式类型 |
| ❌ DON'T | 使用 `any`（除非有注释说明理由） |

---

## React 组件规范

### 组件规则

| 规则 | 要求 |
|------|------|
| ✅ ONLY | 函数组件 |
| ✅ MUST | 定义 Props 接口 |
| ❌ NO | 类组件 |

---

## API 设计规范

### RESTful 设计

| 要求 | 规范 |
|------|------|
| HTTP 方法 | GET, POST, PUT, DELETE, PATCH |
| 状态码 | 200, 201, 400, 401, 403, 404, 500 |

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 | 扩展名 |
|------|------|------|--------|
| React 组件 | PascalCase | `UserProfile.tsx` | .tsx |
| 工具函数 | camelCase | `formatDate.ts` | .ts |
| 类型定义 | PascalCase + .types | `User.types.ts` | .ts |
| 常量 | UPPER_SNAKE_CASE | `API_ENDPOINTS.ts` | .ts |

### 数据库（Prisma）

| 类型 | 规范 | 示例 |
|------|------|------|
| 表名 | snake_case, 复数 | `users` |
| 列名 | snake_case | `created_at` |

---

## 项目目录结构

```
project-root/
├── [web/frontend]/           # 前端
│   ├── src/
│   │   ├── components/       # 可复用组件
│   │   ├── pages/            # 页面组件
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── utils/            # 工具函数
│   │   └── types/            # TypeScript 类型
│
├── [server/backend]/         # 后端
│   ├── src/
│   │   ├── routes/           # API 路由
│   │   ├── controllers/      # 请求处理器
│   │   ├── services/         # 业务逻辑
│   │   └── models/           # 数据模型
│
├── openspec/                 # OpenSpec 配置
│   ├── constitution.md       # 📍 项目宪法
│   ├── specs/                # 能力规格
│   └── changes/              # 变更目录
│
└── doc/                      # 需求文档
    └── prompt/
        └── project_target.md
```

---

## OpenSpec 集成

> **前置检查**：在使用 OpenSpec 前，请先阅读 [AGENTS.md](../../AGENTS.md) 中的「OpenSpec 理解约束」章节。

### 何时使用 OpenSpec

| 变更类型 | 使用 OpenSpec? | 方式 |
|----------|---------------|------|
| Typo 修复 | 否 | 直接编辑 |
| 新组件 | 是 | `openspec-new-change` |
| 新功能 | 是 | `openspec-new-change` |
| 数据库变更 | 是 | `openspec-new-change` |

### 处理活跃变更

**必须**:
1. 阅读 `tasks.md` 了解当前状态
2. 参考 `design.md` 的技术决策
3. 完成任务后勾选
4. 如有偏差更新工件

---

## 完成前强制检查清单

### 代码质量

- [ ] `tsc --noEmit` 通过，零错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 无 `console.log` 或 `debugger` 语句
- [ ] 无未使用导入或变量
- [ ] 所有函数有返回类型
- [ ] 所有组件有 Props 接口

### OpenSpec（如适用）

- [ ] tasks.md 所有任务完成
- [ ] 实现符合 design.md 决策
- [ ] 已执行 `openspec archive <name>` 归档

---

## 常用命令速查

| 任务 | 命令 |
|------|------|
| 检查变更 | `openspec list --json` |
| 创建变更 | `openspec new change <name>` |
| 归档变更 | `openspec archive <name>` |
| 类型检查 | `tsc --noEmit` |

---

## 记住

1. **Always** 首先检查活跃的 OpenSpec 变更
2. **Always** 遵循 TypeScript 严格模式
3. **Always** 完成预完成检查清单
4. **Always** 归档已完成的变更

**有疑问时**：询问用户或参考 [openspec/constitution.md](../../../openspec/constitution.md)

---

*Version: 1.0*
*Last Updated: [Date]*
```

---

## Phase 4: Verification

### Step 4.1: Verify OpenSpec Understanding

Execute the verification commands BEFORE proceeding:

```bash
# 1. CLI availability
openspec --help

# 2. Template location
openspec templates

# 3. Workflow list
openspec schemas

# 4. Archive check
ls openspec/changes/archive/ 2>/dev/null || echo "No archive yet"

# 5. Skill metadata
head -20 .agents/skills/openspec-*/SKILL.md
```

### Step 4.2: Create Test Change

1. **Create a test change**:
   ```
   Use skill: openspec-new-change test-change
   ```
   Expected: Change directory created with proper structure

2. **Check status**:
   ```bash
   openspec status --change test-change
   ```
   Expected: Shows artifact status and next steps

3. **Verify and cleanup**:
   ```bash
   openspec archive test-change
   ```

### Step 4.3: Verify Specification Files

Check for consistency across three files:

| Aspect | AGENTS.md | constitution.md | project-rule/SKILL.md |
|--------|-----------|-----------------|----------------------|
| Project Name | ✅ | ✅ | ✅ |
| Tech Stack | ✅ Listed | ✅ Referenced | ✅ Detailed |
| OpenSpec Constraint | ✅ **Single Source** | ✅ References AGENTS | ✅ References AGENTS |
| Constraints | ✅ High-level | ✅ Process | ✅ Technical |

**CRITICAL**: Ensure NO duplicate OpenSpec constraint sections in constitution.md or project-rule. They MUST reference AGENTS.md.

### Step 4.4: Cross-Reference Check

Verify no conflicts:
- AGENTS.md → constitution.md link works
- AGENTS.md → project-rule/SKILL.md link works
- constitution.md → AGENTS.md link works
- constitution.md → project-rule/SKILL.md link works
- project-rule → AGENTS.md link works
- project-rule → constitution.md link works

---

## Completion Criteria

Initialization is complete when:

1. ✅ 10 OpenSpec skills copied to `.agents/skills/`
2. ✅ AGENTS.md created with:
   - Project overview
   - **OpenSpec Understanding Constraint** (single source)
   - Document navigation table
   - Quick start guide
3. ✅ openspec/constitution.md created with:
   - Project constitution (principles)
   - Development workflow (merged)
   - **Reference to AGENTS.md for OpenSpec constraint**
4. ✅ project-rule/SKILL.md created with:
   - Code generation rules
   - **Reference to AGENTS.md for OpenSpec constraint**
5. ✅ All three files cross-reference correctly
6. ✅ No duplicate OpenSpec constraint sections
7. ✅ User can successfully run `openspec-new-change test-change`

---

## Output

Summarize initialization results:

```
✅ OpenSpec Initialization Complete

Skills installed:
- openspec-new-change
- openspec-continue-change
- openspec-ff-change
- openspec-apply-change
- openspec-verify-change
- openspec-archive-change
- openspec-bulk-archive-change
- openspec-sync-specs
- openspec-explore
- openspec-onboard

Files created:
- AGENTS.md (project overview, contains OpenSpec constraint)
- openspec/constitution.md (principles + workflow)
- .agents/skills/project-rule/SKILL.md (code rules)

Next steps:
1. Review the generated specification files
2. Customize content based on project_target.md
3. Start development with: openspec-new-change <change-name>

⚠️ IMPORTANT: Always read AGENTS.md first for OpenSpec understanding constraint
```
