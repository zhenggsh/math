## Why

数学通系统需要区分学生、教师、管理员三种角色，实现安全的用户认证和权限控制。当前缺少用户管理功能，无法保护学习数据和管理知识库。本变更实现完整的用户认证体系和角色权限控制。

## What Changes

- 实现用户注册/登录 API（NestJS）
- 实现 JWT 认证和 Guard
- 实现角色权限控制（RolesGuard）
- 创建前端登录/注册页面
- 实现用户信息管理功能

## Capabilities

### New Capabilities
- `user-authentication`: 用户注册、登录、JWT 认证
- `role-based-access`: 基于角色的权限控制（学生/教师/管理员）

### Modified Capabilities
- 无

## Impact

- **API 变更**：新增 /auth/* 端点
- **数据库变更**：使用 setup-database-schema 的 User 模型
- **前端路由**：新增 /login, /register 页面
- **安全要求**：需要 JWT_SECRET 环境变量
