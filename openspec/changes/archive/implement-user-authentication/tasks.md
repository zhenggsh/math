## 1. 后端依赖安装与配置

- [ ] 1.1 安装 NestJS Passport 和 JWT 依赖
  ```bash
  cd server && pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt
  pnpm add -D @types/passport-jwt @types/bcrypt
  ```
- [ ] 1.2 配置 JWT 环境变量（server/.env）
  ```
  JWT_SECRET=your-super-secret-jwt-key-min-32-characters
  JWT_EXPIRES_IN=24h
  ```
- [ ] 1.3 配置 JWT 模块（AuthModule）

## 2. 后端 Auth 模块实现

### 2.1 DTO 定义
- [ ] 2.1.1 创建 `server/src/modules/auth/dto/register.dto.ts`
  - 定义 RegisterDto 类
  - 添加 class-validator 装饰器（email, password, name, role）
  - 密码验证：最小 8 位，包含字母和数字
- [ ] 2.1.2 创建 `server/src/modules/auth/dto/login.dto.ts`
  - 定义 LoginDto 类
  - 添加 class-validator 装饰器（email, password）

### 2.2 Service 实现
- [ ] 2.2.1 创建 `server/src/modules/auth/auth.service.ts`
  - 实现 register 方法：验证、bcrypt 加密、创建用户
  - 实现 login 方法：验证凭证、生成 JWT
  - 实现 validateUser 方法：供 Passport 使用
- [ ] 2.2.2 编写 AuthService 单元测试

### 2.3 Controller 实现
- [ ] 2.3.1 创建 `server/src/modules/auth/auth.controller.ts`
  - 实现 POST /auth/register 端点
  - 实现 POST /auth/login 端点
  - 实现 GET /auth/profile 端点（获取当前用户信息）
- [ ] 2.3.2 添加 Swagger 文档装饰器
- [ ] 2.3.3 编写 AuthController 单元测试

### 2.4 Passport 策略与守卫
- [ ] 2.4.1 创建 `server/src/modules/auth/strategies/jwt.strategy.ts`
  - 实现 JWT Strategy，验证 Token 并提取 payload
- [ ] 2.4.2 创建 `server/src/modules/auth/guards/jwt-auth.guard.ts`
  - 继承 AuthGuard('jwt')
- [ ] 2.4.3 创建 `server/src/modules/auth/guards/roles.guard.ts`
  - 实现角色权限验证逻辑
- [ ] 2.4.4 创建 `server/src/modules/auth/decorators/roles.decorator.ts`
  - 实现 @Roles() 装饰器
- [ ] 2.4.5 创建 `server/src/modules/auth/decorators/current-user.decorator.ts`
  - 实现 @CurrentUser() 装饰器

### 2.5 模块组装
- [ ] 2.5.1 创建 `server/src/modules/auth/auth.module.ts`
  - 导入 PassportModule、JwtModule
  - 配置 providers 和 controllers
- [ ] 2.5.2 修改 `server/src/app.module.ts`
  - 导入 AuthModule

## 3. 前端 Auth 服务与类型

### 3.1 类型定义
- [ ] 3.1.1 创建 `web/src/types/auth.types.ts`
  - 定义 User 接口（id, email, name, role）
  - 定义 LoginRequest 接口
  - 定义 RegisterRequest 接口
  - 定义 AuthResponse 接口（token + user）
  - 定义 Role 枚举

### 3.2 API 服务
- [ ] 3.2.1 创建 `web/src/services/auth.service.ts`
  - 实现 login(email, password) 方法
  - 实现 register(data) 方法
  - 实现 getProfile() 方法
- [ ] 3.2.2 编写 auth.service 单元测试

### 3.3 Axios 拦截器
- [ ] 3.3.1 修改 `web/src/utils/axios.ts`
  - 添加请求拦截器：自动附加 Authorization Header
  - 添加响应拦截器：处理 401 错误（Token 过期）

## 4. 前端认证状态管理

### 4.1 AuthContext
- [ ] 4.1.1 创建 `web/src/contexts/AuthContext.tsx`
  - 定义 AuthContextType 接口
  - 实现 AuthProvider 组件
  - 提供 login, register, logout 方法
  - 提供 user, isAuthenticated, isLoading 状态
  - 实现 Token 持久化（localStorage）
  - 应用启动时恢复登录状态
- [ ] 4.1.2 创建 `web/src/hooks/useAuth.ts`
  - 封装 useContext(AuthContext)

## 5. 前端页面实现

### 5.1 登录页面
- [ ] 5.1.1 创建 `web/src/pages/LoginPage.tsx`
  - 使用 Ant Design Form 组件
  - 实现邮箱和密码输入
  - 表单验证（邮箱格式、密码非空）
  - 调用 login API
  - 登录成功后跳转首页
  - 错误提示（使用 Ant Design message）
  - 提供"去注册"链接
- [ ] 5.1.2 添加登录页面样式
- [ ] 5.1.3 编写 LoginPage 单元测试

### 5.2 注册页面
- [ ] 5.2.1 创建 `web/src/pages/RegisterPage.tsx`
  - 使用 Ant Design Form 组件
  - 实现邮箱、密码、确认密码、姓名、角色选择
  - 表单验证（邮箱格式、密码强度、密码匹配）
  - 调用 register API
  - 注册成功后自动登录或跳转登录页
  - 错误提示
  - 提供"去登录"链接
- [ ] 5.2.2 添加注册页面样式
- [ ] 5.2.3 编写 RegisterPage 单元测试

## 6. 路由守卫实现

### 6.1 ProtectedRoute
- [ ] 6.1.1 创建 `web/src/components/guards/ProtectedRoute.tsx`
  - 实现 ProtectedRoute 组件
  - 未登录时重定向到 /login
  - 支持 requiredRole 属性（可选角色限制）
  - 权限不足时显示 403 页面或重定向
- [ ] 6.1.2 编写 ProtectedRoute 单元测试

### 6.2 路由配置
- [ ] 6.2.1 修改 `web/src/App.tsx`
  - 配置 /login 和 /register 公开路由
  - 使用 ProtectedRoute 包装受保护路由
  - 配置角色路由（如 /admin 需 ADMIN 角色）

## 7. 集成测试与验证

### 7.1 后端集成测试
- [ ] 7.1.1 编写 Auth E2E 测试
  - 测试注册流程
  - 测试登录流程
  - 测试 Token 验证
  - 测试角色权限

### 7.2 前端集成测试
- [ ] 7.2.1 测试登录流程
- [ ] 7.2.2 测试注册流程
- [ ] 7.2.3 测试路由守卫
- [ ] 7.2.4 测试 Token 自动附加

## 8. 文档与配置

- [ ] 8.1 更新 API 文档（Swagger）
- [ ] 8.2 更新环境变量示例文件（.env.example）
- [ ] 8.3 编写认证系统使用说明

---

## 执行前检查

### 环境检查
- [ ] Node.js 版本 >= 18
- [ ] pnpm 版本 >= 8
- [ ] PostgreSQL 服务正在运行

### 前置变更检查
- [ ] `setup-database-schema` 已完成
- [ ] User 模型已定义（email, passwordHash, name, role）
- [ ] 数据库表已创建
- [ ] PrismaService 可用

### 项目状态检查
- [ ] `server/` 目录结构完整
- [ ] `web/` 目录结构完整
- [ ] 前后端均无 TypeScript 编译错误

---

## 执行过程注意事项

### 开发顺序建议
1. 先完成后端 Auth 模块（2.1 - 2.5）
2. 使用 Postman 测试后端 API
3. 完成前端类型和 API 服务（3.1 - 3.3）
4. 完成 AuthContext（4.1）
5. 完成登录/注册页面（5.1 - 5.2）
6. 完成路由守卫（6.1 - 6.2）
7. 端到端测试（7.1 - 7.2）

### 关键检查点
- **密码加密**：确保数据库中存储的是 bcrypt hash，不是明文
- **JWT Secret**：确保从环境变量读取，不是硬编码
- **Token 格式**：确保响应格式符合前端预期
- **错误处理**：确保前后端错误处理一致

### 常见问题
- **CORS 错误**：检查 server 的 CORS 配置是否允许前端域名
- **Token 无效**：检查 JWT Secret 前后端是否一致
- **类型错误**：确保 Prisma 类型生成后重启 TypeScript 服务

---

## 执行后检查

### 代码质量检查
- [ ] 后端 `tsc --noEmit` 无错误
- [ ] 前端 `tsc --noEmit` 无错误
- [ ] 后端测试覆盖率 ≥ 80%
- [ ] 前端测试覆盖率 ≥ 80%
- [ ] ESLint + Prettier 检查通过

### 功能检查
- [ ] 注册 API 可正常创建用户
- [ ] 登录 API 可正常返回 Token
- [ ] Token 包含正确信息（userId, email, role）
- [ ] 受保护 API 可正确验证 Token
- [ ] 角色守卫可按角色限制访问

### 前端功能检查
- [ ] 登录页面可正常使用
- [ ] 注册页面可正常使用
- [ ] 登录状态可正确持久化
- [ ] 路由守卫可阻止未登录访问
- [ ] Token 自动附加到请求头

### 安全检查
- [ ] 密码使用 bcrypt 加密存储
- [ ] JWT Secret 未泄露在代码中
- [ ] API 错误响应不包含敏感信息
- [ ] 登录错误不区分邮箱不存在/密码错误
