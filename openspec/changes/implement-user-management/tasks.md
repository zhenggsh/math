## 1. 后端认证模块

- [ ] 1.1 安装依赖：@nestjs/passport, @nestjs/jwt, passport, passport-jwt, bcrypt
- [ ] 1.2 创建 AuthModule, AuthService, AuthController
- [ ] 1.3 实现 register 方法（密码哈希，验证邮箱唯一性）
- [ ] 1.4 实现 login 方法（验证密码，生成 JWT）
- [ ] 1.5 创建 JwtStrategy（验证 token，附加用户信息）
- [ ] 1.6 创建 JwtAuthGuard（保护路由）

## 2. 后端权限控制

- [ ] 2.1 创建 RolesGuard（检查用户角色）
- [ ] 2.2 创建 @Roles() 装饰器
- [ ] 2.3 配置全局 JWT 认证（除 /auth/* 外）

## 3. 前端认证页面

- [ ] 3.1 创建 LoginPage 组件
- [ ] 3.2 创建 RegisterPage 组件（区分学生和教师注册）
- [ ] 3.3 实现 authService（登录、注册 API 调用）
- [ ] 3.4 实现 authStore（存储 token 和用户信息）
- [ ] 3.5 创建 AuthGuard 组件（保护前端路由）

## 4. 集成测试

- [ ] 4.1 测试用户注册流程
- [ ] 4.2 测试用户登录流程
- [ ] 4.3 测试角色权限控制
- [ ] 4.4 验证 TypeScript 严格模式通过
