# Continuous Voice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully hands-free continuous voice mode that auto-listens after each spoken AI answer and treats spoken person names as final guesses.

**Architecture:** Keep the backend contract unchanged. Implement a frontend-side `voiceIntent` parser using the existing figure catalog, extend settings with a dedicated continuous voice toggle, and route recognized transcripts through the parser before deciding whether to ask a yes/no question, submit a final guess, or run a local control command.

**Tech Stack:** React, TypeScript, Vitest, Web Speech API, existing `useVoiceInput` and `useSpeechSynthesis`

---

## File Structure

### Existing files to modify

- Modify: `src/lib/types/game.ts`
- Modify: `src/lib/llmClient.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/useVoiceGameController.ts`
- Modify: `src/lib/gameAnnouncements.ts`
- Modify: `src/lib/gameAnnouncements.test.ts`
- Modify: `src/lib/useVoiceGameController.test.ts`
- Modify: `src/App.test.tsx`

### New files

- Create: `src/lib/voiceIntent.ts`
- Create: `src/lib/voiceIntent.test.ts`

## Task 1: Add Voice Intent Parser

**Files:**
- Create: `src/lib/voiceIntent.ts`
- Create: `src/lib/voiceIntent.test.ts`

- [ ] Write failing tests for name guesses, alias guesses, name-bearing yes/no guesses, plain questions, and control commands.
- [ ] Run `npm test -- --run src/lib/voiceIntent.test.ts` and verify it fails.
- [ ] Implement minimal parser with normalization, figure-name lookup, guess detection, and control detection.
- [ ] Run `npm test -- --run src/lib/voiceIntent.test.ts` and verify it passes.

## Task 2: Extend Settings for Continuous Mode

**Files:**
- Modify: `src/lib/types/game.ts`
- Modify: `src/lib/llmClient.ts`
- Modify: `src/components/SettingsPanel.tsx`

- [ ] Write or update tests that assert the new setting persists with sane defaults.
- [ ] Run targeted tests and verify failure.
- [ ] Implement `continuousVoiceMode` in settings types, storage defaults, and settings UI.
- [ ] Re-run targeted tests and verify pass.

## Task 3: Wire Continuous Voice Flow in App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/useVoiceGameController.ts`
- Modify: `src/lib/useVoiceGameController.test.ts`
- Modify: `src/App.test.tsx`

- [ ] Write failing tests for continuous voice behavior: auto-resume after spoken answer, spoken name becomes final guess, and local control commands work.
- [ ] Run targeted tests and verify failure.
- [ ] Implement transcript routing through `voiceIntent`, single-loop question listening, replay support, and continuous-mode stop behavior.
- [ ] Re-run targeted tests and verify pass.

## Task 4: Tighten Spoken Announcements

**Files:**
- Modify: `src/lib/gameAnnouncements.ts`
- Modify: `src/lib/gameAnnouncements.test.ts`

- [ ] Add or update failing tests for concise spoken answers and replay-safe announcements.
- [ ] Run `npm test -- --run src/lib/gameAnnouncements.test.ts` and verify failure.
- [ ] Implement the minimal announcement changes needed for continuous voice mode.
- [ ] Re-run the test and verify pass.

## Task 5: Full Verification

**Files:**
- Verify: frontend tests and build

- [ ] Run `npm test -- --run`
- [ ] Run `npm run build`
- [ ] If frontend behavior changes require redeploy, rebuild the running compose stack.
