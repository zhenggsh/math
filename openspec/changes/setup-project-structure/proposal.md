## Why

数学通项目需要建立统一的技术基础设施，包括前后端项目结构、代码规范配置和依赖管理。当前项目缺少标准化的开发环境，导致代码风格不一致、构建流程不明确。本变更是所有后续功能开发的基础，必须在实现任何业务逻辑前完成。

## What Changes

- 创建前端项目结构（web/）：React 18 + TypeScript 5 + Vite 5 配置
- 创建后端项目结构（server/）：NestJS 10 + TypeScript 5 配置
- 配置 pnpm workspace 实现 monorepo 管理
- 配置 ESLint + Prettier 统一代码风格
- 配置 TypeScript 严格模式（strict: true, noImplicitAny: true）
- 配置 Git 忽略规则和编辑器配置
- 创建项目文档模板和示例文件

## Capabilities

### New Capabilities
- `project-infrastructure`: 项目基础架构和工程化配置，包括目录结构、构建工具、代码规范

### Modified Capabilities
- 无（本项目首次变更）

## Impact

- **代码位置**：新增 web/ 和 server/ 目录
- **依赖变更**：新增开发依赖（eslint, prettier, typescript, vite, @nestjs/cli 等）
- **构建流程**：建立 pnpm 脚本标准（dev, build, lint, type-check）
- **开发规范**：所有后续代码必须遵循本变更建立的规范
- **影响范围**：整个项目，所有开发者
