import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSession, fetchSession, submitGuess, submitQuestion } from './gameApi'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('gameApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('creates a session through the backend api', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        status: 'playing',
        questionCount: 0,
        questionLimit: 20,
        remainingQuestions: 20,
        history: [],
        guesses: [],
      }),
    })

    const response = await createSession({ questionLimit: 20, figureScope: 'all' })

    expect(response.sessionId).toBe('session-1')
    expect(mockFetch).toHaveBeenCalledWith('/v1/game-sessions', expect.objectContaining({ method: 'POST' }))
  })

  it('fetches a persisted session snapshot', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        status: 'playing',
        questionCount: 1,
        questionLimit: 20,
        remainingQuestions: 19,
        history: [{ question: '他是皇帝吗？', answer: '是' }],
        guesses: [],
      }),
    })

    const response = await fetchSession('session-1')

    expect(response.history).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith('/v1/game-sessions/session-1', expect.any(Object))
  })

  it('submits questions and guesses to the backend api', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: '是',
          status: 'playing',
          questionCount: 1,
          questionLimit: 20,
          remainingQuestions: 19,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isCorrect: false,
          revealedName: '李白',
          status: 'ended',
        }),
      })

    const questionResponse = await submitQuestion('session-1', '他是皇帝吗？')
    const guessResponse = await submitGuess('session-1', '杜甫')

    expect(questionResponse.answer).toBe('是')
    expect(guessResponse.revealedName).toBe('李白')
  })
})
