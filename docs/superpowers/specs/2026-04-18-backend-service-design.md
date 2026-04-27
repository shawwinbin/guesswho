# History Figure Guess Backend Service Design

**Goal:** Add a standalone backend service that is the only AI game engine for the project, persists game sessions in PostgreSQL, and proxies all model interaction through a server-side OpenAI-compatible integration.

**Scope:** This service only supports the "history figure guess" product flow. It is not intended to be a general-purpose LLM gateway.

## Objectives

- Remove direct browser-to-model calls and browser-side API key handling.
- Replace the current dual-mode frontend with a backend-only AI-hosted game flow.
- Persist sessions and event history in PostgreSQL so a user can refresh and resume a round.
- Keep the backend API narrow and game-specific.

## Architecture

The system will consist of:

1. A standalone Node.js + TypeScript backend service.
2. The existing frontend, updated to call only this backend.
3. PostgreSQL for session and event persistence.
4. An OpenAI-compatible upstream model endpoint configured only on the backend.

High-level request flow:

1. Frontend creates a session via backend.
2. Backend asks the model to secretly choose a figure and stores the session snapshot.
3. Frontend sends questions and guesses to backend.
4. Backend loads the session, calls the model when needed, records results, and returns normalized game responses.
5. Frontend renders state from backend responses and can restore a session by `sessionId`.

## Backend Stack

- Runtime: Node.js
- Language: TypeScript
- HTTP framework: Fastify
- Database: PostgreSQL
- Database access: a lightweight PostgreSQL library or query builder, chosen during implementation
- Validation: runtime request/response schema validation
- Model integration: OpenAI-compatible HTTP API

## Service Responsibilities

The backend service is responsible for:

- Creating and restoring game sessions
- Choosing and persisting the hidden historical figure
- Sending prompts to the model
- Normalizing model responses to game-safe outputs
- Enforcing question limits and session state transitions
- Persisting question and guess history
- Hiding upstream credentials and model configuration from the frontend

The frontend remains responsible for:

- Rendering the game UI
- Managing client-side form/input state
- Calling backend endpoints
- Displaying history, counters, and result screens

## API Design

### `POST /v1/game-sessions`

Creates a new round.

**Request**

```json
{
  "questionLimit": 20
}
```

`questionLimit` may be optional if the backend should own the default.

**Response**

```json
{
  "sessionId": "uuid",
  "status": "playing",
  "questionCount": 0,
  "questionLimit": 20,
  "remainingQuestions": 20
}
```

### `GET /v1/game-sessions/:sessionId`

Returns the current snapshot so the frontend can restore the round.

**Response**

```json
{
  "sessionId": "uuid",
  "status": "playing",
  "questionCount": 2,
  "questionLimit": 20,
  "remainingQuestions": 18,
  "history": [
    { "question": "他是皇帝吗？", "answer": "是" }
  ],
  "guesses": []
}
```

If the session has ended, include `revealedName`.

### `POST /v1/game-sessions/:sessionId/questions`

Submits a yes/no question.

**Request**

```json
{
  "question": "他是唐朝的人吗？"
}
```

**Response**

```json
{
  "answer": "不是",
  "status": "playing",
  "questionCount": 3,
  "questionLimit": 20,
  "remainingQuestions": 17
}
```

If the question limit is exhausted, return:

```json
{
  "answer": "不是",
  "status": "ended",
  "questionCount": 20,
  "questionLimit": 20,
  "remainingQuestions": 0,
  "revealedName": "李白"
}
```

### `POST /v1/game-sessions/:sessionId/guesses`

Submits the final guess.

**Request**

```json
{
  "guess": "杜甫"
}
```

**Response**

```json
{
  "isCorrect": false,
  "revealedName": "李白",
  "status": "ended"
}
```

## Data Model

### Table: `game_sessions`

Stores the latest session snapshot.

Suggested columns:

- `id UUID PRIMARY KEY`
- `status TEXT NOT NULL`
- `question_limit INTEGER NOT NULL`
- `question_count INTEGER NOT NULL DEFAULT 0`
- `secret_figure_name TEXT NOT NULL`
- `secret_figure_aliases JSONB`
- `secret_figure_era TEXT`
- `revealed_name TEXT`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

### Table: `game_events`

Stores the event stream for replay, audit, and future analytics.

Suggested columns:

- `id UUID PRIMARY KEY`
- `session_id UUID NOT NULL REFERENCES game_sessions(id)`
- `event_type TEXT NOT NULL`
- `question_text TEXT`
- `answer_text TEXT`
- `guess_text TEXT`
- `is_correct BOOLEAN`
- `created_at TIMESTAMPTZ NOT NULL`

Recommended `event_type` values:

- `question`
- `guess`
- `system`

This split gives fast reads from `game_sessions` and full history from `game_events`.

## Backend Module Structure

Recommended internal layout:

```text
src/
  app.ts
  server.ts
  config/
    env.ts
  db/
    pool.ts
    migrations/
  routes/
    gameSessions.ts
  schemas/
    gameSessionSchemas.ts
  services/
    gameSessionService.ts
    hostLlmService.ts
  repositories/
    gameSessionRepository.ts
    gameEventRepository.ts
  lib/
    responseNormalization.ts
    errors.ts
```

Layer responsibilities:

- `routes`: HTTP wiring, schema validation, response shaping
- `services/gameSessionService`: game state transitions and orchestration
- `services/hostLlmService`: OpenAI-compatible prompt execution and normalization
- `repositories`: PostgreSQL persistence
- `lib`: reusable normalization and domain helpers

## Model Integration Design

The backend uses fixed environment-based model configuration:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

The service sends three kinds of prompts:

1. Start round: choose a hidden figure and return JSON
2. Answer question: return only `是` or `不是`
3. Judge guess: return final JSON verdict

The backend must normalize and validate model outputs before returning them to the frontend.

### Normalization Rules

- Question answers are normalized to exactly `是` or `不是`
- Invalid or ambiguous question responses fall back conservatively to `不是`
- Guess verdict JSON must be parsed strictly
- If final verdict parsing fails, backend may fall back to the persisted secret figure for a conservative result

## Session Rules

- New sessions start in `playing`
- Question count increments on each accepted question
- If `question_count >= question_limit`, session transitions to `ended`
- Any guess transitions the session to `ended`
- Ended sessions reject further question submissions
- Session restoration returns a stable snapshot derived from persisted data

## Error Handling

### Client Errors

- `400 Bad Request`
  - empty question
  - empty guess
  - invalid payload shape
  - question submitted after session ended

- `404 Not Found`
  - session does not exist

### Upstream/Server Errors

- `502 Bad Gateway`
  - upstream model error
  - model response malformed

- `503 Service Unavailable`
  - database unavailable
  - service not ready

Responses should return structured JSON error bodies, for example:

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session does not exist"
  }
}
```

## Frontend Migration

Frontend changes required:

- Remove user-facing API key, base URL, and model settings
- Remove "local mode" as a runtime user option
- Replace direct LLM client usage with backend API client calls
- Keep existing UI flow where practical:
  - start screen
  - question submission
  - final guess submission
  - history display
  - result display

The frontend should persist only `sessionId` client-side if session restoration is needed after refresh.

## Security

- Upstream model credentials live only in backend environment variables
- CORS should be explicitly configured for the frontend origin
- Request bodies should be schema-validated
- Basic rate limiting should be considered, especially on session creation and question endpoints
- No secret figure details should ever be returned before the round ends

## Testing Strategy

### Unit Tests

- response normalization
- prompt result parsing
- question limit transitions
- fallback behavior on malformed model responses

### Service Tests

- create session -> ask question -> ask until limit -> session ends
- create session -> guess correctly/incorrectly -> session ends
- ended session rejects more questions

### HTTP/Integration Tests

- request validation
- error responses
- session restoration payload

### Database Integration Tests

- repository CRUD behavior
- event persistence after question/guess submissions

Model integration should be mocked in tests. PostgreSQL integration should use a test database or isolated environment.

## Implementation Notes

- Keep the backend API intentionally narrow and game-specific
- Prefer deterministic service-layer behavior even when the model behaves poorly
- Treat the database snapshot as the source of truth for session status
- Preserve enough history in `game_events` to debug inconsistent model behavior later

## Recommended Next Step

Write a concrete implementation plan for:

1. Scaffolding the standalone backend service
2. Adding PostgreSQL schema and migrations
3. Implementing the session/game services
4. Wiring frontend to backend
5. Removing old direct-to-model frontend configuration
