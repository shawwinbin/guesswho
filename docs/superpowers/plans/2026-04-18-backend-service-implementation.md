# Backend Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone backend service for the history figure guessing game, persist sessions in PostgreSQL, and migrate the frontend to use only this backend AI mode.

**Architecture:** Add a new TypeScript backend service under a dedicated `server/` workspace directory in this repo, expose a narrow game-specific REST API, persist session snapshots and event history in PostgreSQL, and route all model access through a server-side OpenAI-compatible client. Update the frontend to remove direct model configuration and use the backend session endpoints instead.

**Tech Stack:** Node.js, TypeScript, Fastify, PostgreSQL, runtime schema validation, Vitest, Vite frontend

---

## File Structure

### Existing files to modify

- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/lib/useGameSession.ts`
- Modify: `src/lib/llmClient.ts`

### New backend files

- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/.env.example`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Create: `server/src/config/env.ts`
- Create: `server/src/db/pool.ts`
- Create: `server/src/db/migrations/001_init.sql`
- Create: `server/src/routes/gameSessions.ts`
- Create: `server/src/schemas/gameSessionSchemas.ts`
- Create: `server/src/services/gameSessionService.ts`
- Create: `server/src/services/hostLlmService.ts`
- Create: `server/src/repositories/gameSessionRepository.ts`
- Create: `server/src/repositories/gameEventRepository.ts`
- Create: `server/src/lib/errors.ts`
- Create: `server/src/lib/normalization.ts`
- Create: `server/src/test/helpers.ts`
- Create: `server/src/services/gameSessionService.test.ts`
- Create: `server/src/services/hostLlmService.test.ts`
- Create: `server/src/routes/gameSessions.test.ts`

### New frontend support files

- Create: `src/lib/apiClient.ts`
- Create: `src/lib/gameApi.ts`
- Create: `src/lib/gameApi.test.ts`

## Task 1: Scaffold Backend Workspace

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `server/src/routes/gameSessions.test.ts` with a minimal app boot test that imports `buildApp()` from `server/src/app.ts` and expects the app instance to exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- --run src/routes/gameSessions.test.ts`
Expected: FAIL because backend files do not exist yet.

- [ ] **Step 3: Write minimal backend scaffolding**

Add:
- `server/package.json` with `dev`, `build`, `test` scripts
- `server/tsconfig.json`
- `server/vitest.config.ts`
- `server/src/app.ts` exporting a Fastify app builder
- `server/src/server.ts` starting the server

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- --run src/routes/gameSessions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/vitest.config.ts server/src/app.ts server/src/server.ts server/src/routes/gameSessions.test.ts
git commit -m "feat: scaffold backend service workspace"
```

## Task 2: Add Environment and Database Bootstrap

**Files:**
- Create: `server/.env.example`
- Create: `server/src/config/env.ts`
- Create: `server/src/db/pool.ts`
- Create: `server/src/db/migrations/001_init.sql`
- Test: `server/src/services/gameSessionService.test.ts`

- [ ] **Step 1: Write the failing database bootstrap test**

Create a test in `server/src/services/gameSessionService.test.ts` asserting the service can be constructed with a repository layer and expected config shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: FAIL because env/db modules are missing.

- [ ] **Step 3: Add env and PostgreSQL bootstrap**

Implement:
- env parsing for `PORT`, `DATABASE_URL`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `CORS_ORIGIN`
- PostgreSQL pool creation
- initial migration SQL for `game_sessions` and `game_events`
- `.env.example` with all required variables

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: PASS for bootstrap-level construction

- [ ] **Step 5: Commit**

```bash
git add server/.env.example server/src/config/env.ts server/src/db/pool.ts server/src/db/migrations/001_init.sql server/src/services/gameSessionService.test.ts
git commit -m "feat: add backend env and database bootstrap"
```

## Task 3: Implement Persistence Repositories

**Files:**
- Create: `server/src/repositories/gameSessionRepository.ts`
- Create: `server/src/repositories/gameEventRepository.ts`
- Modify: `server/src/services/gameSessionService.test.ts`

- [ ] **Step 1: Write failing repository-backed service tests**

Extend `server/src/services/gameSessionService.test.ts` with tests for:
- creating a session snapshot
- appending question events
- appending guess events
- loading a session snapshot

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: FAIL because repository implementations do not exist.

- [ ] **Step 3: Implement repositories**

Add repository methods for:
- `createSession`
- `updateSessionAfterQuestion`
- `updateSessionAfterGuess`
- `findSessionById`
- `appendQuestionEvent`
- `appendGuessEvent`
- `listSessionEvents`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/gameSessionRepository.ts server/src/repositories/gameEventRepository.ts server/src/services/gameSessionService.test.ts
git commit -m "feat: add game session persistence repositories"
```

## Task 4: Implement Host LLM Service

**Files:**
- Create: `server/src/services/hostLlmService.ts`
- Create: `server/src/lib/normalization.ts`
- Create: `server/src/services/hostLlmService.test.ts`

- [ ] **Step 1: Write failing LLM service tests**

Add tests for:
- start-round JSON parsing
- question normalization to `是/不是`
- guess verdict parsing
- malformed upstream response fallback behavior

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- --run src/services/hostLlmService.test.ts`
Expected: FAIL because service files do not exist.

- [ ] **Step 3: Implement host LLM service**

Implement:
- upstream OpenAI-compatible HTTP call helper
- start-round prompt builder
- ask-question prompt builder
- judge-guess prompt builder
- strict response normalization

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test -- --run src/services/hostLlmService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/hostLlmService.ts server/src/lib/normalization.ts server/src/services/hostLlmService.test.ts
git commit -m "feat: add host llm service"
```

## Task 5: Implement Game Session Service

**Files:**
- Create: `server/src/services/gameSessionService.ts`
- Create: `server/src/lib/errors.ts`
- Modify: `server/src/services/gameSessionService.test.ts`

- [ ] **Step 1: Write failing state-transition tests**

Add tests for:
- create session
- ask question during play
- end session when question limit is exhausted
- submit final guess
- reject question after session end

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: FAIL because orchestration logic is missing.

- [ ] **Step 3: Implement service orchestration**

Implement `gameSessionService` using repositories and `hostLlmService`:
- create session
- get session snapshot
- submit question
- submit guess
- derive remaining count and terminal state

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test -- --run src/services/gameSessionService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/gameSessionService.ts server/src/lib/errors.ts server/src/services/gameSessionService.test.ts
git commit -m "feat: add game session service"
```

## Task 6: Add HTTP Schemas and Routes

**Files:**
- Create: `server/src/schemas/gameSessionSchemas.ts`
- Create: `server/src/routes/gameSessions.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/routes/gameSessions.test.ts`

- [ ] **Step 1: Write failing route tests**

Add route tests for:
- `POST /v1/game-sessions`
- `GET /v1/game-sessions/:sessionId`
- `POST /v1/game-sessions/:sessionId/questions`
- `POST /v1/game-sessions/:sessionId/guesses`
- validation and not-found cases

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npm test -- --run src/routes/gameSessions.test.ts`
Expected: FAIL because routes are not wired.

- [ ] **Step 3: Implement schemas and routes**

Add request/response schemas and wire routes into `buildApp()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test -- --run src/routes/gameSessions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/gameSessionSchemas.ts server/src/routes/gameSessions.ts server/src/app.ts server/src/routes/gameSessions.test.ts
git commit -m "feat: add backend game session routes"
```

## Task 7: Add Frontend API Client

**Files:**
- Create: `src/lib/apiClient.ts`
- Create: `src/lib/gameApi.ts`
- Create: `src/lib/gameApi.test.ts`

- [ ] **Step 1: Write failing frontend API tests**

Add tests for:
- create session request
- fetch session snapshot
- submit question
- submit guess

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/lib/gameApi.test.ts`
Expected: FAIL because frontend API layer does not exist.

- [ ] **Step 3: Implement frontend API layer**

Add:
- base fetch wrapper in `apiClient.ts`
- game-specific API methods in `gameApi.ts`
- environment-driven API base URL support

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/lib/gameApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/apiClient.ts src/lib/gameApi.ts src/lib/gameApi.test.ts
git commit -m "feat: add frontend backend-api client"
```

## Task 8: Migrate Frontend Session Flow to Backend

**Files:**
- Modify: `src/lib/useGameSession.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing frontend flow tests**

Add or update tests asserting:
- app starts a session through backend API
- asking questions uses backend API
- final guess uses backend API
- refresh/reload-friendly session restore path is possible through backend snapshot API

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/App.test.tsx src/lib/useGameSession.test.ts`
Expected: FAIL because frontend still uses direct round driver behavior.

- [ ] **Step 3: Update frontend game session hook**

Replace direct game engine behavior with backend API calls while keeping UI state flow consistent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/App.test.tsx src/lib/useGameSession.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/useGameSession.ts src/App.tsx src/App.test.tsx
git commit -m "feat: migrate frontend game flow to backend sessions"
```

## Task 9: Remove User-Facing Direct Model Configuration

**Files:**
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/lib/llmClient.ts`
- Modify: `src/App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Write failing UI expectation tests**

Update tests to assert:
- no API key/base URL/model inputs are shown
- no local-vs-llm toggle is shown
- frontend presents only backend-driven game flow

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because old configuration UI still exists.

- [ ] **Step 3: Remove obsolete frontend config paths**

Remove:
- browser-side model credential handling
- direct LLM mode toggle
- local mode user entry point

Update README to document backend setup and frontend environment variables.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsPanel.tsx src/lib/llmClient.ts src/App.tsx README.md
git commit -m "feat: remove direct frontend model configuration"
```

## Task 10: Full Verification

**Files:**
- Modify as needed based on verification findings

- [ ] **Step 1: Run backend tests**

Run: `cd server && npm test -- --run`
Expected: PASS

- [ ] **Step 2: Run frontend tests**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 3: Run backend build**

Run: `cd server && npm run build`
Expected: PASS

- [ ] **Step 4: Run frontend build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Manual smoke check**

Run backend locally, run frontend locally, create a session, ask at least one question, submit a guess, and verify data is persisted in PostgreSQL.

- [ ] **Step 6: Commit final fixes**

```bash
git add .
git commit -m "feat: add backend ai game service"
```
