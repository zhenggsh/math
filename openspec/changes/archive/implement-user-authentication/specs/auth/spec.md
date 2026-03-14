## ADDED Requirements

### Requirement: 用户注册 API
系统 SHALL 提供用户注册接口，支持创建学生或教师账号。

#### Scenario: 学生注册
- **GIVEN** 未登录用户
- **WHEN** 发送 POST 请求到 `/auth/register`
- **AND** 请求体包含 email, password, name, role="STUDENT"
- **THEN** 系统 SHALL 创建新用户
- **AND** 密码 SHALL 使用 bcrypt 加密存储
- **AND** 返回 201 Created 和用户基本信息（不包含 passwordHash）

#### Scenario: 教师注册
- **GIVEN** 未登录用户
- **WHEN** 发送 POST 请求到 `/auth/register`
- **AND** 请求体包含 email, password, name, role="TEACHER"
- **THEN** 系统 SHALL 创建新用户
- **AND** role SHALL 设置为 TEACHER
- **AND** 返回 201 Created 和用户基本信息

#### Scenario: 邮箱已存在
- **GIVEN** 邮箱已被注册
- **WHEN** 发送注册请求
- **THEN** 返回 409 Conflict
- **AND** 错误消息为 "该邮箱已被注册"

#### Scenario: 密码强度不足
- **GIVEN** 密码长度小于 8 位或不包含字母数字
- **WHEN** 发送注册请求
- **THEN** 返回 400 Bad Request
- **AND** 错误消息提示密码要求

---

### Requirement: 用户登录 API
系统 SHALL 提供用户登录接口，验证凭证后返回 JWT Token。

#### Scenario: 成功登录
- **GIVEN** 已注册用户
- **WHEN** 发送 POST 请求到 `/auth/login`
- **AND** 请求体包含正确的 email 和 password
- **THEN** 返回 200 OK
- **AND** 响应包含 access_token（JWT）
- **AND** 响应包含用户基本信息（id, email, name, role）

#### Scenario: 邮箱不存在
- **GIVEN** 邮箱未注册
- **WHEN** 发送登录请求
- **THEN** 返回 401 Unauthorized
- **AND** 错误消息为 "用户名或密码错误"

#### Scenario: 密码错误
- **GIVEN** 邮箱存在但密码错误
- **WHEN** 发送登录请求
- **THEN** 返回 401 Unauthorized
- **AND** 错误消息为 "用户名或密码错误"
- **AND** 不泄露邮箱是否存在的差异

---

### Requirement: JWT Token 生成与验证
系统 SHALL 使用 JWT 实现无状态认证。

#### Scenario: Token 生成
- **GIVEN** 用户成功登录
- **WHEN** 系统生成 JWT
- **THEN** Payload 包含 userId, email, role
- **AND** 使用 HS256 算法签名
- **AND** 设置过期时间（默认 24 小时）

#### Scenario: Token 验证
- **GIVEN** 受保护 API 请求
- **WHEN** 请求包含有效 JWT（Authorization: Bearer <token>）
- **THEN** 系统 SHALL 验证签名
- **AND** 验证 Token 未过期
- **AND** 将用户信息注入请求上下文

#### Scenario: Token 无效
- **GIVEN** 请求包含无效 JWT
- **WHEN** 访问受保护 API
- **THEN** 返回 401 Unauthorized
- **AND** 错误消息为 "无效的认证凭证"

#### Scenario: Token 过期
- **GIVEN** 请求包含过期 JWT
- **WHEN** 访问受保护 API
- **THEN** 返回 401 Unauthorized
- **AND** 错误消息为 "认证已过期，请重新登录"

---

### Requirement: 角色权限控制
系统 SHALL 支持基于角色的访问控制（RBAC）。

#### Scenario: 公开访问
- **GIVEN** 公开端点（如登录、注册）
- **WHEN** 任何用户访问
- **THEN** 无需认证即可访问

#### Scenario: 需登录访问
- **GIVEN** 需认证端点
- **WHEN** 携带有效 JWT 访问
- **THEN** 允许访问
- **AND** 可在控制器中获取当前用户

#### Scenario: 学生角色访问
- **GIVEN** 学生专属端点
- **WHEN** role="STUDENT" 的用户访问
- **THEN** 允许访问
- **WHEN** role="TEACHER" 的用户访问
- **THEN** 允许访问（权限继承）

#### Scenario: 教师角色访问
- **GIVEN** 教师专属端点（如知识库管理）
- **WHEN** role="TEACHER" 的用户访问
- **THEN** 允许访问
- **WHEN** role="STUDENT" 的用户访问
- **THEN** 返回 403 Forbidden
- **AND** 错误消息为 "权限不足"

#### Scenario: 管理员角色访问
- **GIVEN** 管理员专属端点
- **WHEN** role="ADMIN" 的用户访问
- **THEN** 允许访问
- **WHEN** role="TEACHER" 或 "STUDENT" 的用户访问
- **THEN** 返回 403 Forbidden

---

### Requirement: 密码加密存储
系统 SHALL 安全地存储用户密码。

#### Scenario: 密码加密
- **GIVEN** 用户注册时提供明文密码
- **WHEN** 存储到数据库
- **THEN** 使用 bcrypt 算法加密
- **AND** salt rounds = 10
- **AND** 存储加密后的 hash，不存储明文

#### Scenario: 密码验证
- **GIVEN** 用户登录时提供明文密码
- **WHEN** 验证密码
- **THEN** 使用 bcrypt.compare 比较
- **AND** 不暴露加密细节或时序信息

---

### Requirement: 路由守卫
系统 SHALL 提供路由守卫保护受保护资源。

#### Scenario: JWT 守卫
- **GIVEN** 控制器方法标记 @UseGuards(JwtAuthGuard)
- **WHEN** 无 Token 或无效 Token 请求
- **THEN** 阻止访问并返回 401

#### Scenario: 角色守卫
- **GIVEN** 控制器方法标记 @Roles('TEACHER') 和 @UseGuards(RolesGuard)
- **WHEN** 非 TEACHER 角色用户访问
- **THEN** 阻止访问并返回 403

#### Scenario: 组合守卫
- **GIVEN** 同时使用 JwtAuthGuard 和 RolesGuard
- **THEN** 先验证 JWT，再验证角色权限
- **AND** 任一失败则阻止访问

---

## MODIFIED Requirements

暂无

---

## DEPRECATED Requirements

暂无
