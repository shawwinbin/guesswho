# AI Consistency Pass Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Improve true AI-hosted mode so the model answers more consistently across the whole round.

**Architecture:** Keep local mode unchanged. Enhance the AI client to maintain structured round memory in-browser, inject prior Q/A history into later prompts, and use stricter system instructions for answer consistency and final-guess judging.

**Tech Stack:** React, TypeScript, Vite, Vitest.

---

### Task 1: Strengthen AI round memory in the client
- Modify `src/lib/llmClient.ts`
- Modify `src/lib/llmClient.test.ts`
- Add tests showing that question prompts include prior history and the hidden figure context.
- Add tests showing final guess judging includes round history.

### Task 2: Surface consistency-oriented UX in the app
- Modify `src/App.tsx`
- Modify `src/App.css`
- Modify `src/App.test.tsx`
- Add a small AI consistency hint/badge in AI mode so users know the AI is tracking the round context.

### Task 3: Final verification
- Run `npm test -- --run`
- Run `npm run build`
- Update `README.md` if behavior messaging changes.
