## Context

数学通系统有三种用户角色（学生、教师、管理员），需要实现安全的认证和授权。基于 project_target.md 第 38-44 行的用户管理需求。

依赖变更：setup-database-schema（需要 User 模型）

## Goals / Non-Goals

**Goals:**
- 实现注册/登录 API
- 实现 JWT 认证
- 实现角色权限控制
- 创建前端登录/注册页面

**Non-Goals:**
- 第三方登录（OAuth）
- 密码找回功能
- 用户资料修改（后续变更实现）

## Decisions

### Decision: 使用 @nestjs/passport + JWT
**Rationale**: NestJS 官方推荐方案，集成 Guard 机制。

### Decision: JWT payload 包含 userId 和 role
**Rationale**: 减少数据库查询，Guard 可直接获取角色信息。

### Decision: RolesGuard 在 Controller 层使用装饰器
**Rationale**: 声明式权限控制，代码清晰。

### Decision: 密码最小长度 8 位
**Rationale**: 平衡安全性和用户体验。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| JWT 密钥泄露 | 使用环境变量，生产环境定期轮换 |
| XSS 攻击窃取 token | HttpOnly cookie 存储（后续优化）|

## Migration Plan

无需迁移（新功能）。

## Open Questions

- Token 过期时间设置？（建议：1小时 access + 7天 refresh）
