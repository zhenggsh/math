## 1. Database & Schema

- [x] 1.1 Add `StudySession` and `StudyMessage` models to `server/prisma/schema.prisma` with relations to `User` and `KnowledgePoint`; add a unique constraint on `StudySession.(userId, knowledgePointId)`; add an optional `feedback` enum field (`positive` | `negative` | null) to `StudyMessage`; add an index on `StudyMessage.sessionId` and a composite index on `(sessionId, createdAt)` for chronological queries
- [x] 1.2 Run `pnpm --filter server prisma migrate dev` to generate and apply the migration
- [x] 1.3 Run `pnpm --filter server prisma generate` to regenerate the Prisma client

## 2. Backend StudyAgent Module

- [x] 2.1 Create `server/src/modules/study-agent/study-agent.module.ts` and register it in `AppModule`
- [x] 2.2 Implement `StudyAgentConfigService` to read `Identity.md`, `Memory.md`, and `SOULE.md` from `server/study-agent-config/` at startup
- [x] 2.3 Create the three configuration Markdown files with default content
- [x] 2.4 Implement `KimiClientService` to call the Kimi API via OpenAI-compatible endpoint with timeout, retry, and error handling
- [x] 2.5 Add `KIMI_BASE_URL`, `KIMI_API_KEY`, and `KIMI_MODEL` to `.env.example` and configuration validation
- [x] 2.6 Implement `KnowledgeContentService` to read the Markdown file referenced by `KnowledgePoint.contentRef` (falling back to `Textbook.contentPath`), locate the knowledge point section by matching headings containing the `code` or `title`, extract text until the next heading of the same or higher level, and return a ~2000-character summary with paragraph/formula-boundary truncation
- [x] 2.7 Implement `LearningContextService` to fetch the most recent 3 `LearningRecord` entries for the current knowledge point and format them for prompt injection
- [x] 2.8 Implement `StudySkillRegistry` and default `qaSkill` with prompt assembly (including knowledge content and learning context), LLM call, and follow-up JSON parsing + fallback
- [x] 2.9 Implement `StudySessionService` with `upsert` for session creation and user-scoped queries
- [x] 2.10 Implement `StudyMessageService` to create user and agent messages, including follow-up array storage
- [x] 2.11 Implement `MessageFeedbackService` to update `feedback` on agent messages with user scoping and validation
- [x] 2.12 Implement regenerate flow to find the last user message and its agent response, re-call the LLM using the conversation context from before that agent response, and update the existing agent message content and followUps (reset feedback to null)
- [x] 2.13 Implement `StudyAgentController` with endpoints: `POST /sessions`, `POST /sessions/:id/messages`, `GET /sessions/:id`, `PUT /messages/:id/feedback`, `POST /messages/:userMessageId/regenerate`
- [x] 2.14 Add JWT auth guard to all study-agent endpoints and ensure `userId` scoping on every query
- [x] 2.15 Add in-memory rate limiting (20 req/min, 100 req/hour per user) with 429 response
- [x] 2.16 Implement 503 fallback for LLM timeout / failure

## 3. Frontend StudyAgent UI

- [x] 3.1 Create `StudyAgentPanel.tsx` and `StudyAgentPanel.module.css` as a right-side 380px Drawer
- [x] 3.2 Create `KnowledgeContextBar.tsx` to display the current knowledge point title
- [x] 3.3 Create `ChatMessageList.tsx` to render user and agent messages
- [x] 3.4 Create `FollowUpChips.tsx` to render clickable follow-up chips after each agent message
- [x] 3.5 Create `ChatInput.tsx` with input field, send button, and loading/disabled state
- [x] 3.6 Create `useStudyAgent.ts` hook to manage session creation, message loading, sending messages, and error states via react-query
- [x] 3.7 Create `studyAgentApi.ts` service to call the backend endpoints
- [x] 3.8 Refactor `AIFab.tsx` to act as the entry button that opens `StudyAgentPanel`
- [x] 3.9 Wire `StudyAgentPanel` into `LearningPage.tsx` and pass `knowledgePointId` and `knowledgePointTitle`
- [x] 3.10 Display welcome message for new sessions and 503/429 error messages in the chat panel
- [x] 3.11 Display starter question chips below the welcome message for new sessions; generate the 3 chips on the frontend from the current knowledge point title using a fixed set of templates
- [x] 3.12 Add a regenerate button to the latest agent message
- [x] 3.13 Add thumbs up/down feedback buttons to each agent message
- [x] 3.14 Add a source grounding indicator to each agent message showing the current knowledge point title

## 4. Integration & Testing

- [x] 4.1 Write unit tests for `StudyAgentConfigService` (file loading, cache behavior)
- [x] 4.2 Write unit tests for follow-up JSON parser (valid block, malformed block, missing block, wrong count, empty array)
- [x] 4.3 Write unit tests for `StudySessionService` and `StudyMessageService` (CRUD, user scoping, upsert concurrency)
- [x] 4.4 Write unit tests for `KnowledgeContentService` (section location, fallback, truncation)
- [x] 4.5 Write unit tests for `LearningContextService` (latest 3 records, empty history)
- [x] 4.6 Write unit tests for `MessageFeedbackService` (user scoping, update/remove feedback)
- [x] 4.7 Write unit tests for regenerate flow (re-call LLM, update existing message, user scoping, rate limit counting)
- [x] 4.8 Write unit tests for `StudyAgentController` (auth, 404, 503, 429, successful message flow, feedback, regenerate, prompt injection isolation)
- [x] 4.9 Write unit tests for `StudyAgentPanel` rendering, message sending, follow-up chip click, starter questions, regenerate, feedback, and grounding indicator
- [x] 4.10 Run `pnpm typecheck` and fix all TypeScript errors
- [x] 4.11 Run `pnpm lint` and fix all lint errors
- [x] 4.12 Run `pnpm test` and ensure all new and existing tests pass
- [ ] 4.13 Run E2E with a real API key to verify end-to-end question → answer → follow-up → feedback → regenerate → session persistence flow

## 5. Demo & Documentation

- [x] 5.1 Prepare a 2-minute demo script covering: open FAB → view starter questions → ask question → view follow-up chips → submit feedback → regenerate answer → switch knowledge point → recover history
- [x] 5.2 Add `KIMI_BASE_URL`, `KIMI_API_KEY`, and `KIMI_MODEL` setup notes to the change directory README or project docs
- [x] 5.3 Run final quality gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`

**Note:** Task 4.13 (E2E with a real API key) was not completed because no production Kimi API key was available in the local test/CI environment; all other implementation and quality-gate tasks are complete.
