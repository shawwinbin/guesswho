# History Figure Guess Game Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Chinese-language frontend game where the computer secretly chooses a historical figure, the human asks yes/no questions, and the game master answers only “是” or “不是” until the player makes a final guess.

**Architecture:** Create a Vite + React + TypeScript single-page app. Ship a polished local demo mode powered by a curated historical figure dataset and deterministic yes/no rule engine so the app works without any backend. Also include an optional LLM mode where the browser can call an OpenAI-compatible API using user-supplied settings stored in localStorage.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS modules or plain CSS.

---

### Task 1: Scaffold the app shell

**Objective:** Create the Vite React TypeScript project with test tooling and a clean app entry.

**Files:**
- Create: `package.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/App.css`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Write failing smoke test**
- Add a render test that expects the game title to appear.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run`
- Expected: FAIL because the app shell does not exist yet.

**Step 3: Write minimal implementation**
- Scaffold the Vite app, wire up React entry, and render the title.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run`
- Expected: PASS.

---

### Task 2: Build the local game engine

**Objective:** Add a local playable mode with a curated list of historical figures and deterministic yes/no answers.

**Files:**
- Create: `src/data/figures.ts`
- Create: `src/lib/localEngine.ts`
- Create: `src/lib/types.ts`
- Test: `src/lib/localEngine.test.ts`

**Step 1: Write failing tests**
- Verify random figure selection returns a valid figure.
- Verify generated answers normalize to only `是` or `不是`.
- Verify guess checking is case-insensitive for Chinese and Latin names.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/lib/localEngine.test.ts`

**Step 3: Write minimal implementation**
- Model historical figure traits such as dynasty/era, role, region, gender, keywords, aliases.
- Implement question classification for common question styles and fallback conservative answering.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/lib/localEngine.test.ts`

---

### Task 3: Add optional LLM mode

**Objective:** Let users switch from local mode to an OpenAI-compatible API mode without needing a backend.

**Files:**
- Create: `src/lib/llmClient.ts`
- Create: `src/lib/storage.ts`
- Test: `src/lib/llmClient.test.ts`

**Step 1: Write failing tests**
- Verify prompt assembly instructs the model to answer only `是` or `不是`.
- Verify response normalization rejects other outputs and coerces common variants.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/lib/llmClient.test.ts`

**Step 3: Write minimal implementation**
- Add settings for base URL, API key, model, and system prompt.
- Persist settings to localStorage.
- Normalize model output to strict yes/no.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/lib/llmClient.test.ts`

---

### Task 4: Build the game UI

**Objective:** Create a polished playable interface in Chinese.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Create: `src/components/GameBoard.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/QuestionForm.tsx`
- Create: `src/components/GuessForm.tsx`
- Test: `src/App.test.tsx`

**Step 1: Write failing tests**
- Verify users can start a game, ask a question, receive a yes/no answer, and submit a final guess.
- Verify switching modes updates the UI.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`

**Step 3: Write minimal implementation**
- Add start/restart flow, chat history, answer badges, status panel, mode toggle, and settings drawer.
- Add loading states and validation copy that nudges users to ask yes/no questions.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`

---

### Task 5: Final verification and docs

**Objective:** Ensure the app is ready to run locally.

**Files:**
- Create: `README.md`
- Modify: project files as needed for cleanup

**Step 1: Run quality checks**
- Run: `npm test -- --run`
- Run: `npm run build`

**Step 2: Document usage**
- Explain local mode and optional API mode.
- Provide `npm install`, `npm run dev`, and `npm run build` commands.

**Step 3: Verify output**
- App builds successfully with no TypeScript errors.
- README matches implemented behavior.
