## Why

数学通项目需要一个标准化的项目基础架构，包括前端（React + TypeScript + Vite）和后端（NestJS + TypeScript）的初始配置。建立统一的代码规范工具链（ESLint + Prettier）和包管理（pnpm workspace）是确保代码质量和开发效率的基础。

## What Changes

- 初始化前端项目结构：React 18 + TypeScript 5 + Vite + Vitest
- 初始化后端项目结构：NestJS 10 + TypeScript 5 + Jest
- 配置 pnpm workspace 管理前后端依赖
- 配置统一的 ESLint + Prettier 代码规范
- 配置 TypeScript 严格模式（strict: true, noImplicitAny: true）
- 配置 Ant Design 主题系统
- 建立基础目录结构（web/, server/, iksm/）

## Capabilities

### New Capabilities
- `project-bootstrap`: 项目脚手架能力，包含前后端基础配置和工具链设置

### Modified Capabilities
- 无

## Impact

- 新增 `web/` 目录：前端源代码、配置文件、测试设置
- 新增 `server/` 目录：后端源代码、Prisma 配置、测试设置
- 新增 `pnpm-workspace.yaml`：pnpm 工作区配置
- 新增共享 ESLint/Prettier 配置
- 为后续所有变更提供基础依赖和工具链

---

## 执行前检查

### 环境检查
- [ ] Node.js 版本 >= 18
- [ ] pnpm 版本 >= 8
- [ ] PostgreSQL 已安装（为后续数据库变更准备）

### 项目状态检查
- [ ] 当前工作目录为项目根目录
- [ ] 不存在 `web/` 和 `server/` 目录（或已备份）
- [ ] `iksm/` 目录已存在（示例数据已就位）

---

## 执行过程注意事项

### 前端初始化
1. 使用 `npm create vite@latest web -- --template react-ts` 创建前端项目
2. 安装依赖：`pnpm install`（在 web 目录下）
3. 安装 Vitest 和测试相关依赖
4. 安装 Ant Design 和图标库
5. 配置 ESLint 继承 `@typescript-eslint/recommended-type-checked`
6. 配置 Prettier（2空格缩进、单引号、尾随逗号）

### 后端初始化
1. 使用 `nest new server` 创建后端项目
2. 安装 Prisma 和相关依赖
3. 配置 ESLint 继承 `@typescript-eslint/recommended`
4. 确保 TypeScript `strict: true` 配置

### pnpm Workspace
1. 在项目根目录创建 `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'web'
     - 'server'
   ```

---

## 执行后检查

### 代码质量检查
- [ ] `tsc --noEmit` 在前端和后端分别执行无错误
- [ ] `pnpm lint` 无 ESLint 错误
- [ ] `pnpm format` 格式化后无变更

### 功能检查
- [ ] 前端开发服务器可正常启动 (`pnpm dev`)
- [ ] 后端开发服务器可正常启动 (`pnpm start:dev`)
- [ ] Vitest 测试框架可正常运行
- [ ] Jest 测试框架可正常运行

### 规范检查
- [ ] 所有文件使用正确的命名规范
- [ ] 目录结构符合 constitution.md 定义
- [ ] .gitignore 配置正确（排除 node_modules, dist 等）
