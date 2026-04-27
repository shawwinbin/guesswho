# Infinite Level Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an infinite level progression system to the Taro game so players challenge one level per round, resume from the highest unlocked level after a loss, and face harder figure pools as levels rise.

**Architecture:** Keep round state and career progression state separate. The Taro app stores level progression locally and threads the active `level` through page navigation and session creation. The server accepts `level`, maps it to figure difficulty, and selects figures from the matching pool while preserving the existing session/question/guess flow.

**Tech Stack:** Taro 4 + React 18 + TypeScript + Sass, local storage via `Taro.*StorageSync`, Fastify + TypeScript on the server, Vitest for frontend and server tests.

---

## File Structure

### Frontend files

- Modify: `src-taro/lib/types/game.ts`
  - Add level-aware request/response types and level progression model types.
- Modify: `src-taro/lib/types/index.ts`
  - Re-export the new types.
- Modify: `src-taro/lib/storage.ts`
  - Reuse for level-progress persistence helpers or keep generic access for a new level module.
- Create: `src-taro/lib/levelProgress.ts`
  - Single responsibility: default progress, read/write/update helpers, badge/title mapping, unlocked-window helpers for the level ribbon.
- Create: `src-taro/lib/levelProgress.test.ts`
  - Unit tests for progression transitions, damaged-storage fallback, and level-title mapping.
- Modify: `src-taro/lib/gameApi.ts`
  - Send `level` in create-session requests and type returned level fields.
- Modify: `src-taro/hooks/useGameSession.ts`
  - Track `level` as part of the active round and preserve it when restoring a session.
- Modify: `src-taro/pages/index/index.tsx`
  - Replace the simple start CTA with resume-level CTA, progress summary, and horizontal level ribbon.
- Modify: `src-taro/pages/index/index.scss`
  - Style the level ribbon, states, and updated CTA hierarchy.
- Modify: `src-taro/pages/game/game.tsx`
  - Display `LEVEL N`, difficulty title, round target hint, and “next unlock” copy.
- Modify: `src-taro/pages/game/game.scss`
  - Add level HUD styling without breaking the existing Stitch-like layout.
- Modify: `src-taro/pages/result/result.tsx`
  - Update progression on win/loss, render unlocked/retained-level messaging, and drive result CTA labels.
- Modify: `src-taro/pages/result/result.scss`
  - Style level result banners and the compact result ribbon.
- Modify: `src-taro/pages/settings/settings.tsx`
  - Ensure “clear cache” and “reset data” semantics for level progress are explicit.
- Create: `src-taro/pages/index/index.levels.test.tsx`
  - Page-level tests for level ribbon states and CTA text.
- Create: `src-taro/pages/result/result.levels.test.tsx`
  - Page-level tests for win/loss progression messaging.

### Server files

- Modify: `server/src/types/figure.ts`
  - Add `difficulty` to the figure type.
- Modify: `server/src/data/figures.ts`
  - Annotate every figure with `difficulty`.
- Modify: `server/src/schemas/gameSessionSchemas.ts`
  - Accept and validate `level` in create-session requests.
- Modify: `server/src/services/gameSessionService.ts`
  - Thread `level` through session creation and snapshots.
- Modify: `server/src/lib/figureCatalog.ts`
  - Add difficulty filtering and level-to-difficulty mapping helpers.
- Modify: `server/src/lib/figureCatalog.test.ts`
  - Test difficulty selection, fallback behavior, and deterministic random selection.
- Modify: `server/src/services/gameSessionService.test.ts`
  - Cover create-session with level metadata.
- Modify: `server/src/repositories/gameSessionRepository.ts`
  - Persist and hydrate `level` on sessions so restored snapshots retain the active level.
- Modify: `server/src/routes/gameSessions.ts`
  - Ensure route handlers pass `level` through unchanged.
- Modify: `server/src/db/runMigrations.ts`
  - Register the new session-level migration in the existing migration runner.
- Create: `server/src/db/migrations/002_add_game_session_level.sql`
  - Add a `level` column to `game_sessions` and backfill existing rows to `1`.

### Migration / storage files

- The server must persist `level` in `game_sessions`. Restored session snapshots are rebuilt from repository records, so an in-memory-only approach would break session restore and violate the approved spec.

## Task 1: Add Level Domain Types And Local Progress Helpers

**Files:**
- Modify: `src-taro/lib/types/game.ts`
- Modify: `src-taro/lib/types/index.ts`
- Create: `src-taro/lib/levelProgress.ts`
- Create: `src-taro/lib/levelProgress.test.ts`

- [ ] **Step 1: Write the failing level-progress tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  createDefaultLevelProgress,
  applyLevelResult,
  getLevelTitle,
} from './levelProgress'

describe('levelProgress', () => {
  it('advances to the next level after a win', () => {
    const next = applyLevelResult(
      { currentLevel: 3, highestUnlockedLevel: 3, highestClearedLevel: 2, levelStreak: 1, lastResult: null },
      'win'
    )

    expect(next.currentLevel).toBe(4)
    expect(next.highestUnlockedLevel).toBe(4)
    expect(next.highestClearedLevel).toBe(3)
    expect(next.levelStreak).toBe(2)
    expect(next.lastResult).toBe('win')
  })

  it('keeps the highest unlocked level after a loss', () => {
    const next = applyLevelResult(
      { currentLevel: 6, highestUnlockedLevel: 6, highestClearedLevel: 5, levelStreak: 3, lastResult: 'win' },
      'lose'
    )

    expect(next.currentLevel).toBe(6)
    expect(next.highestUnlockedLevel).toBe(6)
    expect(next.highestClearedLevel).toBe(5)
    expect(next.levelStreak).toBe(0)
    expect(next.lastResult).toBe('lose')
  })

  it('maps level ranges to display titles', () => {
    expect(getLevelTitle(1)).toBe('入门')
    expect(getLevelTitle(5)).toBe('熟手')
    expect(getLevelTitle(8)).toBe('名士')
    expect(getLevelTitle(12)).toBe('国士')
    expect(getLevelTitle(18)).toBe('传奇')
  })

  it('creates sane defaults', () => {
    expect(createDefaultLevelProgress()).toEqual({
      currentLevel: 1,
      highestUnlockedLevel: 1,
      highestClearedLevel: 0,
      levelStreak: 0,
      lastResult: null,
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src-taro/lib/levelProgress.test.ts`

Expected: FAIL because `src-taro/lib/levelProgress.ts` does not exist yet.

- [ ] **Step 3: Add the new types in `src-taro/lib/types/game.ts`**

Add:

```ts
export interface LevelProgress {
  currentLevel: number
  highestUnlockedLevel: number
  highestClearedLevel: number
  levelStreak: number
  lastResult: 'win' | 'lose' | null
}

export interface CreateSessionRequest {
  questionLimit: number
  figureScope: FigureScope
  level: number
}
```

Also extend `GameSessionSnapshot` to expose `level`.

- [ ] **Step 4: Implement `src-taro/lib/levelProgress.ts`**

Implement:

```ts
const LEVEL_PROGRESS_KEY = 'history-figure-guess-level-progress'

export function createDefaultLevelProgress(): LevelProgress { ... }
export function readLevelProgress(): LevelProgress { ... }
export function writeLevelProgress(progress: LevelProgress): void { ... }
export function setCurrentLevel(level: number): LevelProgress { ... }
export function applyLevelResult(progress: LevelProgress, result: 'win' | 'lose'): LevelProgress { ... }
export function getLevelTitle(level: number): string { ... }
export function getLevelHint(level: number): string { ... }
export function buildVisibleLevels(progress: LevelProgress, radius = 3): number[] { ... }
```

Use `storage.get`/`storage.set` and fall back to defaults if data is malformed.

- [ ] **Step 5: Re-export the new types**

Update `src-taro/lib/types/index.ts` so page code can import `LevelProgress` and level-aware request/snapshot types from the existing barrel file.

- [ ] **Step 6: Run the tests again**

Run: `npm test -- --run src-taro/lib/levelProgress.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-taro/lib/types/game.ts src-taro/lib/types/index.ts src-taro/lib/levelProgress.ts src-taro/lib/levelProgress.test.ts
git commit -m "feat: add level progression domain helpers"
```

## Task 2: Thread Level Through Frontend Session Creation

**Files:**
- Modify: `src-taro/lib/gameApi.ts`
- Modify: `src-taro/hooks/useGameSession.ts`
- Create: `src-taro/hooks/useGameSession.levels.test.ts`

- [ ] **Step 1: Write the failing level-aware session test**

```ts
it('passes level when creating a session', async () => {
  const requestSpy = vi.spyOn(api, 'createSession').mockResolvedValue({
    sessionId: 'session-1',
    status: 'playing',
    questionCount: 0,
    questionLimit: 20,
    remainingQuestions: 20,
    history: [],
    guesses: [],
    level: 7,
  })

  await result.current.startGame(7)

  expect(requestSpy).toHaveBeenCalledWith({
    questionLimit: 20,
    figureScope: 'all',
    level: 7,
  })
})

it('falls back to local progress when a restored legacy session omits level', async () => {
  storage.set('history-figure-guess-level-progress', {
    currentLevel: 4,
    highestUnlockedLevel: 4,
    highestClearedLevel: 3,
    levelStreak: 0,
    lastResult: 'lose',
  })

  vi.mocked(api.fetchSession).mockResolvedValue({
    sessionId: 'session-1',
    status: 'playing',
    questionCount: 1,
    questionLimit: 20,
    remainingQuestions: 19,
    history: [],
    guesses: [],
  })

  renderHook(() => useGameSession(settings))

  await waitFor(() => {
    expect(result.current.state.level).toBe(4)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src-taro/hooks/useGameSession.levels.test.ts`

Expected: FAIL because `startGame` does not accept a level argument yet.

- [ ] **Step 3: Update `src-taro/lib/gameApi.ts`**

Ensure `createSession` sends:

```ts
{
  questionLimit,
  figureScope,
  level,
}
```

No conditional omission.

- [ ] **Step 4: Update `src-taro/hooks/useGameSession.ts`**

Adjust:

- `GameState` to include `level: number | null`
- `applySnapshot(snapshot)` to copy `snapshot.level`
- `startGame(level: number)` signature to require level
- `restart(levelOverride?: number)` so game-page restarts can preserve the active level
- restore fallback: if `snapshot.level` is missing for a legacy or malformed session, use the locally selected `currentLevel` from level-progress storage, and fall back again to `1` if local progress is unavailable

- [ ] **Step 5: Run the targeted hook test**

Run: `npm test -- --run src-taro/hooks/useGameSession.levels.test.ts`

Expected: PASS

- [ ] **Step 6: Run frontend validation through the Taro build**

Run: `npm run taro:build:h5`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-taro/lib/gameApi.ts src-taro/hooks/useGameSession.ts src-taro/hooks/useGameSession.levels.test.ts
git commit -m "feat: pass active level through game sessions"
```

## Task 3: Add Difficulty Metadata And Level-Based Figure Selection On The Server

**Files:**
- Modify: `server/src/types/figure.ts`
- Modify: `server/src/data/figures.ts`
- Modify: `server/src/lib/figureCatalog.ts`
- Modify: `server/src/lib/figureCatalog.test.ts`

- [ ] **Step 1: Write the failing server figure-catalog tests**

```ts
it('maps low levels to easy figures', () => {
  const candidates = filterFiguresByScopeAndLevel('all', 1)
  expect(candidates.every(figure => figure.difficulty === 1)).toBe(true)
})

it('falls back to lower difficulty if the target pool is empty', () => {
  const candidates = filterFiguresByScopeAndLevel('female', 20)
  expect(candidates.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run server:test -- --run server/src/lib/figureCatalog.test.ts`

Expected: FAIL because `difficulty` and level-aware helpers do not exist.

- [ ] **Step 3: Add `difficulty` to `server/src/types/figure.ts`**

Add:

```ts
difficulty: 1 | 2 | 3 | 4 | 5
```

- [ ] **Step 4: Annotate figures in `server/src/data/figures.ts`**

Add `difficulty` for every record. Keep the initial pass explicit and manual. Do not infer difficulty at runtime.

- [ ] **Step 5: Implement level-based selection in `server/src/lib/figureCatalog.ts`**

Add:

```ts
export function getDifficultyForLevel(level: number): 1 | 2 | 3 | 4 | 5 { ... }
export function filterFiguresByScopeAndLevel(scope: FigureScope, level: number): HistoricalFigure[] { ... }
export function selectRandomFigure(scope: FigureScope, level = 1): HistoricalFigure { ... }
```

Rules:

- `1-3 -> 1`
- `4-6 -> 2`
- `7-10 -> 3`
- `11-15 -> 4`
- `16+ -> 5`

If the exact target pool is empty, fall back to the nearest lower available difficulty in the same scope.

- [ ] **Step 6: Update and run the server tests**

Run: `npm run server:test -- --run server/src/lib/figureCatalog.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/types/figure.ts server/src/data/figures.ts server/src/lib/figureCatalog.ts server/src/lib/figureCatalog.test.ts
git commit -m "feat: add level-based figure difficulty selection"
```

## Task 4: Extend The Create-Session Contract With Level

**Files:**
- Modify: `server/src/schemas/gameSessionSchemas.ts`
- Modify: `server/src/services/gameSessionService.ts`
- Modify: `server/src/services/gameSessionService.test.ts`
- Modify: `server/src/routes/gameSessions.ts`
- Modify: `server/src/repositories/gameSessionRepository.ts`
- Modify: `server/src/db/runMigrations.ts`
- Create: `server/src/db/migrations/002_add_game_session_level.sql`

- [ ] **Step 1: Write the failing create-session service test**

```ts
it('creates a session for the requested level', async () => {
  const snapshot = await service.createSession({
    questionLimit: 20,
    figureScope: 'all',
    level: 8,
  })

  expect(snapshot.level).toBe(8)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run server:test -- --run server/src/services/gameSessionService.test.ts`

Expected: FAIL because `level` is not accepted or returned.

- [ ] **Step 3: Update the request schema**

In `server/src/schemas/gameSessionSchemas.ts`, validate:

```ts
if (!Number.isInteger(level) || level < 1) {
  throw badRequest('level 必须是大于等于 1 的整数')
}
```

- [ ] **Step 4: Update the service contract**

In `server/src/services/gameSessionService.ts`:

- accept `level`
- call `selectRandomFigure(input.figureScope, input.level)`
- include `level` in the snapshot

Also:

- add `level` to `CreateSessionInput`, `GameSessionRecord`, and `GameSessionSnapshot`
- persist `level` in the repository insert and hydration path
- add a migration so existing rows default to `level = 1`

- [ ] **Step 5: Update the route handler**

Ensure the POST `/v1/game-sessions` path passes parsed `level` straight into `createSession`.

- [ ] **Step 6: Run the targeted server tests**

Run: `npm run server:test -- --run server/src/services/gameSessionService.test.ts server/src/routes/gameSessions.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/schemas/gameSessionSchemas.ts server/src/services/gameSessionService.ts server/src/services/gameSessionService.test.ts server/src/routes/gameSessions.ts server/src/routes/gameSessions.test.ts server/src/repositories/gameSessionRepository.ts server/src/db/runMigrations.ts server/src/db/migrations/002_add_game_session_level.sql
git commit -m "feat: add level to session creation contract"
```

## Task 5: Implement The Homepage Level Ribbon And Resume CTA

**Files:**
- Modify: `src-taro/pages/index/index.tsx`
- Modify: `src-taro/pages/index/index.scss`
- Create: `src-taro/pages/index/index.levels.test.tsx`

- [ ] **Step 1: Write the failing homepage rendering test**

```tsx
it('shows the current level and resume CTA', () => {
  mockReadLevelProgress({
    currentLevel: 7,
    highestUnlockedLevel: 7,
    highestClearedLevel: 6,
    levelStreak: 0,
    lastResult: 'lose',
  })

  render(<IndexPage />)

  expect(screen.getByText('继续挑战 第7关')).toBeInTheDocument()
  expect(screen.getByText('已通关 6 关')).toBeInTheDocument()
  expect(screen.getByText('最高解锁 第7关')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src-taro/pages/index/index.levels.test.tsx`

Expected: FAIL because the page still renders a generic “开始游戏” CTA.

- [ ] **Step 3: Update `src-taro/pages/index/index.tsx`**

Implement:

- level progress read on page load
- resume CTA text
- horizontal level ribbon with visible neighborhood levels
- clickable unlocked levels only
- current-level hero badge driven by progress instead of static `第12关`
- selecting an unlocked older level updates `currentLevel`, and the next created session uses that selected level

- [ ] **Step 4: Update `src-taro/pages/index/index.scss`**

Style:

- level ribbon track
- passed/current/locked cards
- compact progress summary
- current-level CTA emphasis

Keep the existing Stitch-like visual language: thick borders, offset shadows, warm palette.

- [ ] **Step 5: Run the page test**

Run: `npm test -- --run src-taro/pages/index/index.levels.test.tsx`

Expected: PASS

- [ ] **Step 6: Run a build-level sanity check**

Run: `npm run taro:build:h5`

Expected: PASS with no new TypeScript or module resolution errors.

- [ ] **Step 7: Commit**

```bash
git add src-taro/pages/index/index.tsx src-taro/pages/index/index.scss src-taro/pages/index/index.levels.test.tsx
git commit -m "feat: add homepage level ribbon"
```

## Task 6: Add Level HUD To The Game Page

**Files:**
- Modify: `src-taro/pages/game/game.tsx`
- Modify: `src-taro/pages/game/game.scss`
- Create: `src-taro/pages/game/game.levels.test.tsx`

- [ ] **Step 1: Write the failing game-page level test**

```tsx
it('shows level title and unlock hint', async () => {
  render(<GamePage />)

  expect(await screen.findByText('LEVEL 7')).toBeInTheDocument()
  expect(screen.getByText('名士')).toBeInTheDocument()
  expect(screen.getByText('胜利后解锁第8关')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src-taro/pages/game/game.levels.test.tsx`

Expected: FAIL because no level HUD exists yet.

- [ ] **Step 3: Update `src-taro/pages/game/game.tsx`**

Use the active level from session/local progress to render:

- `LEVEL N`
- difficulty title
- level hint
- current-goal copy
- restart preserving the active level
- game-to-result navigation including `level=${state.level}`

- [ ] **Step 4: Update `src-taro/pages/game/game.scss`**

Add level-HUD visual styles that fit the existing screen without expanding it into a map page.

- [ ] **Step 5: Run the test**

Run: `npm test -- --run src-taro/pages/game/game.levels.test.tsx`

Expected: PASS

- [ ] **Step 6: Run frontend validation through the Taro build**

Run: `npm run taro:build:h5`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-taro/pages/game/game.tsx src-taro/pages/game/game.scss src-taro/pages/game/game.levels.test.tsx
git commit -m "feat: show level progression in game HUD"
```

## Task 7: Update Result Page Progression Logic And Messaging

**Files:**
- Modify: `src-taro/pages/result/result.tsx`
- Modify: `src-taro/pages/result/result.scss`
- Create: `src-taro/pages/result/result.levels.test.tsx`

- [ ] **Step 1: Write the failing result-page tests**

```tsx
it('promotes the next level after a win', () => {
  renderWithParams({ winner: 'true', name: '李白', count: '6', level: '4' })
  expect(screen.getByText('第4关通关')).toBeInTheDocument()
  expect(screen.getByText('挑战第5关')).toBeInTheDocument()
})

it('keeps the current unlocked level after a loss', () => {
  renderWithParams({ winner: 'false', name: '李白', count: '20', level: '4' })
  expect(screen.getByText('已为你保留至第4关')).toBeInTheDocument()
  expect(screen.getByText('从第4关继续')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run src-taro/pages/result/result.levels.test.tsx`

Expected: FAIL because result-page copy and persistence are not level-aware.

- [ ] **Step 3: Update `src-taro/pages/result/result.tsx`**

Implement:

- parse `level` from router params
- update stored level progress on mount
- change primary CTA label by outcome
- show retained/unlocked messaging
- render a compact neighborhood level ribbon

- [ ] **Step 4: Update `src-taro/pages/result/result.scss`**

Style:

- unlocked banner
- retained-level banner
- compact ribbon
- result CTA emphasis for next-level challenge

- [ ] **Step 5: Run the result-page tests**

Run: `npm test -- --run src-taro/pages/result/result.levels.test.tsx`

Expected: PASS

- [ ] **Step 6: Run a full frontend test sweep**

Run: `npm test -- --run`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-taro/pages/result/result.tsx src-taro/pages/result/result.scss src-taro/pages/result/result.levels.test.tsx
git commit -m "feat: add result-page level progression feedback"
```

## Task 8: Make Settings And Reset Flows Level-Aware

**Files:**
- Modify: `src-taro/pages/settings/settings.tsx`
- Modify: `src-taro/lib/levelProgress.ts`
- Create: `src-taro/pages/settings/settings.levels.test.tsx`

- [ ] **Step 1: Write the failing reset-flow test**

```tsx
it('clears level progress when resetting local data', async () => {
  storage.set('history-figure-guess-level-progress', {
    currentLevel: 9,
    highestUnlockedLevel: 9,
    highestClearedLevel: 8,
    levelStreak: 2,
    lastResult: 'win',
  })

  render(<SettingsPage />)
  await triggerResetData()

  expect(readLevelProgress()).toEqual(createDefaultLevelProgress())
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src-taro/pages/settings/settings.levels.test.tsx`

Expected: FAIL because the test file and explicit level reset flow do not exist.

- [ ] **Step 3: Update the settings page**

Clarify copy:

- “清除缓存” only clears the active round
- “重置数据” clears settings, login data, and level progression

- [ ] **Step 4: Run the settings test**

Run: `npm test -- --run src-taro/pages/settings/settings.levels.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-taro/pages/settings/settings.tsx src-taro/pages/settings/settings.levels.test.tsx src-taro/lib/levelProgress.ts
git commit -m "feat: reset level progression with local data reset"
```

## Task 9: End-To-End Verification

**Files:**
- No new product files required
- Reuse existing smoke setup and Playwright if already configured locally

- [ ] **Step 1: Run frontend validation through the Taro build**

Run: `npm run taro:build:h5`

Expected: PASS

- [ ] **Step 2: Run frontend tests**

Run: `npm test -- --run`

Expected: PASS

- [ ] **Step 3: Run server tests**

Run: `npm run server:test -- --run`

Expected: PASS

- [ ] **Step 4: Run H5 build**

Run: `npm run taro:build:h5`

Expected: PASS

- [ ] **Step 5: Run browser smoke for level progression**

Suggested assertion path:

1. Homepage shows `继续挑战 第1关`
2. Win or simulate a result-page win for `第1关`
3. Homepage or result CTA updates to `挑战第2关`
4. Simulate a loss on `第2关`
5. Result CTA shows `从第2关继续`
6. Return to homepage, click a previously unlocked old level, start a new round, and verify the selected level persists through game -> result -> home

- [ ] **Step 6: Commit verification fixes if any**

```bash
git add .
git commit -m "test: verify infinite level progression"
```

## Review Notes

- Keep progression state independent from `GameSettings`.
- Do not reduce `questionLimit` as part of this feature.
- Do not introduce cloud sync or user-bound persistence.
- Prefer small helpers over expanding page components with progression logic.
- Preserve the existing “WeChat mini game” visual language; this feature should feel like a progression layer on top of the current redesign, not a new product shell.
