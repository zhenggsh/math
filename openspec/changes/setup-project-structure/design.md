## Context

数学通项目是一个面向高中学生的数学知识点学习系统。当前项目处于初始化阶段，需要建立标准化的项目结构和开发流程。项目采用前后端分离架构，前端使用 React + TypeScript + Vite，后端使用 NestJS + TypeScript。

参考规范：
- AGENTS.md 定义了项目总览和技术栈
- openspec/constitution.md 定义了核心原则和开发工作流
- .agents/skills/project-rule/SKILL.md 定义了代码生成规则和目录结构规范

## Goals / Non-Goals

**Goals:**
- 建立符合项目规范的目录结构
- 配置 TypeScript 严格模式确保类型安全
- 统一代码风格（ESLint + Prettier）
- 建立 pnpm workspace 管理 monorepo
- 提供标准化的开发脚本

**Non-Goals:**
- 不实现任何业务逻辑
- 不配置数据库连接
- 不实现用户认证
- 不部署到生产环境

## Decisions

### Decision: 使用 pnpm workspace 而非独立仓库
**Rationale**: 前后端共享类型定义和工具函数，monorepo 便于代码复用和版本同步。

### Decision: TypeScript 严格模式
**Rationale**: 项目规范要求 strict: true，确保代码质量，减少运行时错误。

### Decision: 后端采用 NestJS 模块化架构
**Rationale**: NestJS 提供依赖注入、模块化组织，符合项目规范中定义的架构原则（constitution.md）。

### Decision: ESLint 规则继承 @typescript-eslint/recommended-type-checked
**Rationale**: 需要强制要求显式返回类型和禁止 any 类型。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 严格模式可能导致初期开发缓慢 | 提供清晰的类型示例和模板代码 |
| 团队对 NestJS 不熟悉 | 提供模块模板和代码示例 |
| 前后端类型共享增加复杂度 | 使用 pnpm workspace 共享 types 包 |

## Migration Plan

本变更是项目初始变更，无需迁移。

## Open Questions

- 是否需要配置 Docker 开发环境？（建议后续变更处理）
- 是否需要配置 CI/CD？（建议后续变更处理）
