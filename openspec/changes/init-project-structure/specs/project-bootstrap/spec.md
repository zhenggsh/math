## ADDED Requirements

### Requirement: 前端项目脚手架
系统 SHALL 提供标准化的 React + TypeScript + Vite 前端项目结构。

#### Scenario: 开发服务器启动
- **WHEN** 开发者在前端目录执行 `pnpm dev`
- **THEN** 系统 SHALL 启动 Vite 开发服务器，默认端口 5173
- **AND** 页面 SHALL 显示基础 React 应用

#### Scenario: 前端构建
- **WHEN** 开发者执行 `pnpm build`
- **THEN** 系统 SHALL 生成生产环境构建产物到 `dist/` 目录
- **AND** 构建过程 SHALL 无 TypeScript 错误

### Requirement: 后端项目脚手架
系统 SHALL 提供标准化的 NestJS + TypeScript 后端项目结构。

#### Scenario: 后端开发服务器启动
- **WHEN** 开发者在后端目录执行 `pnpm start:dev`
- **THEN** 系统 SHALL 启动 NestJS 开发服务器，默认端口 3000
- **AND** 服务器 SHALL 响应健康检查请求

#### Scenario: 后端生产构建
- **WHEN** 开发者执行 `pnpm build`
- **THEN** 系统 SHALL 编译 TypeScript 到 `dist/` 目录
- **AND** 编译过程 SHALL 无错误

### Requirement: TypeScript 严格模式
系统 SHALL 配置 TypeScript 严格模式，确保代码类型安全。

#### Scenario: 类型检查
- **WHEN** 开发者执行 `tsc --noEmit`
- **THEN** 系统 SHALL 报告所有类型错误
- **AND** 配置 SHALL 包含 `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`

### Requirement: 代码规范工具链
系统 SHALL 配置 ESLint + Prettier 统一的代码规范。

#### Scenario: ESLint 检查
- **WHEN** 开发者执行 `pnpm lint`
- **THEN** 系统 SHALL 检查代码风格和质量
- **AND** 前端 SHALL 继承 `@typescript-eslint/recommended-type-checked`
- **AND** 后端 SHALL 继承 `@typescript-eslint/recommended`

#### Scenario: 代码格式化
- **WHEN** 开发者执行 `pnpm format`
- **THEN** 系统 SHALL 使用 Prettier 格式化代码
- **AND** 配置 SHALL 为 2空格缩进、单引号、尾随逗号

### Requirement: 测试框架
系统 SHALL 配置单元测试框架。

#### Scenario: 前端测试运行
- **WHEN** 开发者在前端执行 `pnpm test`
- **THEN** 系统 SHALL 使用 Vitest 运行测试
- **AND** 配置 SHALL 支持 React Testing Library

#### Scenario: 后端测试运行
- **WHEN** 开发者在后端执行 `pnpm test`
- **THEN** 系统 SHALL 使用 Jest 运行测试
- **AND** 配置 SHALL 支持 NestJS 测试工具

### Requirement: pnpm Workspace
系统 SHALL 配置 pnpm workspace 管理前后端依赖。

#### Scenario: 依赖安装
- **WHEN** 开发者在根目录执行 `pnpm install`
- **THEN** 系统 SHALL 安装 web/ 和 server/ 的所有依赖
- **AND** 系统 SHALL 使用共享的 lockfile

### Requirement: UI 组件库
系统 SHALL 配置 Ant Design 作为 UI 组件库。

#### Scenario: 组件使用
- **WHEN** 开发者导入 Ant Design 组件
- **THEN** 组件 SHALL 正确渲染
- **AND** 主题配置 SHALL 支持学术蓝主色 #1890FF
