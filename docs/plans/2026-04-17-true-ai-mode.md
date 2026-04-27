# True AI Game-Master Mode Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade the existing frontend app so API mode becomes a true AI-hosted game where the model secretly chooses the historical figure at game start, answers later questions consistently, and judges the player's final guess.

**Architecture:** Keep the current local mode unchanged. For AI mode, add a lightweight browser-side session model that stores an AI-generated secret packet returned at game start. Use structured prompts and JSON normalization so the frontend can call an OpenAI-compatible API without a backend and still maintain consistent gameplay across turns.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library.

---

### Task 1: Add AI session types and LLM client helpers

**Objective:** Model the AI-hosted game state and implement helpers for start-question-guess flows.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/llmClient.ts`
- Modify: `src/lib/llmClient.test.ts`

**Step 1: Write failing tests**
- Add tests for a helper that parses the AI start-game response.
- Add tests that normalize AI judge responses for yes/no answers and final guess verdicts.
- Add tests for API-mode readiness if the mode set expands.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/lib/llmClient.test.ts`
- Expected: FAIL because the new helpers/types do not exist.

**Step 3: Write minimal implementation**
- Add types for AI secret packets and AI final-guess verdicts.
- Add `startAiRound`, `askAiQuestion`, and `judgeAiGuess` helpers in `llmClient.ts`.
- Make prompts request strict JSON where practical.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/lib/llmClient.test.ts`
- Expected: PASS.

---

### Task 2: Wire the app to use true AI-hosted rounds

**Objective:** Make start/question/guess behavior switch correctly between local mode and true AI mode.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add a test showing that AI mode calls the AI round initializer at game start.
- Add a test showing that questions in AI mode use the AI question endpoint instead of local engine.
- Add a test showing that final guesses in AI mode use the AI judge result instead of local `checkGuess`.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- On `开始游戏` in AI mode, call `startAiRound` and store the returned secret/session context in state.
- On question submit, call `askAiQuestion` with the stored AI secret context.
- On final guess, call `judgeAiGuess` and render the result summary from that verdict.
- Preserve current local-mode behavior as-is.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: PASS.

---

### Task 3: Improve AI-mode UX and explain the new behavior

**Objective:** Make it obvious to the player that AI mode now truly chooses the hidden figure.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `README.md`
- Modify: `src/App.test.tsx`

**Step 1: Write failing tests**
- Add tests that expect an AI-mode badge or helper text indicating AI has chosen the figure.
- Add tests that expect loading states/messages during AI round initialization.

**Step 2: Run test to verify failure**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: FAIL.

**Step 3: Write minimal implementation**
- Add helper copy in the start screen and in-game status bar.
- Add a loading state while AI chooses the figure.
- Update README to explain the difference between local mode and true AI mode.

**Step 4: Run test to verify pass**
- Run: `npm test -- --run src/App.test.tsx`
- Expected: PASS.

---

### Task 4: Final verification

**Objective:** Verify the finished AI mode works and the existing app still builds.

**Files:**
- Modify: project files as needed

**Step 1: Run full test suite**
- Run: `npm test -- --run`
- Expected: all tests pass.

**Step 2: Run production build**
- Run: `npm run build`
- Expected: successful build.

**Step 3: Sanity review**
- Confirm local mode still works offline.
- Confirm AI mode now starts by asking the model to choose the secret figure.
- Confirm the final guess in AI mode is judged by AI mode, not by the local dataset.
