## Context

当前 `web/src/components/learning/AIFab.tsx` 是一个 mock 组件：点击右下角 FAB 后弹出固定提示模板，返回预置文本，没有真实 LLM 调用，也没有后端支持。本次变更将其升级为真正的 AI 学习助手 StudyAgent，使学生能在学习页面内直接获得基于当前知识点的对话辅导。

项目技术栈：React 19 + Ant Design 6 + Vite 前端；NestJS + Prisma + PostgreSQL 后端；已有 JWT 鉴权、 react-query、Markdown/KaTeX 渲染能力。

## Goals / Non-Goals

**Goals:**
- 实现从右下角 FAB 展开的右侧 AI 聊天 Drawer（StudyAgentPanel）。
- 后端通过 NestJS 代理调用 KimiCode2.6（OpenAI-compatible）API，不暴露 key 到前端。
- 多轮对话支持，每个知识点对应一个持久化的 Session。
- 每次 Agent 回复后自动返回 3 个可点击追问 chips。
- 通过 `Identity.md` / `Memory.md` / `SOULE.md` 配置 Agent 角色与行为。
- 保留 Skill Registry 接口，第一版只实现 `qa` skill。
- 通过类型检查、lint 和单元测试。

**Non-Goals:**
- 流式响应（SSE）。
- 全屏模式（第二版考虑）。
- 多模态输入（图片、手写公式）。
- 动态 Skill 配置或教师后台编辑 Agent 配置。
- 主动式学习规划（如自动推送复习计划）。
- 跨知识点聚合的“学习助手主页”。

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| API 接入方式 | 后端 NestJS 代理调用 Kimi API | 避免暴露 API key；便于统一限流、日志、降级 |
| 同步 vs 流式 | 同步 JSON，30s 超时 | 黑客松周期内实现更简单；SSE 放入 v2 |
| 会话粒度 | 一个知识点一个 Session | 与现有知识树导航自然对应，便于恢复上下文 |
| 追问生成 | LLM 在回答末尾输出 JSON 代码块，后端解析 | 一次调用同时获得回答和追问；失败有兜底规则 |
| 配置方式 | 三个 Markdown 文件启动时读取 | 概念清晰、无需 UI 配置、便于后续扩展 |
| 数据模型 | 新增 StudySession / StudyMessage 两张表 | 最小化 schema 改动，满足持久化需求 |
| 限流 | 内存计数，单实例 | v1 快速实现；多实例部署时改用 Redis |
| 降级 | API 失败返回 503 友好消息，不返回预置 mock 内容 | 避免真假 AI 混淆 |

## Risks / Trade-offs

- **[Risk] LLM 可能不按要求输出 JSON 追问块** → **Mitigation**: 多层解析（正则提取代码块、匹配独立 JSON 对象、规则兜底）；E2E 前用真实模型输出验证解析器成功率。
- **[Risk] 知识点 Markdown 内容超长，超出 token 预算** → **Mitigation**: 按段落/公式块边界截断摘要；优先保留标题和完整公式；prompt 总长度控制在 3000-4000 tokens。
- **[Risk] 并发创建 Session 导致唯一键冲突** → **Mitigation**: 使用 Prisma upsert，`(userId, knowledgePointId)` 唯一约束。
- **[Risk] Kimi API 在 demo 时不可用** → **Mitigation**: 后端实现 503 降级路径；无 API key 时仍可展示 UI 和接口。
- **[Trade-off] 右侧 Drawer 固定 380px 宽度** → 牺牲了沉浸式全屏体验，但学习页面布局不受影响，实现更快。

## Migration Plan

1. 在 `server/prisma/schema.prisma` 新增 `StudySession` 和 `StudyMessage` 模型。
2. 运行 `pnpm --filter server prisma migrate dev` 生成迁移并应用。
3. 在服务器环境变量中配置 `KIMI_BASE_URL`、`KIMI_API_KEY`、`KIMI_MODEL`。
4. 部署后端后，前端随 Vite 构建发布。
5. 回滚：移除新增模块和表即可；降级策略保证 API 失败时仍有友好提示。

## Open Questions

1. `KIMI_MODEL` 在真实部署环境中对应的具体模型名称需要确认。
2. 知识点 Markdown 内容定位策略（按 code 还是标题）需要在真实教材文件上验证。
3. 是否需要把追问解析器从正则解析升级为 JSON mode 或 function calling，取决于真实模型输出稳定性。
