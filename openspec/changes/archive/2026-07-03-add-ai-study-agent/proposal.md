## Why

当前学习页面的 AI 学习助手（AIFab）只是一个 mock：点击后弹出 3 个固定提示模板并返回预置文本，无法根据当前知识点做个性化回答，也没有真正的多轮对话能力。学生在学习过程中遇到疑问时，不得不离开系统使用外部 AI 工具，学习流被打断。

将 AIFab 升级为真正的 StudyAgent，可以让学生在知识点学习页面内直接获得上下文感知的 AI 辅导，并通过自动追问持续引导思考，显著提升学习体验和 demo 完整度。

## What Changes

- 新增后端 `study-agent` 模块，代理调用 KimiCode2.6 API 实现真实对话。
- 新增 `StudySession` / `StudyMessage` 数据表，持久化每个知识点下的多轮对话。
- 新增 `server/study-agent-config/` 配置目录，包含 `Identity.md`、`Memory.md`、`SOULE.md`，用于定义 Agent 角色、约束和价值观。
- 扩展前端 `AIFab` 组件为右侧可展开的 `StudyAgentPanel` 聊天 Drawer。
- 每次 Agent 回复后自动展示 3 个可点击追问 chips，点击即进入下一轮对话。
- 新会话打开时展示 3 个与当前知识点相关的引导问题 chips，降低学生首次使用门槛。
- 支持重新生成最新 Agent 回答，支持对 Agent 消息进行点赞/点踩反馈。
- 展示答案来源 grounding 指示器，让学生知道回答基于当前知识点教材内容。
- 新增 `study-agent` REST API（POST /sessions、POST /sessions/:id/messages、GET /sessions/:id、PUT /messages/:id/feedback、POST /messages/:id/regenerate），受 JWT 保护。
- 新增限流、降级、鉴权、单元测试和类型检查支持。

## Capabilities

### New Capabilities

- `study-agent`: 后端 AI Agent 服务，封装 Kimi API 调用，组装系统 prompt、知识点上下文、学习记录和对话历史，解析追问 JSON。
- `study-session`: 会话管理，每个知识点一个 Session，支持创建、查询、消息持久化。
- `study-agent-config`: Agent 配置加载，读取 Identity/Memory/SOULE 三个 Markdown 文件并拼接到 system prompt。
- `ai-study-panel`: 前端 AI 学习助手聊天面板，包含消息列表、追问 chips、引导问题 chips、输入框、知识点 context bar、重新生成、点赞/点踩反馈、答案来源 grounding 指示器。

### Modified Capabilities

- `ai-fab`: 从仅返回 mock 响应的 FAB 面板，扩展为可展开真实对话的 StudyAgent 入口；原 spec 中“无真实 LLM 调用、无后端改动”的约束被移除。

## Impact

- **后端**：新增 `server/src/modules/study-agent/` 模块；`server/prisma/schema.prisma` 新增 `StudySession` 和 `StudyMessage` 表；新增环境变量 `KIMI_BASE_URL`、`KIMI_API_KEY`、`KIMI_MODEL`。
- **前端**：`web/src/components/learning/AIFab.tsx` 扩展为入口组件；新增 `StudyAgentPanel`、`ChatMessageList`、`FollowUpChips`、`ChatInput`、`KnowledgeContextBar`；新增 `useStudyAgent` hook 和 `studyAgentApi` 服务。
- **数据库**：需要运行 Prisma migration 新增两张表。
- **依赖**：后端可能需要 `openai` SDK（若选择 SDK 方式）。
- **测试**：新增后端 service/controller 测试、前端组件测试、追问解析器鲁棒性测试。
