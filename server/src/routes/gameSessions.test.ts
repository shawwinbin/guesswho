import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../app.js'
import type { GameSessionService } from '../services/gameSessionService.js'

function createServiceStub(): Pick<GameSessionService, 'createSession' | 'getSessionSnapshot' | 'submitQuestion' | 'submitGuess'> {
  return {
    createSession: vi.fn(async () => ({
      sessionId: 'session-1',
      level: 3,
      status: 'playing' as const,
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })),
    getSessionSnapshot: vi.fn(async () => ({
      sessionId: 'session-1',
      level: 7,
      status: 'playing' as const,
      questionCount: 0,
      questionLimit: 20,
      remainingQuestions: 20,
      history: [],
      guesses: [],
    })),
    submitQuestion: vi.fn(async () => ({
      answer: '是' as const,
      status: 'playing' as const,
      questionCount: 1,
      questionLimit: 20,
      remainingQuestions: 19,
    })),
    submitGuess: vi.fn(async () => ({
      isCorrect: false,
      revealedName: '李白',
      status: 'ended' as const,
    })),
  }
}

describe('game session routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('boots the app with an injected game session service', async () => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      gameSessionService: createServiceStub() as GameSessionService,
    })

    expect(app).toBeDefined()

    await app.close()
  })

  it('creates sessions through the http api', async () => {
    const service = createServiceStub()
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      gameSessionService: service as GameSessionService,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/game-sessions',
      payload: {
        level: 3,
        questionLimit: 20,
        figureScope: 'all',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      sessionId: 'session-1',
      level: 3,
      status: 'playing',
    })
    expect(service.createSession).toHaveBeenCalledWith({
      level: 3,
      questionLimit: 20,
      figureScope: 'all',
    })

    await app.close()
  })

  it('returns level on restored session snapshots through the http api', async () => {
    const service = createServiceStub()
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      gameSessionService: service as GameSessionService,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/v1/game-sessions/session-1',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      sessionId: 'session-1',
      level: 7,
      status: 'playing',
    })
    expect(service.getSessionSnapshot).toHaveBeenCalledWith('session-1')

    await app.close()
  })

  it('rejects malformed question payloads with 400', async () => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      gameSessionService: createServiceStub() as GameSessionService,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/game-sessions/session-1/questions',
      payload: {
        question: '   ',
      },
    })

    expect(response.statusCode).toBe(400)

    await app.close()
  })

  it('rejects malformed create-session level payloads with 400', async () => {
    const service = createServiceStub()
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      gameSessionService: service as GameSessionService,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/v1/game-sessions',
      payload: {
        level: 0,
        questionLimit: 20,
        figureScope: 'all',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(service.createSession).not.toHaveBeenCalled()

    await app.close()
  })
})
