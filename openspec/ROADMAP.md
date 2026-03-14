# 数学通项目 - OpenSpec Roadmap

> **项目**: 数学通 (Math Learning System)  
> **版本**: 1.0  
> **创建时间**: 2026-03-14  
> **最后更新**: 2026-03-14

---

## 📋 项目概述

数学通是一个面向高中学生的数学知识点学习系统，支持教材大纲展示、知识点学习、学习情况记录与分析。

### 技术栈
- **前端**: React 18+ + TypeScript + Vite + Vitest + Ant Design
- **后端**: NestJS + TypeScript + Prisma + Jest
- **数据库**: PostgreSQL 14+
- **包管理**: pnpm 8+

---

## 🗺️ 变更依赖关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数学通项目变更路线图                                │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: 基础设施层
──────────────────
┌──────────────────────┐
│ init-project-structure│◄── 基础项目结构
│ (大型变更, 6-8h)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ setup-database-schema │◄── 数据库模型
│ (大型变更, 4-6h)     │
└──────────┬───────────┘
           │
           ▼
Phase 2: 认证授权层
──────────────────
┌───────────────────────────┐
│ implement-user-authentication│◄── 用户认证
│ (中型变更, 6-8h)          │
└───────────┬───────────────┘
            │
            ▼
Phase 3: 核心业务层
──────────────────
┌─────────────────────────────┐
│ implement-textbook-management│◄── 知识库管理
│ (大型变更, 8-10h)           │
└───────────┬─────────────────┘
            │
            ▼
┌───────────────────────────────┐
│ implement-knowledge-learning-ui│◄── 学习界面
│ (大型变更, 10-12h)            │
└───────────┬───────────────────┘
            │
            ▼
Phase 4: 学习功能层
──────────────────
┌───────────────────────────┐
│ implement-learning-record  │◄── 学习记录
│ (中型变更, 6-8h)          │
└───────────┬───────────────┘
            │
            ├──────────────────┐
            │                  │
            ▼                  ▼
┌──────────────────────┐ ┌──────────────────────────┐
│ implement-smart-     │ │ implement-learning-      │
│ learning-modes       │ │ analytics                │
│ (中型变更, 6-8h)     │ │ (中型变更, 6-8h)         │
│ 薄弱点/重要性/随机    │ │ 学习分析/统计图表         │
└──────────────────────┘ └──────────────────────────┘

总预计工时: 52-68 小时
```

---

## 📊 变更清单

| 序号 | 变更名称 | 类型 | 预计工时 | 状态 | 目录 |
|-----|---------|------|---------|------|------|
| 1 | init-project-structure | 大型 | 6-8h | ⏳ 待实施 | `openspec/changes/init-project-structure/` |
| 2 | setup-database-schema | 大型 | 4-6h | ⏳ 待实施 | `openspec/changes/setup-database-schema/` |
| 3 | implement-user-authentication | 中型 | 6-8h | ⏳ 待实施 | `openspec/changes/implement-user-authentication/` |
| 4 | implement-textbook-management | 大型 | 8-10h | ⏳ 待实施 | `openspec/changes/implement-textbook-management/` |
| 5 | implement-knowledge-learning-ui | 大型 | 10-12h | ⏳ 待实施 | `openspec/changes/implement-knowledge-learning-ui/` |
| 6 | implement-learning-record | 中型 | 6-8h | ⏳ 待实施 | `openspec/changes/implement-learning-record/` |
| 7 | implement-smart-learning-modes | 中型 | 6-8h | ⏳ 待实施 | `openspec/changes/implement-smart-learning-modes/` |
| 8 | implement-learning-analytics | 中型 | 6-8h | ⏳ 待实施 | `openspec/changes/implement-learning-analytics/` |

---

## 🔗 变更详细说明

### Phase 1: 基础设施层

#### 1. init-project-structure
- **变更类型**: 大型变更
- **预计工时**: 6-8 小时
- **前置条件**: 无
- **后续依赖**: setup-database-schema

**核心能力**: `project-bootstrap`

**主要产出**:
- `web/` - 前端项目（React + Vite + TypeScript）
- `server/` - 后端项目（NestJS + TypeScript）
- `pnpm-workspace.yaml` - pnpm 工作区配置
- ESLint + Prettier 统一配置
- Ant Design 主题配置

**执行前检查**:
- [ ] Node.js >= 18
- [ ] pnpm >= 8
- [ ] `web/` 和 `server/` 目录不存在

---

#### 2. setup-database-schema
- **变更类型**: 大型变更
- **预计工时**: 4-6 小时
- **前置条件**: init-project-structure ✅
- **后续依赖**: implement-user-authentication

**核心能力**: `database-core`

**主要产出**:
- `server/prisma/schema.prisma` - 数据库模型定义
- `server/prisma/migrations/` - 数据库迁移文件
- `server/src/prisma/` - PrismaService 封装

**实体定义**:
- User（用户）
- Textbook（教材）
- KnowledgePoint（知识点）
- LearningRecord（学习记录）

**执行前检查**:
- [ ] PostgreSQL >= 14 已安装并运行
- [ ] 数据库 `mathtong` 已创建
- [ ] init-project-structure 已完成

---

### Phase 2: 认证授权层

#### 3. implement-user-authentication
- **变更类型**: 中型变更
- **预计工时**: 6-8 小时
- **前置条件**: setup-database-schema ✅
- **后续依赖**: implement-textbook-management

**核心能力**: `auth`

**主要产出**:
- 后端：AuthModule、JWT Strategy、Role Guard
- 前端：LoginPage、RegisterPage、AuthContext
- 角色系统：STUDENT / TEACHER / ADMIN

**执行前检查**:
- [ ] User 模型已在数据库中创建
- [ ] 可连接 PostgreSQL
- [ ] setup-database-schema 已完成

---

### Phase 3: 核心业务层

#### 4. implement-textbook-management
- **变更类型**: 大型变更
- **预计工时**: 8-10 小时
- **前置条件**: implement-user-authentication ✅
- **后续依赖**: implement-knowledge-learning-ui

**核心能力**: `file-parser`, `textbook-management`

**主要产出**:
- 文件解析：xlsx/csv → KnowledgePoint
- Markdown 读取与存储
- 文件管理界面（上传/删除/刷新）
- 教材管理页面（左侧文件树 + 右侧列表）

**执行前检查**:
- [ ] 教师角色可登录
- [ ] `iksm/` 目录存在示例文件
- [ ] implement-user-authentication 已完成

---

#### 5. implement-knowledge-learning-ui
- **变更类型**: 大型变更
- **预计工时**: 10-12 小时
- **前置条件**: implement-textbook-management ✅
- **后续依赖**: implement-learning-record

**核心能力**: `knowledge-tree`, `markdown-preview`

**主要产出**:
- 多栏式布局（可拖拽调整）
- 知识树组件（树图 + 思维导图双模式）
- Markdown 预览（KaTeX 公式 + Mermaid 图表）
- AI 侧栏框架（预留扩展）

**执行前检查**:
- [ ] 知识点数据已入库
- [ ] 教材管理功能正常
- [ ] implement-textbook-management 已完成

---

### Phase 4: 学习功能层

#### 6. implement-learning-record
- **变更类型**: 中型变更
- **预计工时**: 6-8 小时
- **前置条件**: implement-knowledge-learning-ui ✅
- **后续依赖**: implement-smart-learning-modes, implement-learning-analytics

**核心能力**: `learning-record`

**主要产出**:
- 学习记录 API（时间、时长、掌握程度）
- 反馈面板组件（下方反馈区）
- 掌握程度评分组件（A/B/C/D/E）
- 学习计时器功能

**执行前检查**:
- [ ] 学习界面已可用
- [ ] 学生角色可登录
- [ ] implement-knowledge-learning-ui 已完成

---

#### 7. implement-smart-learning-modes
- **变更类型**: 中型变更
- **预计工时**: 6-8 小时
- **前置条件**: implement-learning-record ✅
- **后续依赖**: 无

**核心能力**: `smart-learning`

**主要产出**:
- 薄弱点学习（掌握程度 C/D/E）
- 重要性分级学习（A → B → C）
- 随机学习模式
- 学习模式切换界面

**执行前检查**:
- [ ] 有学习记录数据可供分析
- [ ] implement-learning-record 已完成

---

#### 8. implement-learning-analytics
- **变更类型**: 中型变更
- **预计工时**: 6-8 小时
- **前置条件**: implement-learning-record ✅
- **后续依赖**: 无

**核心能力**: `analytics`

**主要产出**:
- 学习统计数据聚合 API
- ECharts 图表组件
- 学生学习分析页面
- 教师全局分析页面

**执行前检查**:
- [ ] 有学习记录数据可供分析
- [ ] implement-learning-record 已完成

---

## 📁 项目文件结构

```
cursor_math_openspec/
├── openspec/
│   ├── constitution.md          # 项目宪法
│   ├── ROADMAP.md              # 📍 本文档 - 项目路线图
│   └── changes/                # 变更目录
│       ├── init-project-structure/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       └── project-bootstrap/
│       │           └── spec.md
│       ├── setup-database-schema/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       └── database-core/
│       │           └── spec.md
│       ├── implement-user-authentication/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       └── auth/
│       │           └── spec.md
│       ├── implement-textbook-management/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       ├── file-parser/
│       │       │   └── spec.md
│       │       └── textbook-management/
│       │           └── spec.md
│       ├── implement-knowledge-learning-ui/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       ├── knowledge-tree/
│       │       │   └── spec.md
│       │       └── markdown-preview/
│       │           └── spec.md
│       ├── implement-learning-record/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       └── learning-record/
│       │           └── spec.md
│       ├── implement-smart-learning-modes/
│       │   ├── proposal.md
│       │   ├── design.md
│       │   ├── tasks.md
│       │   └── specs/
│       │       └── smart-learning/
│       │           └── spec.md
│       └── implement-learning-analytics/
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
│               └── analytics/
│                   └── spec.md
│
├── web/                        # 前端项目（由 init-project-structure 创建）
├── server/                     # 后端项目（由 init-project-structure 创建）
├── iksm/                       # 知识库存储目录
│   ├── math01.xlsx
│   ├── math01.csv
│   └── math01.md
├── doc/
│   └── prompt/
│       ├── project_target.md   # 项目目标
│       └── iksm_hierichy.md    # 知识库规范
├── .agents/
│   └── skills/
│       ├── project-rule/       # 代码生成规则
│       ├── openspec-explore/
│       ├── openspec-propose/
│       ├── openspec-apply-change/
│       └── openspec-archive-change/
└── AGENTS.md                   # 项目总览
```

---

## 🚀 快速开始

### 查看变更状态
```bash
openspec list --json
```

### 实施变更
```bash
# 使用 openspec-apply-change skill
# 或执行
openspec status --change <change-name>
```

### 归档变更
```bash
openspec archive <change-name>
```

---

## 📖 参考文档

### 项目约束文档
| 文档 | 路径 | 说明 |
|-----|------|------|
| 项目宪法 | `openspec/constitution.md` | 核心原则、技术决策、开发工作流 |
| 项目总览 | `AGENTS.md` | 项目概述、快速开始 |
| 代码规则 | `.agents/skills/project-rule/SKILL.md` | 代码生成规则、命名规范 |

### 需求文档
| 文档 | 路径 | 说明 |
|-----|------|------|
| 项目目标 | `doc/prompt/project_target.md` | 完整需求和技术要求 |
| 知识库规范 | `doc/prompt/iksm_hierichy.md` | 知识点数据规范 |

### OpenSpec Skills
| Skill | 路径 | 说明 |
|-------|------|------|
| openspec-explore | `.agents/skills/openspec-explore/SKILL.md` | 探索模式 |
| openspec-propose | `.agents/skills/openspec-propose/SKILL.md` | 创建变更提案 |
| openspec-apply-change | `.agents/skills/openspec-apply-change/SKILL.md` | 实施变更 |
| openspec-archive-change | `.agents/skills/openspec-archive-change/SKILL.md` | 归档变更 |

---

## ✅ 质量门禁

### 每个变更实施前
- [ ] 已阅读相关 OpenSpec 工件（proposal.md、design.md、tasks.md）
- [ ] 确认技术方案（如有 design.md）
- [ ] 前置变更已完成

### 每个变更实施后
- [ ] `tsc --noEmit` 无错误
- [ ] 无 `any` 类型（有文档的例外允许）
- [ ] 无 `console.log` 或 `debugger` 语句
- [ ] 无未使用变量/导入
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] ESLint + Prettier 代码风格检查通过

---

## 📝 变更命名规范

- **格式**: kebab-case
- **模式**: `<action>-<object>-<description>`
- **示例**:
  - `init-project-structure`
  - `setup-database-schema`
  - `implement-user-authentication`
  - `add-user-profile-page`

---

*最后更新: 2026-03-14*  
*版本: 1.0*
