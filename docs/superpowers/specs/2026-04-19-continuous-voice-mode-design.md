# Continuous Voice Mode Design

Date: 2026-04-19

## Goal

Add a fully hands-free voice conversation mode for the history figure guessing game.

In this mode:

- The user starts voice mode once.
- The app continuously alternates between listening and AI voice responses.
- Normal utterances are treated as yes/no questions.
- If the utterance contains a figure name or directly names a historical figure, it is treated as the final guess immediately.
- The AI answers by voice with `是` or `不是` for normal questions.
- After speech playback ends, the app automatically returns to listening unless the game has ended.

## User Experience

### Entry

- The user enables continuous voice mode from the existing voice-enabled gameplay flow.
- After the initial start, the app begins listening without further button presses.

### Conversation loop

1. App listens.
2. User speaks one utterance.
3. Frontend parses the recognized text into an intent.
4. If the intent is a question:
   - Submit question to backend
   - Receive `是` or `不是`
   - Speak the answer aloud
   - Resume listening after playback ends
5. If the intent is a guess:
   - Submit final guess to backend
   - Speak win/lose result aloud
   - Stop listening because the round has ended

### Guess detection

These utterances are treated as final guesses:

- Pure names, for example `李白`
- Guess phrases, for example `我猜李白`
- Name-bearing yes/no guesses, for example `他是李白吗`, `是不是武则天`

### Non-goals

- No backend NLP intent classifier
- No free-form multi-turn conversational AI
- No separate “guess mode” phase

## Architecture

### Frontend responsibilities

Add a local `voiceIntent` parser that classifies each recognized transcript as:

- `question`
- `guess`
- `control`
- `unknown`

The parser uses the existing figure dataset names and aliases as the canonical source of person-name matching.

The continuous mode remains frontend-orchestrated:

- Listening is paused while speech synthesis is speaking.
- Listening resumes only when playback ends and the game is still active.
- The backend contract does not change.

### Backend responsibilities

No new API endpoints are required.

The backend continues to support:

- `POST /v1/game-sessions/:sessionId/questions`
- `POST /v1/game-sessions/:sessionId/guesses`

## Intent Parsing Rules

### Priority order

1. Control phrases
2. Guess
3. Question
4. Unknown

### Control phrases

Supported commands:

- `重新开始`
- `再说一遍`
- `退出语音模式`

These are handled locally and do not reach the backend.

### Guess detection rules

Treat the transcript as a guess if any of the following match:

- Exact name or alias after normalization
- Prefix guess phrases such as `我猜`, `答案是`
- Name-bearing yes/no guess forms such as `是不是X`, `他是X吗`

Normalization should strip punctuation, filler words, and surrounding whitespace before matching.

### Question detection

Any utterance not classified as control or guess is treated as a question and sent to the normal question endpoint.

## State Model

Introduce a dedicated `continuousVoiceMode` state in the frontend.

### When enabled

- Only one active listening target is used for the full game flow.
- Question and guess text boxes remain as fallbacks, but continuous mode drives submission automatically.
- Playback completion is the only trigger that re-enables listening.

### When disabled

- Existing text-first and mic-button behavior remains unchanged.

## Anti-feedback Safeguards

To avoid the app listening to its own TTS output:

- Do not listen while `speech.state !== 'idle'`
- Resume listening only after playback end
- Cancel any pending auto-listen when the game ends or an error requires manual intervention

## Error Handling

### Recognition errors

- If speech recognition fails or yields empty text, speak a short retry prompt and continue listening when safe.

### Unknown intent

- If parsing cannot confidently detect a guess or useful question, treat it as a normal question.

### Backend/network errors

- Speak a short failure line
- Stop auto-resume for that turn if needed
- Keep manual retry available

## Implementation Units

### 1. `voiceIntent.ts`

New parser module for:

- normalization
- alias lookup
- guess detection
- control detection

### 2. `useVoiceGameController.ts`

Extend orchestration to support:

- continuous mode
- single-loop listen → parse → submit → speak → listen
- control command handling

### 3. `App.tsx`

Wire the new continuous mode toggle and route transcripts through the parser.

### 4. `gameAnnouncements.ts`

Keep AI spoken answers concise:

- question answers remain `是` / `不是`
- result messages remain explicit and final

## Testing Strategy

### Unit

- `voiceIntent.test.ts`
  - exact name
  - alias
  - guess phrase
  - name-bearing yes/no guess
  - plain question
  - control command

### Hook/controller

- `useVoiceGameController.test.ts`
  - resumes listening after playback
  - submits guess when transcript contains a person name
  - stops auto-resume after game end

### App integration

- continuous voice mode can progress through multiple spoken questions
- a spoken name triggers final guess immediately
- AI answer is spoken and then listening resumes

## Acceptance Criteria

- The user can start one continuous voice session and keep playing without touching controls each turn.
- Spoken questions are automatically submitted.
- Spoken person names are treated as final guesses immediately.
- AI answers normal questions by voice with `是` or `不是`.
- Listening resumes automatically after spoken answers until the game ends.
