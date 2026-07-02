# Add AI Study Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing mock `AIFab` into a real context-aware AI StudyAgent with backend LLM integration, multi-turn session persistence, and a right-side chat drawer.

**Architecture:** Add a new NestJS `study-agent` module that proxies Kimi API calls, assembles prompts with knowledge content and learning history, and persists sessions/messages in PostgreSQL. Refactor the frontend `AIFab` to open a new `StudyAgentPanel` chat drawer that communicates with the new backend endpoints via a dedicated `studyAgentApi` and `useStudyAgent` hook.

**Tech Stack:** React 19 + Ant Design 6 + Vite + Vitest (frontend); NestJS 11 + Prisma 5 + PostgreSQL + Jest (backend); `openai` SDK for Kimi API calls.

---

## File Structure

### Backend (server/src/modules/study-agent/)

| File | Responsibility |
|------|---------------|
| `study-agent.module.ts` | Module declaration and provider registration |
| `study-agent.controller.ts` | REST endpoints guarded by JWT |
| `dto/*.ts` | Request/response DTOs with validation decorators |
| `entities/study-session.entity.ts` | Prisma-derived type/interface helpers |
| `services/study-agent-config.service.ts` | Load `Identity.md`, `Memory.md`, `SOULE.md` at startup |
| `services/kimi-client.service.ts` | Call Kimi API via OpenAI-compatible endpoint |
| `services/knowledge-content.service.ts` | Read Markdown file and extract ~2000-char section summary |
| `services/learning-context.service.ts` | Fetch recent 3 `LearningRecord` entries for a knowledge point |
| `services/study-skill.registry.ts` | Skill registry (v1 only registers `qaSkill`) |
| `services/skills/qa.skill.ts` | Default QA skill: prompt assembly + LLM call + follow-up parsing |
| `services/study-session.service.ts` | Upsert/find sessions with user scoping |
| `services/study-message.service.ts` | Create user/agent messages and query chronological history |
| `services/message-feedback.service.ts` | Update/remove feedback on agent messages |
| `services/study-rate-limit.service.ts` | In-memory 20 req/min + 100 req/hour per user |
| `utils/follow-up-parser.ts` | Extract JSON follow-up block from LLM response |

### Frontend (web/src/)

| File | Responsibility |
|------|---------------|
| `services/studyAgentApi.ts` | Authenticated API calls to study-agent endpoints |
| `types/study-agent.types.ts` | DTO/entity TypeScript interfaces |
| `hooks/useStudyAgent.ts` | React Query hooks for session, messages, send, regenerate, feedback |
| `components/learning/StudyAgentPanel.tsx` | Right-side Drawer chat panel |
| `components/learning/StudyAgentPanel.module.css` | Panel styles |
| `components/learning/KnowledgeContextBar.tsx` | Show current knowledge point title |
| `components/learning/ChatMessageList.tsx` | Render user and agent messages |
| `components/learning/FollowUpChips.tsx` | Render clickable follow-up chips |
| `components/learning/ChatInput.tsx` | Input + send button with loading/disabled |
| `components/learning/AIFab.tsx` | Refactor to entry button that opens panel |
| `components/learning/__tests__/StudyAgentPanel.test.tsx` | Panel integration tests |
| `components/learning/__tests__/ChatMessageList.test.tsx` | Message list tests |
| `components/learning/__tests__/FollowUpChips.test.tsx` | Chip interaction tests |
| `components/learning/__tests__/ChatInput.test.tsx` | Input tests |
| `components/learning/__tests__/useStudyAgent.test.tsx` | Hook tests (MSW or mock service) |
| `pages/LearningPage/LearningPage.tsx` | Pass `knowledgePointId` and `knowledgePointTitle` to `AIFab` (already done, verify) |

---

## Task 1: Database Schema

### Task 1.1: Add Prisma models and enums

**Files:**
- Modify: `server/prisma/schema.prisma`

**Step 1: Add enums and update relations**

Append the following enums after `ImportanceLevel`:

```prisma
enum StudyMessageRole {
  user
  agent
}

enum StudyMessageFeedback {
  positive
  negative
}
```

Add `StudySession` and `StudyMessage` models after `LearningRecord`:

```prisma
model StudySession {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  knowledgePointId  String   @map("knowledge_point_id")
  title             String   @map("title")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  knowledgePoint    KnowledgePoint  @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)
  messages          StudyMessage[]

  @@unique([userId, knowledgePointId], name: "idx_study_session_user_knowledge_point")
  @@map("study_sessions")
}

model StudyMessage {
  id          String   @id @default(uuid())
  sessionId   String   @map("session_id")
  role        StudyMessageRole @map("role")
  content     String   @map("content")
  followUps   String[] @map("follow_ups") @default([])
  feedback    StudyMessageFeedback? @map("feedback")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  session     StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId], name: "idx_study_message_session")
  @@index([sessionId, createdAt], name: "idx_study_message_session_created_at")
  @@map("study_messages")
}
```

Update `User` and `KnowledgePoint` relations:

```prisma
model User {
  ...
  studySessions     StudySession[]
  ...
}

model KnowledgePoint {
  ...
  studySessions     StudySession[]
  ...
}
```

- [ ] **Step 2: Run Prisma migration**

Run:

```bash
pnpm --filter server prisma migrate dev --name add_study_agent_tables
```

Expected: migration file created and applied to local database.

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
pnpm --filter server prisma generate
```

Expected: `@prisma/client` types include `StudySession`, `StudyMessage`, `StudyMessageRole`, `StudyMessageFeedback`.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations
pnpm --filter server prisma generate
git add server/node_modules/.prisma server/package.json pnpm-lock.yaml
# only if openai was added later; see Task 2.4
git commit -m "feat(db): add StudySession and StudyMessage tables"
```

---

## Task 2: Backend Module Shell

### Task 2.1: Create study-agent module and register in AppModule

**Files:**
- Create: `server/src/modules/study-agent/study-agent.module.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Create module file**

Create `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';

@Module({
  controllers: [StudyAgentController],
  providers: [],
})
export class StudyAgentModule {}
```

- [ ] **Step 2: Register module in AppModule**

Modify `server/src/app.module.ts` to import `StudyAgentModule`:

```typescript
import { StudyAgentModule } from './modules/study-agent/study-agent.module';

@Module({
  imports: [
    ...
    AnalyticsModule,
    StudyAgentModule,
  ],
  ...
})
export class AppModule {}
```

- [ ] **Step 3: Verify backend starts**

Run:

```bash
pnpm --filter server start:dev
```

Expected: NestJS starts without errors. Stop with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/study-agent/study-agent.module.ts server/src/app.module.ts
git commit -m "feat(study-agent): register study-agent module"
```

---

### Task 2.2: Create Agent configuration files

**Files:**
- Create: `server/study-agent-config/Identity.md`
- Create: `server/study-agent-config/Memory.md`
- Create: `server/study-agent-config/SOULE.md`

- [ ] **Step 1: Create default config files**

Create `server/study-agent-config/Identity.md`:

```markdown
# Identity

You are a helpful high-school math tutor named 知识小助手.
- Answer in Chinese.
- Explain concepts step by step.
- Use LaTeX for formulas when helpful.
- Base your answers on the provided knowledge point material.
```

Create `server/study-agent-config/Memory.md`:

```markdown
# Memory

- You are tutoring within a single knowledge point.
- Maintain the topic focus; gently redirect if the student drifts far from the current material.
- Remember the student's recent learning records to calibrate explanation depth.
```

Create `server/study-agent-config/SOULE.md`:

```markdown
# SOULE

- Safety: never produce harmful content.
- Objectivity: prioritize textbook-grounded explanations.
- Usefulness: keep answers concise and actionable.
- Learning: end each answer with 3 follow-up questions that encourage deeper thinking.
- Empathy: be encouraging and clear.
```

- [ ] **Step 2: Commit**

```bash
git add server/study-agent-config
git commit -m "feat(study-agent): add default agent config files"
```

---

### Task 2.3: Implement StudyAgentConfigService

**Files:**
- Create: `server/src/modules/study-agent/services/study-agent-config.service.ts`
- Create: `server/src/modules/study-agent/services/study-agent-config.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/study-agent-config.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { StudyAgentConfigService } from './study-agent-config.service';

describe('StudyAgentConfigService', () => {
  let service: StudyAgentConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyAgentConfigService],
    }).compile();

    service = module.get<StudyAgentConfigService>(StudyAgentConfigService);
  });

  it('loads config files at startup', () => {
    expect(service.getIdentity()).toContain('Identity');
    expect(service.getMemory()).toContain('Memory');
    expect(service.getSoule()).toContain('SOULE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- study-agent-config.service.spec.ts
```

Expected: `StudyAgentConfigService is not defined` or similar error.

- [ ] **Step 3: Implement minimal service**

Create `server/src/modules/study-agent/services/study-agent-config.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StudyAgentConfigService {
  private readonly logger = new Logger(StudyAgentConfigService.name);
  private readonly identity: string;
  private readonly memory: string;
  private readonly soule: string;

  constructor() {
    const configDir = path.join(process.cwd(), 'study-agent-config');
    this.identity = this.loadFile(configDir, 'Identity.md');
    this.memory = this.loadFile(configDir, 'Memory.md');
    this.soule = this.loadFile(configDir, 'SOULE.md');
  }

  private loadFile(configDir: string, fileName: string): string {
    const filePath = path.join(configDir, fileName);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.logger.log(`Loaded study agent config: ${fileName}`);
      return content;
    } catch (error) {
      this.logger.warn(`Failed to load ${fileName}: ${(error as Error).message}`);
      return '';
    }
  }

  getIdentity(): string {
    return this.identity;
  }

  getMemory(): string {
    return this.memory;
  }

  getSoule(): string {
    return this.soule;
  }
}
```

- [ ] **Step 4: Register service in module**

Modify `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';

@Module({
  controllers: [StudyAgentController],
  providers: [StudyAgentConfigService],
})
export class StudyAgentModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- study-agent-config.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/study-agent-config.service.ts server/src/modules/study-agent/services/study-agent-config.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add config loading service"
```

---

### Task 2.4: Add Kimi environment variables and install openai package

**Files:**
- Create: `server/.env.example`
- Modify: `server/package.json` (via pnpm install)
- Modify: `server/src/modules/study-agent/study-agent.module.ts` (config validation later)

- [ ] **Step 1: Create .env.example**

Create `server/.env.example`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/math_learning?schema=public"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="24h"
KIMI_BASE_URL="https://api.moonshot.cn/v1"
KIMI_API_KEY="your-kimi-api-key"
KIMI_MODEL="kimi-k2-0711-preview"
```

- [ ] **Step 2: Install openai package**

Run:

```bash
pnpm --filter server add openai
```

Expected: `openai` added to `server/package.json` dependencies.

- [ ] **Step 3: Commit**

```bash
git add server/.env.example server/package.json pnpm-lock.yaml
git commit -m "chore(study-agent): add openai dependency and Kimi env example"
```

---

### Task 2.5: Implement KimiClientService

**Files:**
- Create: `server/src/modules/study-agent/services/kimi-client.service.ts`
- Create: `server/src/modules/study-agent/services/kimi-client.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/kimi-client.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KimiClientService } from './kimi-client.service';

describe('KimiClientService', () => {
  let service: KimiClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KimiClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'KIMI_BASE_URL':
                  return 'https://api.example.com';
                case 'KIMI_API_KEY':
                  return 'test-key';
                case 'KIMI_MODEL':
                  return 'test-model';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KimiClientService>(KimiClientService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- kimi-client.service.spec.ts
```

Expected: `KimiClientService is not defined`.

- [ ] **Step 3: Implement minimal service**

Create `server/src/modules/study-agent/services/kimi-client.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface KimiClientResponse {
  content: string;
}

@Injectable()
export class KimiClientService {
  private readonly logger = new Logger(KimiClientService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('KIMI_BASE_URL');
    const apiKey = this.configService.get<string>('KIMI_API_KEY');
    this.model = this.configService.get<string>('KIMI_MODEL') ?? 'kimi-k2-0711-preview';

    this.client = new OpenAI({
      baseURL,
      apiKey,
      timeout: 30000,
      maxRetries: 1,
    });
  }

  async chat(messages: ChatMessage[]): Promise<KimiClientResponse> {
    this.logger.log(`Calling Kimi API with ${messages.length} messages`);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return { content };
  }
}
```

- [ ] **Step 4: Register service in module**

Modify `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';

@Module({
  controllers: [StudyAgentController],
  providers: [StudyAgentConfigService, KimiClientService],
})
export class StudyAgentModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- kimi-client.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/kimi-client.service.ts server/src/modules/study-agent/services/kimi-client.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add Kimi client service"
```

---

## Task 3: Backend Content & Context Services

### Task 3.1: Implement KnowledgeContentService

**Files:**
- Create: `server/src/modules/study-agent/services/knowledge-content.service.ts`
- Create: `server/src/modules/study-agent/services/knowledge-content.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/knowledge-content.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { KnowledgeContentService } from './knowledge-content.service';

jest.mock('fs');

describe('KnowledgeContentService', () => {
  let service: KnowledgeContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeContentService],
    }).compile();

    service = module.get<KnowledgeContentService>(KnowledgeContentService);
  });

  it('extracts section by title', async () => {
    const markdown = '# 1.1 三角函数\n\n内容A\n\n## 1.1.1 三角函数的基本概念\n\n目标内容\n\n$$x^2$$\n\n## 1.1.2 另一个\n\n其他';
    (fs.readFileSync as jest.Mock).mockReturnValue(markdown);

    const result = await service.getSummary('iksm/math.md', '1.1.1', '三角函数的基本概念');
    expect(result).toContain('目标内容');
    expect(result).toContain('$$x^2$$');
    expect(result).not.toContain('其他');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- knowledge-content.service.spec.ts
```

Expected: `KnowledgeContentService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/knowledge-content.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const MAX_SUMMARY_LENGTH = 2000;

@Injectable()
export class KnowledgeContentService {
  private readonly logger = new Logger(KnowledgeContentService.name);

  async getSummary(
    contentRef: string | undefined,
    textbookContentPath: string | undefined,
    code: string,
    title: string,
  ): Promise<string> {
    const filePath = contentRef ?? textbookContentPath;
    if (!filePath) {
      this.logger.warn('No markdown file available for knowledge content');
      return '';
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    let content: string;

    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      this.logger.warn(`Failed to read markdown file ${fullPath}: ${(error as Error).message}`);
      return '';
    }

    const section = this.extractSection(content, code, title);
    if (section.length > 0) {
      return this.truncate(section);
    }

    return this.truncate(content);
  }

  private extractSection(content: string, code: string, title: string): string {
    const lines = content.split('\n');
    const headingRegex = new RegExp(`^(#{1,6})\\s*(?:${this.escapeRegex(code)}|${this.escapeRegex(title)})`);
    let startIndex = -1;
    let startLevel = 6;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(headingRegex);
      if (match) {
        startIndex = i;
        startLevel = match[1].length;
        break;
      }
    }

    if (startIndex === -1) {
      return '';
    }

    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s/);
      if (match && match[1].length <= startLevel) {
        endIndex = i;
        break;
      }
    }

    return lines.slice(startIndex, endIndex).join('\n');
  }

  private truncate(text: string): string {
    if (text.length <= MAX_SUMMARY_LENGTH) {
      return text;
    }

    const boundaryChars = ['\n\n', '\n', '。', '；', '$$'];
    for (const boundary of boundaryChars) {
      const index = text.lastIndexOf(boundary, MAX_SUMMARY_LENGTH);
      if (index > MAX_SUMMARY_LENGTH * 0.7) {
        return text.slice(0, index + boundary.length).trim();
      }
    }

    return text.slice(0, MAX_SUMMARY_LENGTH).trim();
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

- [ ] **Step 4: Register service in module**

Modify `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';
import { KnowledgeContentService } from './services/knowledge-content.service';

@Module({
  controllers: [StudyAgentController],
  providers: [
    StudyAgentConfigService,
    KimiClientService,
    KnowledgeContentService,
  ],
})
export class StudyAgentModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- knowledge-content.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/knowledge-content.service.ts server/src/modules/study-agent/services/knowledge-content.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add knowledge content extraction service"
```

---

### Task 3.2: Implement LearningContextService

**Files:**
- Create: `server/src/modules/study-agent/services/learning-context.service.ts`
- Create: `server/src/modules/study-agent/services/learning-context.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/learning-context.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { LearningContextService } from './learning-context.service';

describe('LearningContextService', () => {
  let service: LearningContextService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningContextService,
        {
          provide: PrismaService,
          useValue: {
            learningRecord: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LearningContextService>(LearningContextService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('returns recent 3 records formatted', async () => {
    (prisma.learningRecord.findMany as jest.Mock).mockResolvedValue([
      { masteryLevel: 'A', durationMinutes: 10, createdAt: new Date('2026-01-01') },
      { masteryLevel: 'B', durationMinutes: 20, createdAt: new Date('2026-01-02') },
    ]);

    const result = await service.getRecentRecords('user-1', 'kp-1');
    expect(result).toContain('A');
    expect(result).toContain('20');
    expect(prisma.learningRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', knowledgePointId: 'kp-1' },
        take: 3,
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- learning-context.service.spec.ts
```

Expected: `LearningContextService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/learning-context.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LearningContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentRecords(userId: string, knowledgePointId: string): Promise<string> {
    const records = await this.prisma.learningRecord.findMany({
      where: {
        userId,
        knowledgePointId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
      select: {
        masteryLevel: true,
        durationMinutes: true,
        createdAt: true,
      },
    });

    if (records.length === 0) {
      return 'No prior learning records for this knowledge point.';
    }

    return records
      .map(
        (record, index) =>
          `${index + 1}. Mastery: ${record.masteryLevel}, Duration: ${record.durationMinutes} minutes`,
      )
      .join('\n');
  }
}
```

- [ ] **Step 4: Register service in module**

Modify `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';
import { KnowledgeContentService } from './services/knowledge-content.service';
import { LearningContextService } from './services/learning-context.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudyAgentController],
  providers: [
    StudyAgentConfigService,
    KimiClientService,
    KnowledgeContentService,
    LearningContextService,
  ],
})
export class StudyAgentModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- learning-context.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/learning-context.service.ts server/src/modules/study-agent/services/learning-context.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add learning context service"
```

---

## Task 4: Backend Session & Message Services

### Task 4.1: Implement StudySessionService

**Files:**
- Create: `server/src/modules/study-agent/services/study-session.service.ts`
- Create: `server/src/modules/study-agent/services/study-session.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/study-session.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StudySessionService } from './study-session.service';

describe('StudySessionService', () => {
  let service: StudySessionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudySessionService,
        {
          provide: PrismaService,
          useValue: {
            studySession: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StudySessionService>(StudySessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('upserts session with user and knowledge point', async () => {
    (prisma.studySession.upsert as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      knowledgePointId: 'kp-1',
    });

    const result = await service.upsert('user-1', 'kp-1', '三角函数');
    expect(result.id).toBe('session-1');
    expect(prisma.studySession.upsert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- study-session.service.spec.ts
```

Expected: `StudySessionService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/study-session.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StudySession } from '@prisma/client';

@Injectable()
export class StudySessionService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    userId: string,
    knowledgePointId: string,
    title: string,
  ): Promise<StudySession> {
    return this.prisma.studySession.upsert({
      where: {
        userId_knowledgePointId: {
          userId,
          knowledgePointId,
        },
      },
      update: {},
      create: {
        userId,
        knowledgePointId,
        title,
      },
    });
  }

  async findById(userId: string, sessionId: string): Promise<StudySession | null> {
    return this.prisma.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async findByKnowledgePoint(
    userId: string,
    knowledgePointId: string,
  ): Promise<StudySession | null> {
    return this.prisma.studySession.findFirst({
      where: {
        userId,
        knowledgePointId,
      },
    });
  }
}
```

Note: The unique index name in Prisma will be `userId_knowledgePointId` by default if we use `@@unique([userId, knowledgePointId])`. Adjust if the migration generates a different name.

- [ ] **Step 4: Register service in module**

Modify `server/src/modules/study-agent/study-agent.module.ts` to add `StudySessionService` to providers.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- study-session.service.spec.ts
```

Expected: `PASS` (may need to adjust the unique index name after migration).

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/study-session.service.ts server/src/modules/study-agent/services/study-session.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add session service with upsert"
```

---

### Task 4.2: Implement StudyMessageService

**Files:**
- Create: `server/src/modules/study-agent/services/study-message.service.ts`
- Create: `server/src/modules/study-agent/services/study-message.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/study-message.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StudyMessageService } from './study-message.service';

describe('StudyMessageService', () => {
  let service: StudyMessageService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyMessageService,
        {
          provide: PrismaService,
          useValue: {
            studyMessage: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StudyMessageService>(StudyMessageService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('creates user message', async () => {
    (prisma.studyMessage.create as jest.Mock).mockResolvedValue({ id: 'msg-1' });
    const result = await service.createUserMessage('session-1', 'Hello');
    expect(result.id).toBe('msg-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- study-message.service.spec.ts
```

Expected: `StudyMessageService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/study-message.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StudyMessage, StudyMessageRole } from '@prisma/client';

export interface CreateAgentMessageInput {
  sessionId: string;
  content: string;
  followUps: string[];
}

@Injectable()
export class StudyMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserMessage(sessionId: string, content: string): Promise<StudyMessage> {
    return this.prisma.studyMessage.create({
      data: {
        sessionId,
        role: StudyMessageRole.user,
        content,
      },
    });
  }

  async createAgentMessage(input: CreateAgentMessageInput): Promise<StudyMessage> {
    return this.prisma.studyMessage.create({
      data: {
        sessionId: input.sessionId,
        role: StudyMessageRole.agent,
        content: input.content,
        followUps: input.followUps,
      },
    });
  }

  async findBySession(sessionId: string): Promise<StudyMessage[]> {
    return this.prisma.studyMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findLastAgentMessage(sessionId: string): Promise<StudyMessage | null> {
    return this.prisma.studyMessage.findFirst({
      where: {
        sessionId,
        role: StudyMessageRole.agent,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserMessageById(
    userId: string,
    userMessageId: string,
  ): Promise<StudyMessage | null> {
    return this.prisma.studyMessage.findFirst({
      where: {
        id: userMessageId,
        role: StudyMessageRole.user,
        session: {
          userId,
        },
      },
    });
  }

  async findAgentResponseForUserMessage(
    sessionId: string,
    userMessageId: string,
  ): Promise<StudyMessage | null> {
    return this.prisma.studyMessage.findFirst({
      where: {
        sessionId,
        role: StudyMessageRole.agent,
        createdAt: {
          gt: (
            await this.prisma.studyMessage.findUnique({
              where: { id: userMessageId },
              select: { createdAt: true },
            })
          )?.createdAt,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAgentMessage(id: string, content: string, followUps: string[]): Promise<StudyMessage> {
    return this.prisma.studyMessage.update({
      where: { id },
      data: {
        content,
        followUps,
        feedback: null,
      },
    });
  }
}
```

- [ ] **Step 4: Register service in module**

Add `StudyMessageService` to `study-agent.module.ts` providers.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- study-message.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/study-message.service.ts server/src/modules/study-agent/services/study-message.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add message service"
```

---

### Task 4.3: Implement MessageFeedbackService

**Files:**
- Create: `server/src/modules/study-agent/services/message-feedback.service.ts`
- Create: `server/src/modules/study-agent/services/message-feedback.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/message-feedback.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageFeedbackService } from './message-feedback.service';

describe('MessageFeedbackService', () => {
  let service: MessageFeedbackService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageFeedbackService,
        {
          provide: PrismaService,
          useValue: {
            studyMessage: {
              updateMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MessageFeedbackService>(MessageFeedbackService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('updates feedback for owned message', async () => {
    (prisma.studyMessage.findFirst as jest.Mock).mockResolvedValue({ id: 'msg-1' });
    (prisma.studyMessage.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    await service.updateFeedback('user-1', 'msg-1', 'positive');
    expect(prisma.studyMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1', session: { userId: 'user-1' }, role: 'agent' },
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- message-feedback.service.spec.ts
```

Expected: `MessageFeedbackService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/message-feedback.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StudyMessageFeedback, StudyMessageRole } from '@prisma/client';

export type FeedbackValue = 'positive' | 'negative' | null;

@Injectable()
export class MessageFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async updateFeedback(
    userId: string,
    messageId: string,
    feedback: FeedbackValue,
  ): Promise<void> {
    const message = await this.prisma.studyMessage.findFirst({
      where: {
        id: messageId,
        role: StudyMessageRole.agent,
        session: {
          userId,
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Agent message not found');
    }

    const feedbackValue = feedback
      ? (feedback as StudyMessageFeedback)
      : null;

    await this.prisma.studyMessage.updateMany({
      where: {
        id: messageId,
        session: {
          userId,
        },
      },
      data: {
        feedback: feedbackValue,
      },
    });
  }
}
```

- [ ] **Step 4: Register service in module**

Add `MessageFeedbackService` to `study-agent.module.ts` providers.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- message-feedback.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/message-feedback.service.ts server/src/modules/study-agent/services/message-feedback.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add message feedback service"
```

---

## Task 5: Backend Skill & Rate Limiting

### Task 5.1: Implement follow-up parser utility

**Files:**
- Create: `server/src/modules/study-agent/utils/follow-up-parser.ts`
- Create: `server/src/modules/study-agent/utils/follow-up-parser.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/utils/follow-up-parser.spec.ts`:

```typescript
import { parseFollowUps, FALLBACK_FOLLOW_UPS } from './follow-up-parser';

describe('parseFollowUps', () => {
  it('parses valid JSON block', () => {
    const text = 'Answer\n\n```json\n{"followUps": ["q1", "q2", "q3"]}\n```';
    expect(parseFollowUps(text, 'Title')).toEqual(['q1', 'q2', 'q3']);
  });

  it('uses fallback when block is missing', () => {
    const text = 'Answer without follow-ups';
    expect(parseFollowUps(text, 'Title')).toEqual(FALLBACK_FOLLOW_UPS('Title'));
  });

  it('uses fallback when count is wrong', () => {
    const text = '```json\n{"followUps": ["q1", "q2"]}\n```';
    expect(parseFollowUps(text, 'Title')).toEqual(FALLBACK_FOLLOW_UPS('Title'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- follow-up-parser.spec.ts
```

Expected: `parseFollowUps is not defined`.

- [ ] **Step 3: Implement parser**

Create `server/src/modules/study-agent/utils/follow-up-parser.ts`:

```typescript
export const FALLBACK_FOLLOW_UPS = (title: string): string[] => [
  `「${title}」的典型例题有哪些？`,
  `「${title}」的常见易错点是什么？`,
  `如何进一步理解「${title}」？`,
];

export function parseFollowUps(text: string, title: string): string[] {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!codeBlockMatch) {
    return FALLBACK_FOLLOW_UPS(title);
  }

  try {
    const parsed = JSON.parse(codeBlockMatch[1]) as { followUps?: unknown };
    const followUps = parsed.followUps;

    if (
      Array.isArray(followUps) &&
      followUps.length === 3 &&
      followUps.every((item) => typeof item === 'string' && item.length > 0)
    ) {
      return followUps as string[];
    }
  } catch {
    // ignore parse errors and fall back
  }

  return FALLBACK_FOLLOW_UPS(title);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- follow-up-parser.spec.ts
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/study-agent/utils/follow-up-parser.ts server/src/modules/study-agent/utils/follow-up-parser.spec.ts
git commit -m "feat(study-agent): add follow-up parser utility"
```

---

### Task 5.2: Implement StudyRateLimitService

**Files:**
- Create: `server/src/modules/study-agent/services/study-rate-limit.service.ts`
- Create: `server/src/modules/study-agent/services/study-rate-limit.service.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/study-rate-limit.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { StudyRateLimitService } from './study-rate-limit.service';

describe('StudyRateLimitService', () => {
  let service: StudyRateLimitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyRateLimitService],
    }).compile();

    service = module.get<StudyRateLimitService>(StudyRateLimitService);
  });

  it('allows first request', () => {
    expect(service.isAllowed('user-1')).toBe(true);
  });

  it('blocks after 20 requests in one minute', () => {
    for (let i = 0; i < 20; i++) {
      service.isAllowed('user-1');
    }
    expect(service.isAllowed('user-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- study-rate-limit.service.spec.ts
```

Expected: `StudyRateLimitService is not defined`.

- [ ] **Step 3: Implement service**

Create `server/src/modules/study-agent/services/study-rate-limit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  timestamps: number[];
}

@Injectable()
export class StudyRateLimitService {
  private readonly requestsPerMinute = 20;
  private readonly requestsPerHour = 100;
  private readonly store = new Map<string, RateLimitEntry>();

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const entry = this.store.get(userId) ?? { timestamps: [] };

    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentTimestamps = entry.timestamps.filter((t) => t > oneHourAgo);
    const perMinuteCount = recentTimestamps.filter((t) => t > oneMinuteAgo).length;
    const perHourCount = recentTimestamps.length;

    if (perMinuteCount >= this.requestsPerMinute || perHourCount >= this.requestsPerHour) {
      return false;
    }

    recentTimestamps.push(now);
    this.store.set(userId, { timestamps: recentTimestamps });
    return true;
  }
}
```

- [ ] **Step 4: Register service in module**

Add `StudyRateLimitService` to `study-agent.module.ts` providers.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- study-rate-limit.service.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/study-rate-limit.service.ts server/src/modules/study-agent/services/study-rate-limit.service.spec.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add in-memory rate limit service"
```

---

### Task 5.3: Implement QaSkill

**Files:**
- Create: `server/src/modules/study-agent/services/skills/qa.skill.ts`
- Create: `server/src/modules/study-agent/services/skills/qa.skill.spec.ts`
- Modify: `server/src/modules/study-agent/study-agent.module.ts`
- Create: `server/src/modules/study-agent/services/study-skill.registry.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/services/skills/qa.skill.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { QaSkill } from './qa.skill';
import { KimiClientService } from '../kimi-client.service';
import { StudyAgentConfigService } from '../study-agent-config.service';
import { KnowledgeContentService } from '../knowledge-content.service';
import { LearningContextService } from '../learning-context.service';

describe('QaSkill', () => {
  let skill: QaSkill;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QaSkill,
        {
          provide: KimiClientService,
          useValue: {
            chat: jest.fn().mockResolvedValue({ content: 'Answer\n```json\n{"followUps": ["a", "b", "c"]}\n```' }),
          },
        },
        {
          provide: StudyAgentConfigService,
          useValue: {
            getIdentity: () => 'Identity',
            getMemory: () => 'Memory',
            getSoule: () => 'SOULE',
          },
        },
        {
          provide: KnowledgeContentService,
          useValue: { getSummary: jest.fn().mockResolvedValue('Summary') },
        },
        {
          provide: LearningContextService,
          useValue: { getRecentRecords: jest.fn().mockResolvedValue('Records') },
        },
      ],
    }).compile();

    skill = module.get<QaSkill>(QaSkill);
  });

  it('returns answer and follow-ups', async () => {
    const result = await skill.execute('user-1', 'kp-1', 'Question', [], 'Title', '1.1', 'code');
    expect(result.content).toBe('Answer');
    expect(result.followUps).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- qa.skill.spec.ts
```

Expected: `QaSkill is not defined`.

- [ ] **Step 3: Implement QaSkill and registry**

Create `server/src/modules/study-agent/services/skills/qa.skill.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { KimiClientService, ChatMessage } from '../kimi-client.service';
import { StudyAgentConfigService } from '../study-agent-config.service';
import { KnowledgeContentService } from '../knowledge-content.service';
import { LearningContextService } from '../learning-context.service';
import { parseFollowUps } from '../../utils/follow-up-parser';
import { StudyMessage } from '@prisma/client';

export interface QaSkillResult {
  content: string;
  followUps: string[];
}

export interface QaSkillInput {
  userId: string;
  knowledgePointId: string;
  question: string;
  history: Pick<StudyMessage, 'role' | 'content'>[];
  title: string;
  code: string;
  contentRef?: string;
  textbookContentPath?: string;
}

@Injectable()
export class QaSkill {
  constructor(
    private readonly kimiClient: KimiClientService,
    private readonly configService: StudyAgentConfigService,
    private readonly contentService: KnowledgeContentService,
    private readonly learningContextService: LearningContextService,
  ) {}

  async execute(input: QaSkillInput): Promise<QaSkillResult> {
    const summary = await this.contentService.getSummary(
      input.contentRef,
      input.textbookContentPath,
      input.code,
      input.title,
    );

    const learningContext = await this.learningContextService.getRecentRecords(
      input.userId,
      input.knowledgePointId,
    );

    const messages = this.buildMessages(input, summary, learningContext);
    const response = await this.kimiClient.chat(messages);

    const rawContent = response.content;
    const followUps = parseFollowUps(rawContent, input.title);
    const content = this.stripFollowUpBlock(rawContent);

    return { content, followUps };
  }

  private buildMessages(
    input: QaSkillInput,
    summary: string,
    learningContext: string,
  ): ChatMessage[] {
    const systemPrompt = [
      this.configService.getIdentity(),
      this.configService.getMemory(),
      this.configService.getSoule(),
      `Current knowledge point: ${input.title} (code: ${input.code})`,
      `Knowledge point summary:\n${summary || 'N/A'}`,
      `Recent learning records:\n${learningContext}`,
      'Return your answer followed by a JSON code block with exactly 3 followUp questions in the format: {"followUps": ["q1", "q2", "q3"]}.',
    ].join('\n\n');

    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const message of input.history) {
      messages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
      });
    }

    messages.push({ role: 'user', content: input.question });
    return messages;
  }

  private stripFollowUpBlock(content: string): string {
    return content.replace(/```json\s*[\s\S]*?```\s*$/, '').trim();
  }
}
```

Create `server/src/modules/study-agent/services/study-skill.registry.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { QaSkill } from './skills/qa.skill';

@Injectable()
export class StudySkillRegistry {
  constructor(private readonly qaSkill: QaSkill) {}

  getDefaultSkill(): QaSkill {
    return this.qaSkill;
  }
}
```

- [ ] **Step 4: Register services in module**

Modify `server/src/modules/study-agent/study-agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudyAgentController } from './study-agent.controller';
import { StudyAgentConfigService } from './services/study-agent-config.service';
import { KimiClientService } from './services/kimi-client.service';
import { KnowledgeContentService } from './services/knowledge-content.service';
import { LearningContextService } from './services/learning-context.service';
import { StudySessionService } from './services/study-session.service';
import { StudyMessageService } from './services/study-message.service';
import { MessageFeedbackService } from './services/message-feedback.service';
import { StudyRateLimitService } from './services/study-rate-limit.service';
import { StudySkillRegistry } from './services/study-skill.registry';
import { QaSkill } from './services/skills/qa.skill';

@Module({
  imports: [PrismaModule],
  controllers: [StudyAgentController],
  providers: [
    StudyAgentConfigService,
    KimiClientService,
    KnowledgeContentService,
    LearningContextService,
    StudySessionService,
    StudyMessageService,
    MessageFeedbackService,
    StudyRateLimitService,
    StudySkillRegistry,
    QaSkill,
  ],
})
export class StudyAgentModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- qa.skill.spec.ts
```

Expected: `PASS`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/study-agent/services/skills/qa.skill.ts server/src/modules/study-agent/services/skills/qa.skill.spec.ts server/src/modules/study-agent/services/study-skill.registry.ts server/src/modules/study-agent/study-agent.module.ts
git commit -m "feat(study-agent): add qa skill and skill registry"
```

---

## Task 6: Backend Controller & DTOs

### Task 6.1: Create DTOs

**Files:**
- Create: `server/src/modules/study-agent/dto/create-session.dto.ts`
- Create: `server/src/modules/study-agent/dto/create-message.dto.ts`
- Create: `server/src/modules/study-agent/dto/update-feedback.dto.ts`
- Create: `server/src/modules/study-agent/dto/study-message-response.dto.ts`
- Create: `server/src/modules/study-agent/dto/study-session-response.dto.ts`

- [ ] **Step 1: Create DTO files**

Create `server/src/modules/study-agent/dto/create-session.dto.ts`:

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: '知识点ID' })
  @IsString()
  knowledgePointId: string;

  @ApiProperty({ description: '知识点标题' })
  @IsString()
  knowledgePointTitle: string;
}
```

Create `server/src/modules/study-agent/dto/create-message.dto.ts`:

```typescript
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ description: '用户消息内容' })
  @IsString()
  content: string;
}
```

Create `server/src/modules/study-agent/dto/update-feedback.dto.ts`:

```typescript
import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeedbackDto {
  @ApiPropertyOptional({ description: '反馈类型: positive 或 negative，不传表示移除' })
  @IsOptional()
  @IsIn(['positive', 'negative'])
  feedback?: 'positive' | 'negative';
}
```

Create `server/src/modules/study-agent/dto/study-message-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class StudyMessageResponseDto {
  @ApiProperty({ description: '消息ID' })
  id: string;

  @ApiProperty({ description: '会话ID' })
  sessionId: string;

  @ApiProperty({ description: '角色', enum: ['user', 'agent'] })
  role: string;

  @ApiProperty({ description: '内容' })
  content: string;

  @ApiProperty({ description: '追问问题', type: [String] })
  followUps: string[];

  @ApiProperty({ description: '反馈', nullable: true })
  feedback: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
```

Create `server/src/modules/study-agent/dto/study-session-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { StudyMessageResponseDto } from './study-message-response.dto';

export class StudySessionResponseDto {
  @ApiProperty({ description: '会话ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '知识点ID' })
  knowledgePointId: string;

  @ApiProperty({ description: '知识点标题' })
  title: string;

  @ApiProperty({ description: '消息列表', type: [StudyMessageResponseDto] })
  messages: StudyMessageResponseDto[];

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/study-agent/dto
git commit -m "feat(study-agent): add request and response DTOs"
```

---

### Task 6.2: Implement StudyAgentController

**Files:**
- Create: `server/src/modules/study-agent/study-agent.controller.ts`
- Create: `server/src/modules/study-agent/study-agent.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/study-agent/study-agent.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { StudyAgentController } from './study-agent.controller';
import { StudySessionService } from './services/study-session.service';
import { StudyMessageService } from './services/study-message.service';
import { StudySkillRegistry } from './services/study-skill.registry';
import { StudyRateLimitService } from './services/study-rate-limit.service';
import { MessageFeedbackService } from './services/message-feedback.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudyAgentController', () => {
  let controller: StudyAgentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyAgentController],
      providers: [
        {
          provide: StudySessionService,
          useValue: { upsert: jest.fn(), findById: jest.fn() },
        },
        {
          provide: StudyMessageService,
          useValue: { createUserMessage: jest.fn(), createAgentMessage: jest.fn(), findBySession: jest.fn() },
        },
        {
          provide: StudySkillRegistry,
          useValue: { getDefaultSkill: jest.fn() },
        },
        {
          provide: StudyRateLimitService,
          useValue: { isAllowed: jest.fn().mockReturnValue(true) },
        },
        {
          provide: MessageFeedbackService,
          useValue: { updateFeedback: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { knowledgePoint: { findUnique: jest.fn() } },
        },
      ],
    }).compile();

    controller = module.get<StudyAgentController>(StudyAgentController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter server test -- study-agent.controller.spec.ts
```

Expected: `StudyAgentController is not defined`.

- [ ] **Step 3: Implement controller**

Create `server/src/modules/study-agent/study-agent.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
  TooManyRequestsException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StudySessionService } from './services/study-session.service';
import { StudyMessageService } from './services/study-message.service';
import { MessageFeedbackService } from './services/message-feedback.service';
import { StudyRateLimitService } from './services/study-rate-limit.service';
import { StudySkillRegistry } from './services/study-skill.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { StudySessionResponseDto } from './dto/study-session-response.dto';
import { StudyMessageResponseDto } from './dto/study-message-response.dto';
import { StudyMessageRole } from '@prisma/client';

@ApiTags('study-agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study-agent')
export class StudyAgentController {
  constructor(
    private readonly sessionService: StudySessionService,
    private readonly messageService: StudyMessageService,
    private readonly feedbackService: MessageFeedbackService,
    private readonly rateLimitService: StudyRateLimitService,
    private readonly skillRegistry: StudySkillRegistry,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSessionDto,
  ): Promise<{ success: boolean; data: StudySessionResponseDto }> {
    const session = await this.sessionService.upsert(
      userId,
      dto.knowledgePointId,
      dto.knowledgePointTitle,
    );

    const messages = await this.messageService.findBySession(session.id);

    return {
      success: true,
      data: this.mapSession(session, messages),
    };
  }

  @Get('sessions/:id')
  async getSession(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionId: string,
  ): Promise<{ success: boolean; data: StudySessionResponseDto }> {
    const session = await this.sessionService.findById(userId, sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const messages = await this.messageService.findBySession(session.id);
    return {
      success: true,
      data: this.mapSession(session, messages),
    };
  }

  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @CurrentUser('userId') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<{ success: boolean; data: StudyMessageResponseDto }> {
    if (!this.rateLimitService.isAllowed(userId)) {
      throw new TooManyRequestsException('请求太频繁，请稍后再试');
    }

    const session = await this.sessionService.findById(userId, sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.messageService.createUserMessage(session.id, dto.content);
    return this.generateAgentResponse(userId, session);
  }

  @Put('messages/:id/feedback')
  async updateFeedback(
    @CurrentUser('userId') userId: string,
    @Param('id') messageId: string,
    @Body() dto: UpdateFeedbackDto,
  ): Promise<{ success: boolean }> {
    await this.feedbackService.updateFeedback(userId, messageId, dto.feedback ?? null);
    return { success: true };
  }

  @Post('messages/:userMessageId/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerate(
    @CurrentUser('userId') userId: string,
    @Param('userMessageId') userMessageId: string,
  ): Promise<{ success: boolean; data: StudyMessageResponseDto }> {
    if (!this.rateLimitService.isAllowed(userId)) {
      throw new TooManyRequestsException('请求太频繁，请稍后再试');
    }

    const userMessage = await this.messageService.findUserMessageById(userId, userMessageId);
    if (!userMessage) {
      throw new NotFoundException('User message not found');
    }

    const session = await this.sessionService.findById(userId, userMessage.sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const agentMessage = await this.messageService.findAgentResponseForUserMessage(
      session.id,
      userMessageId,
    );
    if (!agentMessage) {
      throw new NotFoundException('No agent response to regenerate');
    }

    return this.generateAgentResponse(userId, session, userMessage.content, agentMessage.id);
  }

  private async generateAgentResponse(
    userId: string,
    session: { id: string; knowledgePointId: string; title: string },
    overrideQuestion?: string,
    existingAgentMessageId?: string,
  ): Promise<{ success: boolean; data: StudyMessageResponseDto }> {
    const knowledgePoint = await this.prisma.knowledgePoint.findUnique({
      where: { id: session.knowledgePointId },
      include: {
        textbook: {
          select: {
            contentPath: true,
          },
        },
      },
    });
    if (!knowledgePoint) {
      throw new NotFoundException('Knowledge point not found');
    }

    const allMessages = await this.messageService.findBySession(session.id);
    const history = allMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const question = overrideQuestion ?? history.filter((m) => m.role === 'user').pop()?.content ?? '';

    const skill = this.skillRegistry.getDefaultSkill();

    try {
      const result = await skill.execute({
        userId,
        knowledgePointId: session.knowledgePointId,
        question,
        history,
        title: session.title,
        code: knowledgePoint.code,
        contentRef: knowledgePoint.contentRef ?? undefined,
        textbookContentPath: knowledgePoint.textbook?.contentPath ?? undefined,
      });

      let agentMessage: StudyMessageResponseDto;
      if (existingAgentMessageId) {
        const updated = await this.messageService.updateAgentMessage(
          existingAgentMessageId,
          result.content,
          result.followUps,
        );
        agentMessage = this.mapMessage(updated);
      } else {
        const created = await this.messageService.createAgentMessage({
          sessionId: session.id,
          content: result.content,
          followUps: result.followUps,
        });
        agentMessage = this.mapMessage(created);
      }

      return { success: true, data: agentMessage };
    } catch (error) {
      throw new ServiceUnavailableException('AI 助手暂时不可用，请稍后重试');
    }
  }

  private mapSession(session: unknown, messages: unknown[]): StudySessionResponseDto {
    const s = session as {
      id: string;
      userId: string;
      knowledgePointId: string;
      title: string;
      createdAt: Date;
    };
    return {
      id: s.id,
      userId: s.userId,
      knowledgePointId: s.knowledgePointId,
      title: s.title,
      messages: messages.map((m) => this.mapMessage(m)),
      createdAt: s.createdAt,
    };
  }

  private mapMessage(message: unknown): StudyMessageResponseDto {
    const m = message as {
      id: string;
      sessionId: string;
      role: string;
      content: string;
      followUps: string[];
      feedback: string | null;
      createdAt: Date;
    };
    return {
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      followUps: m.followUps ?? [],
      feedback: m.feedback,
      createdAt: m.createdAt,
    };
  }
}
```

Note: The `textbook` relation on `KnowledgePoint` may not exist yet. We will add it in the Prisma schema update in Task 1.1, or fetch it separately. Alternatively, fetch the textbook via `prisma.textbook.findUnique` using `knowledgePoint.textbookId`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter server test -- study-agent.controller.spec.ts
```

Expected: `PASS` (adjust mocks if needed).

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/study-agent/study-agent.controller.ts server/src/modules/study-agent/study-agent.controller.spec.ts
git commit -m "feat(study-agent): add controller with endpoints"
```

---

## Task 7: Frontend Types & API

### Task 7.1: Add study-agent TypeScript types

**Files:**
- Create: `web/src/types/study-agent.types.ts`

- [ ] **Step 1: Create types file**

Create `web/src/types/study-agent.types.ts`:

```typescript
export type StudyMessageRole = 'user' | 'agent'

export type StudyMessageFeedback = 'positive' | 'negative' | null

export interface StudyMessage {
  id: string
  sessionId: string
  role: StudyMessageRole
  content: string
  followUps: string[]
  feedback: StudyMessageFeedback
  createdAt: string
}

export interface StudySession {
  id: string
  userId: string
  knowledgePointId: string
  title: string
  messages: StudyMessage[]
  createdAt: string
}

export interface CreateSessionRequest {
  knowledgePointId: string
  knowledgePointTitle: string
}

export interface CreateMessageRequest {
  content: string
}

export interface UpdateFeedbackRequest {
  feedback?: 'positive' | 'negative'
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/types/study-agent.types.ts
git commit -m "feat(web): add study-agent types"
```

---

### Task 7.2: Create studyAgentApi service

**Files:**
- Create: `web/src/services/studyAgentApi.ts`

- [ ] **Step 1: Create API service**

Create `web/src/services/studyAgentApi.ts`:

```typescript
import axios from 'axios'
import { getToken } from './auth.service'
import type {
  StudySession,
  StudyMessage,
  CreateSessionRequest,
  CreateMessageRequest,
  UpdateFeedbackRequest,
  ApiResponse,
} from '../types/study-agent.types'

const API_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000'

const api = axios.create({
  baseURL: `${API_URL}`,
})

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const studyAgentApi = {
  async createSession(data: CreateSessionRequest): Promise<StudySession> {
    const response = await api.post<ApiResponse<StudySession>>('/study-agent/sessions', data)
    return response.data.data
  },

  async getSession(sessionId: string): Promise<StudySession> {
    const response = await api.get<ApiResponse<StudySession>>(`/study-agent/sessions/${sessionId}`)
    return response.data.data
  },

  async sendMessage(sessionId: string, content: string): Promise<StudyMessage> {
    const response = await api.post<ApiResponse<StudyMessage>>(
      `/study-agent/sessions/${sessionId}/messages`,
      { content } as CreateMessageRequest,
    )
    return response.data.data
  },

  async updateFeedback(messageId: string, feedback?: 'positive' | 'negative'): Promise<void> {
    await api.put<ApiResponse<void>>(`/study-agent/messages/${messageId}/feedback`, {
      feedback,
    } as UpdateFeedbackRequest)
  },

  async regenerate(userMessageId: string): Promise<StudyMessage> {
    const response = await api.post<ApiResponse<StudyMessage>>(
      `/study-agent/messages/${userMessageId}/regenerate`,
    )
    return response.data.data
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/services/studyAgentApi.ts
git commit -m "feat(web): add study agent API service"
```

---

### Task 7.3: Create useStudyAgent hook

**Files:**
- Create: `web/src/hooks/useStudyAgent.ts`
- Create: `web/src/hooks/__tests__/useStudyAgent.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/hooks/__tests__/useStudyAgent.test.tsx`:

```tsx
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { useStudyAgent } from '../useStudyAgent'
import { studyAgentApi } from '../../services/studyAgentApi'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

vi.mock('../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: vi.fn().mockResolvedValue({ id: 'session-1', messages: [] }),
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-1', role: 'agent', content: 'Answer', followUps: [] }),
  },
}))

describe('useStudyAgent', () => {
  it('creates session on mount', async () => {
    const { result } = renderHook(() => useStudyAgent('kp-1', 'Title'), { wrapper })
    await waitFor(() => expect(result.current.session).not.toBeNull())
    expect(result.current.session?.id).toBe('session-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- useStudyAgent.test.tsx --run
```

Expected: `useStudyAgent is not defined` or similar.

- [ ] **Step 3: Implement hook**

Create `web/src/hooks/useStudyAgent.ts`:

```typescript
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studyAgentApi } from '../services/studyAgentApi'
import type { StudySession, StudyMessage } from '../types/study-agent.types'

export interface UseStudyAgentOptions {
  knowledgePointId: string
  knowledgePointTitle: string
}

export interface UseStudyAgentReturn {
  session: StudySession | null
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  isSending: boolean
  regenerate: (userMessageId: string) => Promise<void>
  isRegenerating: boolean
  submitFeedback: (messageId: string, feedback?: 'positive' | 'negative') => Promise<void>
}

export function useStudyAgent(
  knowledgePointId: string,
  knowledgePointTitle: string,
): UseStudyAgentReturn {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const {
    data: session,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['studySession', knowledgePointId],
    queryFn: async () => {
      return studyAgentApi.createSession({
        knowledgePointId,
        knowledgePointTitle,
      })
    },
    staleTime: Infinity,
    retry: false,
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!session) throw new Error('Session not ready')
      return studyAgentApi.sendMessage(session.id, content)
    },
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: ['studySession', knowledgePointId] })
      }
      setError(null)
    },
    onError: (err: unknown) => {
      const message = axiosErrorMessage(err)
      setError(message)
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: async (userMessageId: string) => {
      return studyAgentApi.regenerate(userMessageId)
    },
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: ['studySession', knowledgePointId] })
      }
      setError(null)
    },
    onError: (err: unknown) => {
      setError(axiosErrorMessage(err))
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, feedback }: { messageId: string; feedback?: 'positive' | 'negative' }) => {
      return studyAgentApi.updateFeedback(messageId, feedback)
    },
    onSuccess: () => {
      if (session) {
        queryClient.invalidateQueries({ queryKey: ['studySession', knowledgePointId] })
      }
    },
  })

  const sendMessage = useCallback(
    async (content: string) => {
      await sendMessageMutation.mutateAsync(content)
    },
    [sendMessageMutation],
  )

  const regenerate = useCallback(
    async (userMessageId: string) => {
      await regenerateMutation.mutateAsync(userMessageId)
    },
    [regenerateMutation],
  )

  const submitFeedback = useCallback(
    async (messageId: string, feedback?: 'positive' | 'negative') => {
      await feedbackMutation.mutateAsync({ messageId, feedback })
    },
    [feedbackMutation],
  )

  return {
    session: session ?? null,
    isLoading,
    error: error ?? (queryError ? axiosErrorMessage(queryError) : null),
    sendMessage,
    isSending: sendMessageMutation.isPending,
    regenerate,
    isRegenerating: regenerateMutation.isPending,
    submitFeedback,
  }
}

function axiosErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string }; status?: number } }).response
    if (response?.status === 429) return '请求太频繁，请稍后再试'
    if (response?.status === 503) return 'AI 助手暂时不可用，请稍后重试'
    return response?.data?.message ?? '请求失败'
  }
  return '请求失败'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- useStudyAgent.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useStudyAgent.ts web/src/hooks/__tests__/useStudyAgent.test.tsx
git commit -m "feat(web): add useStudyAgent hook"
```

---

## Task 8: Frontend UI Components

### Task 8.1: Create KnowledgeContextBar

**Files:**
- Create: `web/src/components/learning/KnowledgeContextBar.tsx`
- Create: `web/src/components/learning/__tests__/KnowledgeContextBar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/components/learning/__tests__/KnowledgeContextBar.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KnowledgeContextBar } from '../KnowledgeContextBar'

describe('KnowledgeContextBar', () => {
  it('renders title', () => {
    render(<KnowledgeContextBar title="三角函数" />)
    expect(screen.getByText('三角函数')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- KnowledgeContextBar.test.tsx --run
```

Expected: `KnowledgeContextBar is not defined`.

- [ ] **Step 3: Implement component**

Create `web/src/components/learning/KnowledgeContextBar.tsx`:

```tsx
import React from 'react'
import { BookOutlined } from '@ant-design/icons'
import { Space, Typography } from 'antd'
import styles from './KnowledgeContextBar.module.css'

export interface KnowledgeContextBarProps {
  title: string
}

export const KnowledgeContextBar: React.FC<KnowledgeContextBarProps> = ({ title }) => {
  return (
    <div className={styles.contextBar}>
      <Space>
        <BookOutlined className={styles.icon} />
        <Typography.Text className={styles.title} ellipsis={{ tooltip: title }}>
          {title}
        </Typography.Text>
      </Space>
    </div>
  )
}
```

Create `web/src/components/learning/KnowledgeContextBar.module.css`:

```css
.contextBar {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.icon {
  color: #1890ff;
}

.title {
  max-width: 280px;
  font-weight: 500;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- KnowledgeContextBar.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/learning/KnowledgeContextBar.tsx web/src/components/learning/KnowledgeContextBar.module.css web/src/components/learning/__tests__/KnowledgeContextBar.test.tsx
git commit -m "feat(web): add KnowledgeContextBar"
```

---

### Task 8.2: Create ChatInput

**Files:**
- Create: `web/src/components/learning/ChatInput.tsx`
- Create: `web/src/components/learning/ChatInput.module.css`
- Create: `web/src/components/learning/__tests__/ChatInput.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/components/learning/__tests__/ChatInput.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  it('sends message on submit', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} loading={false} />)

    const input = screen.getByPlaceholderText('请输入问题...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(onSend).toHaveBeenCalledWith('Hello')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- ChatInput.test.tsx --run
```

Expected: `ChatInput is not defined`.

- [ ] **Step 3: Implement component**

Create `web/src/components/learning/ChatInput.tsx`:

```tsx
import React, { useState, useCallback } from 'react'
import { Input, Button, Space } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import styles from './ChatInput.module.css'

export interface ChatInputProps {
  onSend: (content: string) => void
  loading: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading }) => {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    onSend(trimmed)
    setValue('')
  }, [value, loading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className={styles.chatInput}>
      <Space.Compact className={styles.compact}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入问题..."
          disabled={loading}
          className={styles.input}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          disabled={loading || !value.trim()}
          onClick={handleSend}
        >
          发送
        </Button>
      </Space.Compact>
    </div>
  )
}
```

Create `web/src/components/learning/ChatInput.module.css`:

```css
.chatInput {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.compact {
  width: 100%;
}

.input {
  flex: 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- ChatInput.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/learning/ChatInput.tsx web/src/components/learning/ChatInput.module.css web/src/components/learning/__tests__/ChatInput.test.tsx
git commit -m "feat(web): add ChatInput"
```

---

### Task 8.3: Create FollowUpChips

**Files:**
- Create: `web/src/components/learning/FollowUpChips.tsx`
- Create: `web/src/components/learning/FollowUpChips.module.css`
- Create: `web/src/components/learning/__tests__/FollowUpChips.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/components/learning/__tests__/FollowUpChips.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FollowUpChips } from '../FollowUpChips'

describe('FollowUpChips', () => {
  it('renders chips and handles click', () => {
    const onClick = vi.fn()
    render(<FollowUpChips questions={['q1', 'q2', 'q3']} onClick={onClick} />)

    fireEvent.click(screen.getByText('q1'))
    expect(onClick).toHaveBeenCalledWith('q1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- FollowUpChips.test.tsx --run
```

Expected: `FollowUpChips is not defined`.

- [ ] **Step 3: Implement component**

Create `web/src/components/learning/FollowUpChips.tsx`:

```tsx
import React from 'react'
import { Space, Tag } from 'antd'
import styles from './FollowUpChips.module.css'

export interface FollowUpChipsProps {
  questions: string[]
  onClick: (question: string) => void
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ questions, onClick }) => {
  return (
    <div className={styles.container}>
      <Space size="small" wrap>
        {questions.map((question, index) => (
          <Tag
            key={index}
            className={styles.chip}
            color="blue"
            onClick={() => onClick(question)}
            style={{ cursor: 'pointer' }}
          >
            {question}
          </Tag>
        ))}
      </Space>
    </div>
  )
}
```

Create `web/src/components/learning/FollowUpChips.module.css`:

```css
.container {
  padding: 8px 0;
}

.chip {
  max-width: 100%;
  white-space: normal;
  word-break: break-all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- FollowUpChips.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/learning/FollowUpChips.tsx web/src/components/learning/FollowUpChips.module.css web/src/components/learning/__tests__/FollowUpChips.test.tsx
git commit -m "feat(web): add FollowUpChips"
```

---

### Task 8.4: Create ChatMessageList

**Files:**
- Create: `web/src/components/learning/ChatMessageList.tsx`
- Create: `web/src/components/learning/ChatMessageList.module.css`
- Create: `web/src/components/learning/__tests__/ChatMessageList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/components/learning/__tests__/ChatMessageList.test.tsx`:

```tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessageList } from '../ChatMessageList'
import type { StudyMessage } from '../../../types/study-agent.types'

describe('ChatMessageList', () => {
  const messages: StudyMessage[] = [
    { id: '1', sessionId: 's1', role: 'user', content: 'Q', followUps: [], feedback: null, createdAt: '' },
    { id: '2', sessionId: 's1', role: 'agent', content: 'A', followUps: ['f1'], feedback: null, createdAt: '' },
  ]

  it('renders messages and feedback', () => {
    const onFeedback = vi.fn()
    const onRegenerate = vi.fn()
    const onFollowUp = vi.fn()

    render(
      <ChatMessageList
        messages={messages}
        knowledgePointTitle="Title"
        onFeedback={onFeedback}
        onRegenerate={onRegenerate}
        onFollowUp={onFollowUp}
      />,
    )

    expect(screen.getByText('Q')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- ChatMessageList.test.tsx --run
```

Expected: `ChatMessageList is not defined`.

- [ ] **Step 3: Implement component**

Create `web/src/components/learning/ChatMessageList.tsx`:

```tsx
import React, { useRef, useEffect } from 'react'
import { List, Avatar, Typography, Button, Space, Tooltip } from 'antd'
import { UserOutlined, RobotOutlined, ReloadOutlined, LikeOutlined, DislikeOutlined } from '@ant-design/icons'
import type { StudyMessage } from '../../types/study-agent.types'
import { FollowUpChips } from './FollowUpChips'
import styles from './ChatMessageList.module.css'

export interface ChatMessageListProps {
  messages: StudyMessage[]
  knowledgePointTitle: string
  onFeedback: (messageId: string, feedback?: 'positive' | 'negative') => void
  onRegenerate: (userMessageId: string) => void
  onFollowUp: (question: string) => void
  isLoading?: boolean
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  knowledgePointTitle,
  onFeedback,
  onRegenerate,
  onFollowUp,
  isLoading,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  const lastAgentMessage = [...messages].reverse().find((m) => m.role === 'agent')

  return (
    <div className={styles.listContainer}>
      <List
        dataSource={messages}
        renderItem={(message) => {
          const isAgent = message.role === 'agent'
          const isLatestAgent = isAgent && message.id === lastAgentMessage?.id

          return (
            <List.Item className={isAgent ? styles.agentItem : styles.userItem}>
              <div className={styles.messageRow}>
                <Avatar
                  icon={isAgent ? <RobotOutlined /> : <UserOutlined />}
                  className={isAgent ? styles.agentAvatar : styles.userAvatar}
                />
                <div className={styles.messageContent}>
                  <Typography.Text className={styles.messageText}>{message.content}</Typography.Text>
                  {isAgent && (
                    <>
                      <div className={styles.sourceIndicator}>
                        来源：{knowledgePointTitle}
                      </div>
                      <FollowUpChips questions={message.followUps} onClick={onFollowUp} />
                      <Space className={styles.actions}>
                        <Tooltip title="有帮助">
                          <Button
                            type={message.feedback === 'positive' ? 'primary' : 'text'}
                            size="small"
                            icon={<LikeOutlined />}
                            onClick={() =>
                              onFeedback(message.id, message.feedback === 'positive' ? undefined : 'positive')
                            }
                          />
                        </Tooltip>
                        <Tooltip title="没帮助">
                          <Button
                            type={message.feedback === 'negative' ? 'primary' : 'text'}
                            size="small"
                            icon={<DislikeOutlined />}
                            onClick={() =>
                              onFeedback(message.id, message.feedback === 'negative' ? undefined : 'negative')
                            }
                          />
                        </Tooltip>
                        {isLatestAgent && lastUserMessage && (
                          <Tooltip title="重新生成">
                            <Button
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={() => onRegenerate(lastUserMessage.id)}
                            >
                              重新生成
                            </Button>
                          </Tooltip>
                        )}
                      </Space>
                    </>
                  )}
                </div>
              </div>
            </List.Item>
          )
        }}
      />
      {isLoading && (
        <div className={styles.loadingRow}>
          <Avatar icon={<RobotOutlined />} className={styles.agentAvatar} />
          <Typography.Text type="secondary">AI 正在思考...</Typography.Text>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
```

Create `web/src/components/learning/ChatMessageList.module.css`:

```css
.listContainer {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.messageRow {
  display: flex;
  gap: 12px;
  width: 100%;
}

.userItem {
  justify-content: flex-end;
  background: transparent;
}

.agentItem {
  background: transparent;
}

.userItem .messageRow {
  flex-direction: row-reverse;
}

.messageContent {
  max-width: 80%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.userItem .messageContent {
  align-items: flex-end;
}

.agentAvatar {
  background: #1890ff;
  flex-shrink: 0;
}

.userAvatar {
  background: #52c41a;
  flex-shrink: 0;
}

.messageText {
  padding: 10px 14px;
  border-radius: 8px;
  background: #f5f5f5;
}

.userItem .messageText {
  background: #e6f7ff;
}

.sourceIndicator {
  font-size: 12px;
  color: #8c8c8c;
}

.actions {
  margin-top: 4px;
}

.loadingRow {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- ChatMessageList.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/learning/ChatMessageList.tsx web/src/components/learning/ChatMessageList.module.css web/src/components/learning/__tests__/ChatMessageList.test.tsx
git commit -m "feat(web): add ChatMessageList"
```

---

### Task 8.5: Create StudyAgentPanel

**Files:**
- Create: `web/src/components/learning/StudyAgentPanel.tsx`
- Create: `web/src/components/learning/StudyAgentPanel.module.css`
- Create: `web/src/components/learning/__tests__/StudyAgentPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `web/src/components/learning/__tests__/StudyAgentPanel.test.tsx`:

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StudyAgentPanel } from '../StudyAgentPanel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

vi.mock('../../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: vi.fn().mockResolvedValue({ id: 's1', messages: [] }),
  },
}))

describe('StudyAgentPanel', () => {
  it('renders context bar', async () => {
    render(<StudyAgentPanel open onClose={vi.fn()} knowledgePointId="kp-1" knowledgePointTitle="Title" />, { wrapper })
    expect(await screen.findByText('Title')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter web test -- StudyAgentPanel.test.tsx --run
```

Expected: `StudyAgentPanel is not defined`.

- [ ] **Step 3: Implement component**

Create `web/src/components/learning/StudyAgentPanel.tsx`:

```tsx
import React, { useCallback } from 'react'
import { Drawer, Typography, Alert } from 'antd'
import { useStudyAgent } from '../../hooks/useStudyAgent'
import { KnowledgeContextBar } from './KnowledgeContextBar'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import { FollowUpChips } from './FollowUpChips'
import styles from './StudyAgentPanel.module.css'

export interface StudyAgentPanelProps {
  open: boolean
  onClose: () => void
  knowledgePointId: string
  knowledgePointTitle: string
}

function generateStarterQuestions(title: string): string[] {
  return [
    `「${title}」的核心定义是什么？`,
    `「${title}」有哪些典型例题？`,
    `学习「${title}」时有哪些常见误区？`,
  ]
}

export const StudyAgentPanel: React.FC<StudyAgentPanelProps> = ({
  open,
  onClose,
  knowledgePointId,
  knowledgePointTitle,
}) => {
  const {
    session,
    isLoading,
    error,
    sendMessage,
    isSending,
    regenerate,
    submitFeedback,
  } = useStudyAgent(knowledgePointId, knowledgePointTitle)

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content)
    },
    [sendMessage],
  )

  const handleFollowUp = useCallback(
    async (question: string) => {
      await sendMessage(question)
    },
    [sendMessage],
  )

  const starterQuestions = generateStarterQuestions(knowledgePointTitle)
  const isNewSession = session?.messages.length === 0

  return (
    <Drawer
      title={<KnowledgeContextBar title={knowledgePointTitle} />}
      placement="right"
      width={380}
      onClose={onClose}
      open={open}
      mask={false}
      className={styles.drawer}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      <div className={styles.container}>
        {error && <Alert message={error} type="error" showIcon closable className={styles.error} />}

        <div className={styles.welcome}>
          <Typography.Text type="secondary">
            你好！我是你的 AI 学习助手。你可以问我关于「{knowledgePointTitle}」的问题。
          </Typography.Text>
          {isNewSession && !isLoading && (
            <div className={styles.starters}>
              <Typography.Text type="secondary">试试这些引导问题：</Typography.Text>
              <FollowUpChips questions={starterQuestions} onClick={handleSend} />
            </div>
          )}
        </div>

        <ChatMessageList
          messages={session?.messages ?? []}
          knowledgePointTitle={knowledgePointTitle}
          onFeedback={submitFeedback}
          onRegenerate={regenerate}
          onFollowUp={handleFollowUp}
          isLoading={isSending || isLoading}
        />

        <ChatInput onSend={handleSend} loading={isSending || isLoading} />
      </div>
    </Drawer>
  )
}
```

Create `web/src/components/learning/StudyAgentPanel.module.css`:

```css
.drawer :global(.ant-drawer-header) {
  padding: 0;
}

.drawer :global(.ant-drawer-title) {
  line-height: 1.2;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.welcome {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.starters {
  margin-top: 12px;
}

.error {
  margin: 12px 16px 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter web test -- StudyAgentPanel.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/learning/StudyAgentPanel.tsx web/src/components/learning/StudyAgentPanel.module.css web/src/components/learning/__tests__/StudyAgentPanel.test.tsx
git commit -m "feat(web): add StudyAgentPanel"
```

---

### Task 8.6: Refactor AIFab and export new components

**Files:**
- Modify: `web/src/components/learning/AIFab.tsx`
- Modify: `web/src/components/learning/AIFab.module.css`
- Modify: `web/src/components/learning/index.ts`
- Modify: `web/src/components/learning/__tests__/AIFab.test.tsx`
- Modify: `web/src/pages/LearningPage/LearningPage.tsx`

- [ ] **Step 1: Refactor AIFab**

Replace `web/src/components/learning/AIFab.tsx` with:

```tsx
import React, { useState, useCallback } from 'react'
import { Button } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import { StudyAgentPanel } from './StudyAgentPanel'
import styles from './AIFab.module.css'

export interface AIFabProps {
  knowledgePointId?: string
  knowledgePointTitle?: string
}

export const AIFab: React.FC<AIFabProps> = ({ knowledgePointId, knowledgePointTitle }) => {
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => setOpen(true), [])
  const handleClose = useCallback(() => setOpen(false), [])

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<RobotOutlined />}
        onClick={handleOpen}
        className={styles.fabButton}
        aria-label="AI 助手"
      />
      {knowledgePointId && knowledgePointTitle && (
        <StudyAgentPanel
          open={open}
          onClose={handleClose}
          knowledgePointId={knowledgePointId}
          knowledgePointTitle={knowledgePointTitle}
        />
      )}
    </>
  )
}

export default AIFab
```

- [ ] **Step 2: Update AIFab styles**

Keep `AIFab.module.css` but remove unused `.panelOverlay`, `.panel`, etc. Keep `.fabButton`.

- [ ] **Step 3: Update exports**

Modify `web/src/components/learning/index.ts` to export new components:

```typescript
export { MasteryRating } from './MasteryRating'
export type { MasteryRatingProps } from './MasteryRating'

export { LearningTimer } from './LearningTimer'
export type { LearningTimerProps } from './LearningTimer'

export { RecordHistory } from './RecordHistory'
export type { RecordHistoryProps } from './RecordHistory'

export { FeedbackPanel } from './FeedbackPanel'
export type { FeedbackPanelProps } from './FeedbackPanel'

export { AIFab } from './AIFab'
export type { AIFabProps } from './AIFab'
export { StudyAgentPanel } from './StudyAgentPanel'
export type { StudyAgentPanelProps } from './StudyAgentPanel'
export { KnowledgeContextBar } from './KnowledgeContextBar'
export type { KnowledgeContextBarProps } from './KnowledgeContextBar'
export { ChatMessageList } from './ChatMessageList'
export type { ChatMessageListProps } from './ChatMessageList'
export { ChatInput } from './ChatInput'
export type { ChatInputProps } from './ChatInput'
export { FollowUpChips } from './FollowUpChips'
export type { FollowUpChipsProps } from './FollowUpChips'
```

- [ ] **Step 4: Update AIFab tests**

Replace `web/src/components/learning/__tests__/AIFab.test.tsx` with tests that verify the new behavior:

```tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AIFab } from '../AIFab'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

vi.mock('../../../services/studyAgentApi', () => ({
  studyAgentApi: {
    createSession: vi.fn().mockResolvedValue({ id: 's1', messages: [], title: 'Title' }),
  },
}))

describe('AIFab', () => {
  it('renders floating button', () => {
    render(<AIFab knowledgePointId="kp-1" knowledgePointTitle="三角函数" />, { wrapper })
    expect(screen.getByRole('button', { name: /AI 助手/i })).toBeInTheDocument()
  })

  it('opens panel when clicked', async () => {
    render(<AIFab knowledgePointId="kp-1" knowledgePointTitle="三角函数" />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: /AI 助手/i }))
    await waitFor(() => expect(screen.getByText('三角函数')).toBeInTheDocument())
  })
})
```

- [ ] **Step 5: Verify LearningPage wiring**

Ensure `web/src/pages/LearningPage/LearningPage.tsx` already passes props to `AIFab`:

```tsx
<AIFab knowledgePointId={selectedNode?.data.id} knowledgePointTitle={selectedNode?.title} />
```

No changes needed if already present.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm --filter web test -- AIFab.test.tsx --run
```

Expected: `PASS`.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/learning/AIFab.tsx web/src/components/learning/AIFab.module.css web/src/components/learning/index.ts web/src/components/learning/__tests__/AIFab.test.tsx
git commit -m "feat(web): refactor AIFab to open StudyAgentPanel"
```

---

## Task 9: Quality Gates & Integration

### Task 9.1: Run backend tests

**Files:**
- All files above

- [ ] **Step 1: Run backend test suite**

Run:

```bash
pnpm --filter server test
```

Expected: All tests pass.

- [ ] **Step 2: Fix any failing tests**

If tests fail, fix the corresponding source or test files. Common issues:
- Prisma unique constraint name mismatch
- Mock return values missing fields
- Missing imports in tests

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(study-agent): resolve backend test failures"
```

---

### Task 9.2: Run frontend tests

**Files:**
- All web files above

- [ ] **Step 1: Run frontend test suite**

Run:

```bash
pnpm --filter web test --run
```

Expected: All tests pass (note: project has 5 pre-existing failing web tests unrelated to this change; do not fix those unless they are newly broken by this change).

- [ ] **Step 2: Fix any failing tests introduced by this change**

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(web): resolve study-agent frontend test failures"
```

---

### Task 9.3: Run typecheck and lint

**Files:**
- All files

- [ ] **Step 1: Typecheck both packages**

Run:

```bash
pnpm typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 2: Lint both packages**

Run:

```bash
pnpm lint
```

Expected: No lint errors. If auto-fixable, run `pnpm format` first.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "style: fix typecheck and lint errors"
```

---

### Task 9.4: E2E verification (manual)

**Files:**
- N/A

- [ ] **Step 1: Configure environment variables**

Add to `server/.env`:

```bash
KIMI_BASE_URL="https://api.moonshot.cn/v1"
KIMI_API_KEY="your-real-key"
KIMI_MODEL="kimi-k2-0711-preview"
```

- [ ] **Step 2: Start backend and frontend**

Terminal 1:

```bash
pnpm dev:server
```

Terminal 2:

```bash
pnpm dev
```

- [ ] **Step 3: Manual E2E checklist**

1. Log in and navigate to a knowledge point.
2. Click the AI FAB.
3. Verify the right-side Drawer opens with 380px width.
4. Verify the knowledge point title appears in the context bar.
5. Click a starter question chip.
6. Verify the user message appears and the agent responds with content and 3 follow-ups.
7. Click a follow-up chip.
8. Submit thumbs up/down on an agent message.
9. Click "重新生成" on the latest agent message.
10. Refresh the page and verify the chat history reloads.
11. Verify 503 and 429 error messages appear when the API fails or rate limit is exceeded.

- [ ] **Step 4: Commit environment template only if not sensitive**

Do not commit the real `.env` file. If you created a `server/.env.example` update, commit that.

```bash
git add server/.env.example
git commit -m "docs: add Kimi env setup notes"
```

---

## Task 10: Documentation & Archive

### Task 10.1: Update change documentation

**Files:**
- Modify: `openspec/changes/add-ai-study-agent/tasks.md` (mark tasks done)

- [ ] **Step 1: Mark OpenSpec tasks complete**

Update all `[ ]` to `[x]` in `openspec/changes/add-ai-study-agent/tasks.md` as implementation completes.

- [ ] **Step 2: Commit**

```bash
git add openspec/changes/add-ai-study-agent/tasks.md
git commit -m "docs: mark add-ai-study-agent tasks complete"
```

---

### Task 10.2: Archive OpenSpec change

**Files:**
- N/A

- [ ] **Step 1: Archive change**

Run:

```bash
openspec archive add-ai-study-agent
```

Expected: Change directory moved to `openspec/changes/archive/`.

- [ ] **Step 2: Commit archive**

```bash
git add openspec/changes/archive
git commit -m "chore: archive add-ai-study-agent change"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every requirement in `study-agent/spec.md`, `study-session/spec.md`, and `ai-study-panel/spec.md` maps to at least one task above.
- [ ] **No placeholders:** No "TBD", "TODO", "implement later", or vague steps remain in the plan.
- [ ] **Type consistency:** `StudyMessageRole`, `StudyMessageFeedback`, DTO names, and method signatures match across the backend and frontend.
- [ ] **File paths:** All paths are exact and relative to the repo root.
- [ ] **Dependencies:** `openai` package added; Prisma migration generated.
- [ ] **Security:** JWT guard on all endpoints; user scoping on all queries; rate limiting applied to message and regenerate endpoints.

## Open Questions / Risks to Resolve During Implementation

1. The `StudySessionService.upsert` uses the default Prisma unique constraint field name `userId_knowledgePointId`. Verify the exact name after migration and adjust the `where` clause if needed.
2. The `openai` SDK requires Node.js 18+ and a valid `baseURL`. If using a self-hosted or non-standard Kimi endpoint, ensure the `baseURL` ends with `/v1`.
3. The `KnowledgePoint` Prisma model already includes the `textbook` relation, so the controller can use `knowledgePoint.textbook.contentPath` as a fallback for content extraction.

---

*Plan generated for feature: add-ai-study-agent*
*Date: 2026-07-02*
