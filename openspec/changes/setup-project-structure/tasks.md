## 1. 项目根目录配置

- [ ] 1.1 创建 pnpm-workspace.yaml 配置 workspace
- [ ] 1.2 创建根目录 package.json 定义全局脚本
- [ ] 1.3 配置 .gitignore（node_modules, dist, .env 等）
- [ ] 1.4 配置 .editorconfig 统一编辑器设置

## 2. 前端项目初始化 (web/)

- [ ] 2.1 使用 Vite 创建 React + TypeScript 项目
- [ ] 2.2 配置 tsconfig.json（严格模式）
- [ ] 2.3 配置 ESLint（@typescript-eslint/recommended-type-checked）
- [ ] 2.4 配置 Prettier（.prettierrc）
- [ ] 2.5 创建目录结构：src/components/, src/pages/, src/hooks/, src/utils/, src/types/, src/services/, src/styles/
- [ ] 2.6 配置 package.json 脚本（dev, build, lint, type-check）

## 3. 后端项目初始化 (server/)

- [ ] 3.1 使用 @nestjs/cli 创建 NestJS 项目
- [ ] 3.2 配置 tsconfig.json（严格模式）
- [ ] 3.3 配置 ESLint（@typescript-eslint/recommended-type-checked）
- [ ] 3.4 创建目录结构：src/modules/, src/common/, src/config/, src/prisma/
- [ ] 3.5 配置 package.json 脚本（dev, build, lint, type-check）

## 4. 代码规范验证

- [ ] 4.1 运行 pnpm install 验证依赖安装
- [ ] 4.2 运行 pnpm type-check 验证 TypeScript 零错误
- [ ] 4.3 运行 pnpm lint 验证 ESLint 配置正确
- [ ] 4.4 验证前后端目录结构符合 project-rule 规范
