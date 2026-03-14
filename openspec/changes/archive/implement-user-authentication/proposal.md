## Why

数学通项目需要实现用户认证系统，以支持学生、教师、管理员三种角色的访问控制。基于前置变更 `setup-database-schema` 已完成的 User 模型（包含 email, passwordHash, role 等字段），本变更将实现完整的认证流程，包括用户注册、登录、JWT Token 管理和角色权限控制。

## What Changes

### 后端变更
- 安装 NestJS Passport 和 JWT 相关依赖
- 实现 AuthModule 模块（Controller, Service, Strategy, Guard）
- 实现用户注册 API（POST /auth/register）
- 实现用户登录 API（POST /auth/login）
- 实现 JWT Token 生成与验证机制
- 实现基于角色的权限控制守卫（RolesGuard）
- 使用 bcrypt 进行密码加密存储

### 前端变更
- 创建 LoginPage 登录页面
- 创建 RegisterPage 注册页面
- 实现 AuthContext 全局认证状态管理
- 实现路由守卫（ProtectedRoute 组件）
- 实现 Axios 请求拦截器（自动附加 Token）
- 集成 Ant Design 表单组件

### 配置变更
- 配置 JWT Secret 和过期时间（server/.env）
- 配置前端 API 基础路径（web/.env）

## Capabilities

### New Capabilities
- `auth`: 用户认证能力，包含注册、登录、JWT 管理、角色权限控制

### Modified Capabilities
- 无

## Impact

### 后端文件
- 新增 `server/src/modules/auth/auth.module.ts`
- 新增 `server/src/modules/auth/auth.controller.ts`
- 新增 `server/src/modules/auth/auth.service.ts`
- 新增 `server/src/modules/auth/dto/register.dto.ts`
- 新增 `server/src/modules/auth/dto/login.dto.ts`
- 新增 `server/src/modules/auth/strategies/jwt.strategy.ts`
- 新增 `server/src/modules/auth/guards/jwt-auth.guard.ts`
- 新增 `server/src/modules/auth/guards/roles.guard.ts`
- 新增 `server/src/modules/auth/decorators/roles.decorator.ts`
- 修改 `server/src/app.module.ts`：导入 AuthModule
- 修改 `server/.env`：添加 JWT_SECRET, JWT_EXPIRES_IN

### 前端文件
- 新增 `web/src/pages/LoginPage.tsx`
- 新增 `web/src/pages/RegisterPage.tsx`
- 新增 `web/src/contexts/AuthContext.tsx`
- 新增 `web/src/components/guards/ProtectedRoute.tsx`
- 新增 `web/src/services/auth.service.ts`
- 新增 `web/src/hooks/useAuth.ts`
- 新增 `web/src/types/auth.types.ts`
- 修改 `web/src/App.tsx`：配置认证路由和 ProtectedRoute
- 修改 `web/src/utils/axios.ts`：添加请求拦截器
- 修改 `web/.env`：添加 VITE_API_BASE_URL

---

## 执行前检查

### 环境检查
- [ ] Node.js 版本 >= 18
- [ ] pnpm 版本 >= 8
- [ ] PostgreSQL 已运行且数据库可访问

### 前置变更检查
- [ ] `setup-database-schema` 变更已完成
- [ ] User 模型已定义且数据库表已创建
- [ ] PrismaService 可正常使用

### 项目状态检查
- [ ] `server/` 和 `web/` 目录存在且结构完整
- [ ] 前后端项目均可正常启动
- [ ] 无未解决的 TypeScript 编译错误

---

## 执行过程注意事项

### JWT 配置注意事项
1. **JWT Secret**：使用强随机字符串（建议 32 字符以上）
2. **Token 过期时间**：建议 access token 24 小时，后续可添加 refresh token 机制
3. **Secret 管理**：生产环境使用环境变量，禁止硬编码

### 密码加密注意事项
1. **加密算法**：使用 bcrypt，salt rounds 建议 10-12
2. **密码强度**：后端验证最小长度 8 位，包含字母和数字
3. **密码存储**：仅存储 hash，永不存储明文或简单 MD5

### API 设计注意事项
1. **错误处理**：统一返回格式，不暴露敏感信息（如用户不存在 vs 密码错误应返回相同错误）
2. **Token 传输**：使用 HTTP Only Cookie 或 Authorization Header (Bearer)
3. **CORS 配置**：允许前端域名跨域访问

### 前端实现注意事项
1. **Token 存储**：推荐使用 httpOnly cookie（更安全），或使用 localStorage（需配合 CSRF 防护）
2. **路由守卫**：未登录用户访问受保护路由应重定向到登录页
3. **权限展示**：根据用户角色动态显示/隐藏功能菜单

---

## 执行后检查

### 后端检查
- [ ] `tsc --noEmit` 无错误
- [ ] Auth 模块单元测试通过（覆盖率 ≥ 80%）
- [ ] 注册 API 可正常创建用户（密码已加密）
- [ ] 登录 API 可正常返回 JWT Token
- [ ] JWT Token 可正确解析用户信息
- [ ] RolesGuard 可按角色限制访问

### 前端检查
- [ ] `tsc --noEmit` 无错误
- [ ] 登录页面 UI 正常，表单验证有效
- [ ] 注册页面 UI 正常，表单验证有效
- [ ] 登录成功后 Token 正确存储
- [ ] 路由守卫可阻止未登录访问
- [ ] 登录状态可正确持久化（刷新页面后仍保持）

### 集成检查
- [ ] 前端可成功调用后端登录 API
- [ ] 前端可成功调用后端注册 API
- [ ] Token 过期后前端正确处理（跳转登录页）
- [ ] 角色权限控制前后端一致

### 安全扫描
- [ ] 密码使用 bcrypt 加密存储（数据库中无明文）
- [ ] JWT Secret 未泄露在代码中
- [ ] API 返回不包含敏感信息（如密码 hash）
