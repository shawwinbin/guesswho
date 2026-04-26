import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../lib/errors.js'
import { GameSessionService } from './gameSessionService.js'
import type {
  CreateSessionInput,
  GameEventRecord,
  GameEventRepository,
  GameSessionRecord,
  GameSessionRepository,
  ListSessionEventsOptions,
  UpdateSessionAfterGuessInput,
  UpdateSessionAfterQuestionInput,
} from '../repositories/gameSessionRepository.js'
import type { FigureScope, HostLlmService } from './hostLlmService.js'

class InMemoryGameSessionRepository implements GameSessionRepository {
  private sessions = new Map<string, GameSessionRecord>()

  getSession(sessionId: string): GameSessionRecord | null {
    return this.sessions.get(sessionId) ?? null
  }

  async createSession(input: CreateSessionInput): Promise<GameSessionRecord> {
    const session: GameSessionRecord = {
      id: input.id,
      level: input.level,
      status: 'playing',
      questionLimit: input.questionLimit,
      questionCount: 0,
      secretFigureName: input.secretFigure.name,
      secretFigureAliases: input.secretFigure.aliases,
      secretFigureEra: input.secretFigure.era,
      revealedName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.sessions.set(session.id, session)
    return session
  }

  async findSessionById(sessionId: string): Promise<GameSessionRecord | null> {
    return this.sessions.get(sessionId) ?? null
  }

  async updateSessionAfterQuestion(sessionId: string, input: UpdateSessionAfterQuestionInput): Promise<GameSessionRecord> {
    const existing = this.sessions.get(sessionId)
    if (!existing) throw new Error('session not found')

    const updated: GameSessionRecord = {
      ...existing,
      status: input.status,
      questionCount: input.questionCount,
      revealedName: input.revealedName ?? null,
      updatedAt: new Date(),
    }
    this.sessions.set(sessionId, updated)
    return updated
  }

  async updateSessionAfterGuess(sessionId: string, input: UpdateSessionAfterGuessInput): Promise<GameSessionRecord> {
    const existing = this.sessions.get(sessionId)
    if (!existing) throw new Error('session not found')

    const updated: GameSessionRecord = {
      ...existing,
      status: 'ended',
      revealedName: input.revealedName,
      updatedAt: new Date(),
    }
    this.sessions.set(sessionId, updated)
    return updated
  }
}

class InMemoryGameEventRepository implements GameEventRepository {
  private events: GameEventRecord[] = []

  async appendQuestionEvent(sessionId: string, question: string, answer: '是' | '不是'): Promise<void> {
    this.events.push({
      id: randomUUID(),
      sessionId,
      eventType: 'question',
      questionText: question,
      answerText: answer,
      guessText: null,
      isCorrect: null,
      createdAt: new Date(),
    })
  }

  async appendGuessEvent(sessionId: string, guess: string, isCorrect: boolean): Promise<void> {
    this.events.push({
      id: randomUUID(),
      sessionId,
      eventType: 'guess',
      questionText: null,
      answerText: null,
      guessText: guess,
      isCorrect,
      createdAt: new Date(),
    })
  }

  async listSessionEvents(options: ListSessionEventsOptions): Promise<GameEventRecord[]> {
    return this.events.filter(event => event.sessionId === options.sessionId)
  }
}

function createHostStub(): HostLlmService {
  return {
    startRound: vi.fn(async ({ figureScope }: { figureScope: FigureScope }) => ({
      name: figureScope === 'poet' ? '李白' : '秦始皇',
      aliases: figureScope === 'poet' ? ['李太白'] : ['嬴政'],
      era: figureScope === 'poet' ? '唐朝' : '秦朝',
    })),
    answerQuestion: vi.fn(async () => '是' as const),
    judgeGuess: vi.fn(async ({ guess }) => ({
      isCorrect: guess === '李白',
      revealedName: '李白',
    })),
  }
}

describe('gameSessionService', () => {
  let sessionRepository: InMemoryGameSessionRepository
  let eventRepository: InMemoryGameEventRepository
  let hostService: HostLlmService
  let service: GameSessionService

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sessionRepository = new InMemoryGameSessionRepository()
    eventRepository = new InMemoryGameEventRepository()
    hostService = createHostStub()
    service = new GameSessionService({
      sessionRepository,
      eventRepository,
      hostService,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a new playable session snapshot', async () => {
    const snapshot = await service.createSession({
      level: 2,
      questionLimit: 3,
      figureScope: 'poet',
    })

    expect(snapshot.level).toBe(2)
    expect(snapshot.status).toBe('playing')
    expect(snapshot.questionCount).toBe(0)
    expect(snapshot.remainingQuestions).toBe(3)
    expect(snapshot.history).toEqual([])
    expect(snapshot.guesses).toEqual([])
    expect(vi.mocked(hostService.startRound)).not.toHaveBeenCalled()

    const record = sessionRepository.getSession(snapshot.sessionId)
    expect(record?.level).toBe(2)
    expect(record?.secretFigureName).toBeTruthy()
    expect(record?.secretFigureEra).toBeTruthy()
  })

  it('records question history and ends the round when the limit is exhausted', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 1,
      figureScope: 'all',
    })

    const response = await service.submitQuestion(created.sessionId, '他是皇帝吗？')
    const snapshot = await service.getSessionSnapshot(created.sessionId)

    expect(response).toEqual({
      answer: '是',
      status: 'ended',
      questionCount: 1,
      questionLimit: 1,
      remainingQuestions: 0,
      revealedName: '司马迁',
    })
    expect(snapshot.history).toEqual([{ question: '他是皇帝吗？', answer: '是' }])
    expect(snapshot.status).toBe('ended')
    expect(snapshot.level).toBe(4)
  })

  it('records guesses and marks the winner state on a correct guess', async () => {
    const created = await service.createSession({
      level: 3,
      questionLimit: 3,
      figureScope: 'poet',
    })

    const verdict = await service.submitGuess(created.sessionId, '李白')
    const snapshot = await service.getSessionSnapshot(created.sessionId)

    expect(verdict).toEqual({
      isCorrect: true,
      revealedName: '李白',
      status: 'ended',
    })
    expect(snapshot.guesses).toEqual([{ guess: '李白', isCorrect: true }])
    expect(snapshot.status).toBe('ended')
    expect(snapshot.revealedName).toBe('李白')
    expect(snapshot.level).toBe(3)
  })

  it('rejects further questions after the session has already ended', async () => {
    const created = await service.createSession({
      level: 1,
      questionLimit: 1,
      figureScope: 'all',
    })
    await service.submitQuestion(created.sessionId, '他是皇帝吗？')

    await expect(service.submitQuestion(created.sessionId, '他是中国人吗？')).rejects.toBeInstanceOf(AppError)
  })
})
