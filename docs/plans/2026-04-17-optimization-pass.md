# History Figure Guess Optimization Pass Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Improve the existing frontend game with better gameplay guidance, clearer progress feedback, stronger API-mode UX, and broader automated test coverage.

**Architecture:** Keep the current Vite + React + TypeScript single-page architecture, but extract more state helpers into typed data structures and add a small set of UX-oriented features directly in `App.tsx`. Focus on low-risk product improvements that make the game more polished without adding backend complexity.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS.

---

### Task 1: Add richer game metadata and progress tracking

**Objective:** Give players clearer visibility into their run with round statistics and configurable question limits.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add tests that expect a visible remaining-question counter.
- Add tests that expect the game to auto-end when the question limit is reached.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: FAIL because the UI does not show or enforce question limits yet.

**Step 3: Write minimal implementation**
- Add a question limit to settings/state.
- Track remaining questions and end the game with a friendly message when the limit is exhausted.
- Show round stats like asked questions, remaining chances, and current mode.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: PASS.

---

### Task 2: Add guided quick-question suggestions and better empty states

**Objective:** Help players ask better yes/no questions without thinking from scratch.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add a test that expects clickable suggested questions during gameplay.
- Add a test that expects clicking a suggestion to populate or submit a question.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: FAIL because suggested question chips do not exist.

**Step 3: Write minimal implementation**
- Render a small list of suggested yes/no question chips.
- Let a click insert the suggestion into the question input and/or send it immediately.
- Improve empty-state copy so the first move is easier.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: PASS.

---

### Task 3: Improve API mode UX and validation

**Objective:** Make API mode clearer, safer, and easier to recover from when misconfigured.

**Files:**
- Modify: `src/lib/llmClient.ts`
- Modify: `src/lib/llmClient.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add tests that expect a friendly warning when API mode is selected but config is incomplete.
- Add tests for settings persistence of the new fields and validation behavior.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/lib/llmClient.test.ts src/App.test.tsx`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Add a helper that validates whether API mode is ready.
- Surface a clear in-UI banner/status about missing API settings.
- Keep fallback behavior explicit instead of silently confusing the player.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/lib/llmClient.test.ts src/App.test.tsx`
- Expected: PASS.

---

### Task 4: Polish result screen and replay flow

**Objective:** Make the end-of-round summary feel rewarding and informative.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `README.md`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add tests that expect a result summary including outcome, attempts used, and answer reveal.
- Add tests that expect replay controls and preserved mode/limit settings.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Add richer result copy, round summary cards, and restart CTA.
- Update README to mention question-limit gameplay and API readiness requirements.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: PASS.

---

### Task 5: Final verification

**Objective:** Verify the optimized project is stable and ready to use.

**Files:**
- Modify: project files as needed

**Step 1: Run full tests**
- Run: `npm test -- --run`
- Expected: all tests pass.

**Step 2: Run production build**
- Run: `npm run build`
- Expected: successful build.

**Step 3: Sanity review**
- Confirm the UI is still fully Chinese.
- Confirm the app still works in local mode without a backend.
- Confirm API mode messaging is clear when not configured.
