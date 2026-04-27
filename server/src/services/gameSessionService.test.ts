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

  async appendQuestionEvent(
    sessionId: string,
    question: string,
    answer: '是' | '不是',
    metadata?: { answerSource?: string; answerConfidence?: number; answerReason?: string },
  ): Promise<void> {
    this.events.push({
      id: randomUUID(),
      sessionId,
      eventType: 'question',
      questionText: question,
      answerText: answer,
      answerSource: metadata?.answerSource ?? null,
      answerConfidence: metadata?.answerConfidence ?? null,
      answerReason: metadata?.answerReason ?? null,
      guessText: null,
      hintText: null,
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
      answerSource: null,
      answerConfidence: null,
      answerReason: null,
      guessText: guess,
      hintText: null,
      isCorrect,
      createdAt: new Date(),
    })
  }

  async appendHintEvent(sessionId: string, hint: string): Promise<void> {
    this.events.push({
      id: randomUUID(),
      sessionId,
      eventType: 'hint',
      questionText: null,
      answerText: null,
      answerSource: null,
      answerConfidence: null,
      answerReason: null,
      guessText: null,
      hintText: hint,
      isCorrect: null,
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
    classifyQuestionIntent: vi.fn(async () => ({
      type: 'guess' as const,
      guess: '李白',
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
      revealedName: '秦始皇',
    })
    expect(snapshot.history).toEqual([{ question: '他是皇帝吗？', answer: '是' }])
    expect(snapshot.status).toBe('ended')
    expect(snapshot.level).toBe(4)
  })

  it('falls back to the host model when local rules cannot answer the question', async () => {
    vi.mocked(hostService.answerQuestion).mockResolvedValueOnce('是')
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    const response = await service.submitQuestion(created.sessionId, '他喜欢吃辣吗？')

    expect(response.answer).toBe('是')
    expect(vi.mocked(hostService.answerQuestion)).toHaveBeenCalledWith({
      question: '他喜欢吃辣吗？',
      figure: expect.objectContaining({
        name: '秦始皇',
        era: '秦朝',
      }),
    })
  })

  it('falls back to the host model when local rules have only low confidence', async () => {
    vi.mocked(hostService.answerQuestion).mockResolvedValueOnce('是')
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    const response = await service.submitQuestion(created.sessionId, '他是汉的吗？')
    const events = await eventRepository.listSessionEvents({ sessionId: created.sessionId })

    expect(response.answer).toBe('是')
    expect(vi.mocked(hostService.answerQuestion)).toHaveBeenCalledWith({
      question: '他是汉的吗？',
      figure: expect.objectContaining({
        name: '秦始皇',
      }),
    })
    expect(events[0]).toMatchObject({
      answerSource: 'llm',
      answerConfidence: 0.7,
      answerReason: 'local-low-confidence',
    })
  })

  it('stores local answer source metadata for high-confidence answers', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    await service.submitQuestion(created.sessionId, '他是皇帝吗？')
    const events = await eventRepository.listSessionEvents({ sessionId: created.sessionId })

    expect(vi.mocked(hostService.answerQuestion)).not.toHaveBeenCalled()
    expect(events[0]).toMatchObject({
      answerText: '是',
      answerSource: 'local',
      answerConfidence: 0.95,
      answerReason: 'role',
    })
  })

  it('classifies known-name final-answer intent locally', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    await expect(service.classifyQuestionIntent(created.sessionId, '是不是李白？')).resolves.toEqual({
      type: 'guess',
      guess: '李白',
    })
    await expect(service.classifyQuestionIntent(created.sessionId, '他是不是关汉卿？')).resolves.toEqual({
      type: 'guess',
      guess: '关汉卿',
    })

    expect(vi.mocked(hostService.classifyQuestionIntent)).not.toHaveBeenCalled()
  })

  it('uses the host model to classify unknown final-answer intent', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    const intent = await service.classifyQuestionIntent(created.sessionId, '是不是张三？')

    expect(intent).toEqual({
      type: 'guess',
      guess: '李白',
    })
    expect(vi.mocked(hostService.classifyQuestionIntent)).toHaveBeenCalledWith({
      question: '是不是张三？',
    })
  })

  it('keeps attribute and relationship questions out of final-answer intent', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 3,
      figureScope: 'all',
    })

    await expect(service.classifyQuestionIntent(created.sessionId, '他是男性吗？')).resolves.toEqual({ type: 'question' })
    await expect(service.classifyQuestionIntent(created.sessionId, '他是古代人物吗？')).resolves.toEqual({ type: 'question' })
    await expect(service.classifyQuestionIntent(created.sessionId, '他是李白的朋友吗？')).resolves.toEqual({ type: 'question' })
    expect(vi.mocked(hostService.classifyQuestionIntent)).not.toHaveBeenCalled()
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

  it('returns two safe AI hints and tracks the remaining hint count', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 20,
      figureScope: 'all',
    })

    const firstHint = await service.requestHint(created.sessionId)
    const secondHint = await service.requestHint(created.sessionId)
    const snapshot = await service.getSessionSnapshot(created.sessionId)

    expect(firstHint.remainingHints).toBe(1)
    expect(secondHint.remainingHints).toBe(0)
    expect(snapshot.remainingHints).toBe(0)
    expect(snapshot.hints).toEqual([
      { hint: firstHint.hint },
      { hint: secondHint.hint },
    ])
    expect(firstHint.hint).not.toContain('司马迁')
    expect(secondHint.hint).not.toContain('司马迁')
  })

  it('does not repeat AI hint dimensions that were already asked about', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 20,
      figureScope: 'all',
    })

    await service.submitQuestion(created.sessionId, '他是唐朝以前的吗？')
    const hint = await service.requestHint(created.sessionId)

    expect(hint.hint).not.toContain('秦朝')
    expect(hint.hint).toContain('身份')
  })

  it('rejects a third AI hint for the same session', async () => {
    const created = await service.createSession({
      level: 4,
      questionLimit: 20,
      figureScope: 'all',
    })

    await service.requestHint(created.sessionId)
    await service.requestHint(created.sessionId)

    await expect(service.requestHint(created.sessionId)).rejects.toMatchObject({
      statusCode: 400,
      message: '本局 AI 提示次数已用完',
    })
  })
})
