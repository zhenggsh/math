# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**知识通 (Math Learning System)** is a high school math knowledge-point learning system. It supports textbook outline browsing, knowledge-point learning with feedback tracking, and learning analytics.

This is a pnpm workspace monorepo with two packages:
- `web/` — React 19 + TypeScript + Vite frontend
- `server/` — NestJS + TypeScript backend

## Development Commands

All commands are run from the repository root:

| Task | Command |
|------|---------|
| Start web dev server | `pnpm dev` (runs Vite on port 5173) |
| Start backend dev server | `pnpm dev:server` (runs NestJS on port 3000) |
| Build both packages | `pnpm build` |
| Type check both | `pnpm typecheck` |
| Lint both | `pnpm lint` |
| Format both | `pnpm format` |
| Run all tests | `pnpm test` |

Package-specific commands (use `pnpm --filter web <cmd>` or `pnpm --filter server <cmd>`):

**Web:**
- `pnpm --filter web test` — Vitest (watch mode by default)
- `pnpm --filter web test --run` — Vitest single run
- `pnpm --filter web coverage` — Vitest with coverage
- `pnpm --filter web build` — `tsc -b && vite build`
- `pnpm --filter web lint` — ESLint

**Server:**
- `pnpm --filter server start:dev` — NestJS watch mode
- `pnpm --filter server test` — Jest
- `pnpm --filter server test:watch` — Jest watch mode
- `pnpm --filter server test -- path/to/file.spec.ts` — single test file
- `pnpm --filter server test:cov` — Jest with coverage
- `pnpm --filter server lint` — ESLint with fix
- `pnpm --filter server build` — NestJS build

**Database:**
- `pnpm --filter server prisma migrate dev` — run migrations
- `pnpm --filter server prisma generate` — regenerate client
- `pnpm --filter server prisma db seed` — seed database

## Architecture

### Frontend (`web/`)

- **Build tool:** Vite with `@vitejs/plugin-react`
- **UI framework:** Ant Design 6 via `ConfigProvider` with a custom theme (`src/styles/theme.ts`). Primary color is `#1890FF`.
- **Routing:** `react-router-dom` `BrowserRouter` in `App.tsx`. Auth routes (`/login`, `/register`) are standalone; all other routes are wrapped in `AppLayout` + `ProtectedRoute`.
- **State management:**
  - Server state: `@tanstack/react-query` with a `QueryClient` configured with 5-minute stale time (`src/main.tsx`).
  - Auth state: `AuthContext` in `src/contexts/AuthContext.tsx` — reads JWT from `localStorage`, validates on mount via `/auth/profile`.
- **API pattern:** Axios instances per domain in `src/services/`. The main `knowledgeApi.ts` instance adds `Authorization: Bearer <token>` via a request interceptor. `auth.service.ts` handles token storage/retrieval.
- **Math & diagrams:** Markdown content renders KaTeX (via `rehype-katex`) and Mermaid (via `rehype-mermaid`). Mermaid diagrams require **full-width Chinese characters** for special chars (see "Special Conventions" below).
- **Analytics charts:** ECharts wrapped in `EChartsWrapper.tsx`.

### Backend (`server/`)

- **Framework:** NestJS with modular architecture. Entry point: `src/main.ts`. Swagger docs served at `/api`.
- **CORS:** Pre-configured for `localhost:5173` and `localhost:4173`.
- **Auth:** JWT-based (`@nestjs/jwt` + `passport-jwt`). Guards: `JwtAuthGuard` + `RolesGuard`. Decorators: `@Roles(Role.STUDENT | TEACHER | ADMIN)` and `@CurrentUser()`.
- **Database access:** Global `PrismaModule` exporting `PrismaService`. All modules import it implicitly.
- **Domain modules** (under `src/modules/`):
  - `auth` — login/register/JWT
  - `textbook` — file upload, xlsx/csv parsing, knowledge-point CRUD
  - `learning` — `LearningRecord` creation and querying
  - `smart-learning` — weak-point detection, importance-based learning, random mode
  - `analytics` — student/teacher analytics and export
- **Response format:** Controllers wrap responses in `{ success: boolean, data: T }`.

### Data Model

PostgreSQL with Prisma ORM. Four core entities:

| Entity | Storage | Key fields |
|--------|---------|------------|
| `User` | PostgreSQL | `email`, `passwordHash`, `name`, `role` (STUDENT/TEACHER/ADMIN) |
| `Textbook` | PostgreSQL + filesystem | `fileName`, `frameworkPath` (xlsx/csv), `contentPath` (md) |
| `KnowledgePoint` | PostgreSQL | `code` (e.g. 1.1.1), `level1/2/3`, `importanceLevel` (A/B/C), `textbookId` |
| `LearningRecord` | PostgreSQL | `userId`, `knowledgePointId`, `startTime`, `durationMinutes`, `masteryLevel` (A-E) |

**File-based knowledge base:** Static content lives in `iksm/` (IKSM = Intelligent Knowledge System for Math). A textbook consists of a framework file (`{name}.xlsx` or `{name}.csv`) plus an optional content file (`{name}.md`). The `textbook` module parses these into `KnowledgePoint` rows. Files starting with `.`, `_`, or `tmp` are ignored.

**Parser behavior (`TextbookParserService`):**
- XLSX: iterates all sheets, picks the first sheet containing valid knowledge framework data (detected by `a.b.c` style codes or level1+level3 columns).
- CSV: standard header-based parsing.
- Empty level1/level2 cells inherit from the previous row (Excel merge-cell semantics).
- Missing codes are auto-generated as `l1.l2.l3`.

## Important Conventions

### Code Style (enforced)

- **TypeScript:** `strict: true`, `noImplicitAny: true`. Explicit return types on public functions. No `any` (documented exceptions only).
- **React:** Function components only. Every component must have a Props interface.
- **Naming:**
  - Components: PascalCase (`UserProfile.tsx`)
  - Utils/hooks: camelCase (`useAuth.ts`)
  - Types: PascalCase + `.types.ts` (`auth.types.ts`)
  - Constants: UPPER_SNAKE_CASE
  - DB tables: snake_case plural (`users`, `knowledge_points`)
- **Lint/Format:** ESLint + Prettier. Run `pnpm lint` and `pnpm format` before finishing.

### Mermaid Escape Rule

In Markdown content files (`iksm/*.md`), Mermaid diagram text must use **full-width Chinese characters** instead of ASCII special characters:
- `'` → `'` (full-width single quote)
- `"` → `"` (full-width double quote)
- `()` → `（）` (full-width parentheses)
- `[]` → `［］` (full-width brackets)

### Quality Gates

Before finishing any change:
- `pnpm typecheck` passes with zero errors
- No `console.log` or `debugger` statements
- No unused imports/variables
- All functions have return types; all React components have Props interfaces
- ESLint + Prettier pass (`pnpm lint`)
- Tests pass (`pnpm test`)

## OpenSpec Workflow

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for structured change management. The project has active OpenSpec skills in `.agents/skills/`.

Always check for active changes first:
```bash
openspec list --json
```

If there is an active change, read its `proposal.md`, `design.md`, and `tasks.md` before editing code.

**When to use OpenSpec:**
- Small refactor / new component → `openspec-propose`
- New feature → `openspec-propose` full flow
- Database schema change → `openspec-propose`
- Typo fix / style tweak → direct edit, no OpenSpec needed

**Change naming:** kebab-case, pattern `<action>-<object>-<description>` (e.g. `add-user-authentication`).

## Key Files for Orientation

| Purpose | Path |
|---------|------|
| Prisma schema | `server/prisma/schema.prisma` |
| Backend entry | `server/src/main.ts` |
| Backend modules root | `server/src/app.module.ts` |
| Frontend entry | `web/src/main.tsx` |
| Frontend routes | `web/src/App.tsx` |
| API client (authenticated) | `web/src/services/knowledgeApi.ts` |
| Auth context | `web/src/contexts/AuthContext.tsx` |
| Ant Design theme | `web/src/styles/theme.ts` |
| Knowledge parser | `server/src/modules/textbook/textbook-parser.service.ts` |
| Project rules (code gen) | `.agents/skills/project-rule/SKILL.md` |
| Project constitution | `openspec/constitution.md` |
| Requirements & data spec | `doc/prompt/project_target.md`, `doc/prompt/iksm_hierichy.md` |
