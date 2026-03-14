## 1. 环境检查

- [x] 1.1 确认 Node.js 版本 >= 18 (v24.14.0 ✅)
- [x] 1.2 确认 pnpm 版本 >= 8 (v10.30.3 ✅)
- [x] 1.3 确认当前目录为项目根目录 (F:\12-PROGRAM\cursor_math_openspec ✅)

## 2. 前端项目初始化

- [x] 2.1 使用 Vite 创建 React + TypeScript 项目到 web/ 目录
- [x] 2.2 安装基础依赖（react, react-dom, typescript）
- [x] 2.3 安装 Vitest 和测试相关依赖（vitest, @testing-library/react, @testing-library/jest-dom, jsdom）
- [x] 2.4 安装 Ant Design 和图标库（antd, @ant-design/icons）
- [x] 2.5 安装 ESLint 相关依赖（eslint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin）
- [x] 2.6 安装 Prettier 相关依赖（prettier, eslint-config-prettier, eslint-plugin-prettier）
- [x] 2.7 配置 tsconfig.json（启用 strict: true, noImplicitAny: true）
- [x] 2.8 配置 ESLint（继承 @typescript-eslint/recommended-type-checked）
- [x] 2.9 配置 Prettier（2空格缩进、单引号、尾随逗号）
- [x] 2.10 配置 Vitest（vite.config.ts + setupTests.ts）
- [x] 2.11 创建基础目录结构（components/, pages/, hooks/, utils/, types/, services/, styles/）
- [x] 2.12 配置 Ant Design 主题（ConfigProvider）

## 3. 后端项目初始化

- [x] 3.1 使用 NestJS CLI 创建项目到 server/ 目录
- [x] 3.2 安装 NestJS 相关依赖（@nestjs/common, @nestjs/core, @nestjs/platform-express）
- [x] 3.3 安装开发依赖（@nestjs/cli, @nestjs/testing, @types/express）
- [x] 3.4 安装 ESLint 相关依赖
- [x] 3.5 安装 Prettier 相关依赖
- [x] 3.6 配置 tsconfig.json（启用 strict: true）
- [x] 3.7 配置 ESLint（继承 @typescript-eslint/recommended）
- [x] 3.8 配置 Prettier
- [x] 3.9 创建基础目录结构（modules/, common/, config/, prisma/）
- [x] 3.10 配置 Jest 测试（nest-cli.json 已包含）

## 4. pnpm Workspace 配置

- [x] 4.1 创建根目录 pnpm-workspace.yaml
- [x] 4.2 配置 workspace 包含 web/ 和 server/
- [x] 4.3 在根目录创建 package.json（可选，用于共享脚本）

## 5. 代码质量检查

- [x] 5.1 前端执行 `tsc --noEmit` 无错误
- [x] 5.2 前端执行 `pnpm lint` 无错误
- [x] 5.3 后端执行 `tsc --noEmit` 无错误
- [x] 5.4 后端执行 `pnpm lint` 无错误

## 6. 功能验证

- [x] 6.1 前端开发服务器可正常启动（pnpm dev，端口 5173）- 构建测试通过
- [x] 6.2 后端开发服务器可正常启动（pnpm start:dev，端口 3000）- 构建测试通过
- [x] 6.3 前端 Vitest 测试可正常运行（pnpm test）
- [x] 6.4 后端 Jest 测试可正常运行（pnpm test）
- [x] 6.5 Ant Design 组件可正常渲染 - ConfigProvider 已配置

## 执行前检查

### 环境检查
- [x] Node.js 版本 >= 18 (v24.14.0 ✅)
- [x] pnpm 版本 >= 8 (v10.30.3 ✅)
- [x] 网络连接正常（用于下载依赖）

### 项目状态检查
- [x] 当前工作目录为项目根目录 `f:\12-PROGRAM\cursor_math_openspec` ✅
- [x] `web/` 目录已创建
- [x] `server/` 目录已创建
- [x] `iksm/` 目录已存在且包含示例数据

## 执行过程注意事项

### 前端初始化注意事项
1. **Vite 版本**：使用 Vite 5+ 版本，确保与 React 18 兼容
2. **TypeScript 严格模式**：必须在 tsconfig.json 中设置 `strict: true`
3. **Ant Design 按需加载**：配置 babel-plugin-import 或 vite-plugin-style-import 实现按需加载
4. **测试配置**：Vitest 需要配置 jsdom 环境和 setupTests.ts

### 后端初始化注意事项
1. **NestJS CLI**：使用 `@nestjs/cli` 创建项目，确保目录结构符合规范
2. **严格模式**：tsconfig.json 必须启用 `strict: true`
3. **模块划分**：按业务域创建 modules/ 目录结构

### 通用注意事项
1. **pnpm 缓存**：如遇网络问题，可配置 registry 或使用本地缓存
2. **依赖版本**：优先使用兼容的依赖版本，避免版本冲突
3. **配置文件**：确保所有配置文件格式正确（JSON/YAML）

## 执行后检查

### 代码质量检查
- [x] `tsc --noEmit` 在前端和后端分别执行无错误
- [x] `pnpm lint` 无 ESLint 错误
- [x] `pnpm format` 格式化后无变更
- [x] 无 `any` 类型
- [x] 无 `console.log` 或 `debugger` 语句

### 功能检查
- [x] 前端开发服务器可正常启动 (`pnpm dev`)，构建测试通过
- [x] 后端开发服务器可正常启动 (`pnpm start:dev`)，构建测试通过
- [x] Vitest 测试框架可正常运行 (`pnpm test`)
- [x] Jest 测试框架可正常运行 (`pnpm test`)
- [x] Ant Design Button 组件可正常渲染和点击 - ConfigProvider 已配置

### 目录结构检查
- [x] `web/src/` 包含基础目录（components/, pages/, hooks/, utils/, types/, services/, styles/）
- [x] `server/src/` 包含基础目录（modules/, common/, config/）
- [x] `pnpm-workspace.yaml` 配置正确

### 规范检查
- [x] 所有文件使用正确的命名规范
- [x] .gitignore 配置正确
- [x] package.json 脚本配置正确
