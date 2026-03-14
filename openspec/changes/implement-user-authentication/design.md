## Context

基于前置变更 `setup-database-schema` 已完成的 User 模型定义，本变更将实现完整的用户认证系统。系统需要支持三种角色：
- **STUDENT（学生）**：浏览知识点、记录学习、查看分析
- **TEACHER（教师）**：学生所有权限 + 知识库管理
- **ADMIN（管理员）**：系统全面管理

## Goals / Non-Goals

**Goals:**
- 实现基于 JWT 的无状态认证机制
- 实现用户注册 API（支持 STUDENT/TEACHER 角色）
- 实现用户登录 API（返回 JWT Token）
- 实现角色权限控制（RolesGuard）
- 实现前端登录/注册页面
- 实现前端路由守卫和认证状态管理

**Non-Goals:**
- 不包含 OAuth/SSO 第三方登录（后续变更考虑）
- 不包含密码找回/重置功能（后续变更考虑）
- 不包含 Refresh Token 机制（后续优化）
- 不包含登录限流/防暴力破解（后续安全加固）

## Decisions

### 1. 使用 JWT 而非 Session
**决策：** 采用 JWT（JSON Web Token）作为认证机制

**理由：**
- **无状态**：服务端无需存储会话信息，易于水平扩展
- **前后端分离友好**：天然支持 RESTful API 设计
- **跨域支持**：CORS 配置简单，适合前后端分离部署
- **性能**：无需查询数据库验证会话

**权衡：**
- Token 无法主动失效（可通过短期过期 + 刷新机制缓解）
- Token 体积较大（约 200-500 字节）

### 2. 使用 bcrypt 而非 argon2
**决策：** 使用 bcrypt 进行密码哈希

**理由：**
- **成熟稳定**：bcrypt 经过广泛验证，NestJS/Node.js 生态支持完善
- **性能适中**：计算成本可调节（salt rounds 10-12），平衡安全和性能
- **内存友好**：相比 argon2，bcrypt 内存占用更低

**未来考虑：** 如需要更高安全级别，可迁移到 argon2

### 3. Passport 策略选择
**决策：** 使用 `@nestjs/passport` + `passport-jwt` 策略

**理由：**
- **标准化**：Passport 是 Node.js 认证中间件的事实标准
- **NestJS 集成**：官方支持，装饰器语法简洁
- **可扩展性**：未来添加 OAuth 策略成本低

### 4. Token 传输方式
**决策：** 使用 Authorization Header (Bearer Token)

**理由：**
- **简单直接**：前端 Axios 拦截器自动附加
- **跨域友好**：无需处理 Cookie 的 SameSite 限制
- **调试方便**：开发者工具可直接查看请求头

**权衡：**
- 需要前端处理 Token 存储（localStorage 存在 XSS 风险）
- 短期方案：localStorage；长期方案：httpOnly Cookie + CSRF Token

### 5. 角色权限模型
**决策：** 基于 RBAC（Role-Based Access Control）

**设计：**
```
PUBLIC: 无需登录（登录页、注册页）
AUTHENTICATED: 需登录（个人学习记录）
STUDENT: 学生角色（浏览知识点、记录学习）
TEACHER: 教师角色（学生权限 + 知识库管理）
ADMIN: 管理员角色（全部权限）
```

**权限继承：** TEACHER 继承 STUDENT，ADMIN 继承所有权限

## Risks / Trade-offs

| 风险 | 缓解措施 |
|-----|---------|
| JWT Secret 泄露 | 使用环境变量存储，生产环境使用密钥管理服务 |
| Token 被窃取 | 设置合理过期时间（24小时），后续添加 Refresh Token |
| XSS 攻击获取 Token | 短期使用 localStorage，长期迁移到 httpOnly Cookie |
| 密码暴力破解 | 后续添加登录限流（rate limiting）和验证码 |
| 用户枚举攻击 | 登录错误返回统一信息："用户名或密码错误" |

## Migration Plan

1. **安装依赖**
   ```bash
   # 后端
   pnpm add @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt
   pnpm add -D @types/passport-jwt @types/bcrypt
   
   # 前端（如需新依赖）
   pnpm add axios
   ```

2. **后端实现**
   - 创建 AuthModule 及组件
   - 实现 JWT Strategy
   - 实现 Guards 和 Decorators
   - 配置全局 JWT 验证

3. **前端实现**
   - 创建登录/注册页面
   - 实现 AuthContext
   - 配置路由守卫
   - 添加请求拦截器

4. **集成测试**
   - 验证注册流程
   - 验证登录流程
   - 验证权限控制
   - 验证 Token 刷新（如有）

## Open Questions

- 是否需要添加 Refresh Token 机制？（建议首版实现后再考虑）
- 是否需要添加邮箱验证？（建议首版实现后再考虑）
- 是否需要登录日志记录？（审计需求，可后续添加）
