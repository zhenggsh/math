## Context

数学通项目采用前后端分离架构，需要建立标准化的开发环境。当前项目处于初始化阶段，没有前端和后端代码目录，需要从零开始搭建。

根据 project_target.md 和 constitution.md 的要求：
- 前端：React 18+ + TypeScript 5+ + Vite + Vitest
- 后端：NestJS + TypeScript + Jest
- 包管理：pnpm 8+
- UI：Ant Design

## Goals / Non-Goals

**Goals:**
- 建立标准化的前端项目结构（web/）
- 建立标准化的后端项目结构（server/）
- 配置统一的代码规范工具链
- 确保 TypeScript 严格模式配置
- 建立 pnpm workspace 管理多包依赖

**Non-Goals:**
- 不实现具体业务功能
- 不配置数据库连接（后续变更处理）
- 不配置生产环境部署

## Decisions

### 1. 前端构建工具选择 Vite（而非 Create React App）
**理由：**
- Vite 启动速度更快，开发体验更好
- 原生支持 TypeScript 和 ES Modules
- 与 Vitest 集成更紧密

### 2. 后端框架选择 NestJS（而非 Express/Fastify 裸框架）
**理由：**
- 内置模块化架构，符合 constitution.md 的要求
- 依赖注入容器，便于测试和扩展
- 与 TypeScript 深度集成

### 3. 代码规范工具选择 ESLint + Prettier（而非仅 Prettier）
**理由：**
- ESLint 提供 TypeScript 类型检查规则
- Prettier 负责代码格式化，ESLint 负责代码质量
- 统一前后端代码风格

### 4. pnpm Workspace 管理（而非独立仓库或 npm/yarn）
**理由：**
- constitution.md 明确要求使用 pnpm
- Workspace 便于共享配置和脚本
- 磁盘空间优化和安装速度优势

## Risks / Trade-offs

| 风险 | 缓解措施 |
|-----|---------|
| 依赖版本冲突 | 使用 pnpm 的严格依赖管理，锁定版本 |
| TypeScript 严格模式导致迁移困难 | 初始即启用严格模式，避免后期大规模重构 |
| 前后端 ESLint 配置不一致 | 使用继承方式，共享基础配置 |

## Migration Plan

无需迁移（新建项目）

## Open Questions

- 是否需要配置 husky + lint-staged 进行提交前检查？（建议后续变更添加）
