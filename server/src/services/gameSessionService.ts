import { randomUUID } from 'node:crypto'
import { selectRandomFigure } from '../lib/figureCatalog.js'
import { badRequest, notFound } from '../lib/errors.js'
import { answerQuestionLocally, judgeGuessLocally } from '../lib/localAnswerEngine.js'
import type { SecretFigure, YesNoAnswer } from '../lib/normalization.js'
import type {
  GameEventRepository,
  GameSessionRecord,
  GameSessionRepository,
} from '../repositories/gameSessionRepository.js'
import type { FigureScope, GuessVerdict, HostLlmService } from './hostLlmService.js'

export interface QuestionHistoryItem {
  question: string
  answer: YesNoAnswer
}

export interface GuessHistoryItem {
  guess: string
  isCorrect: boolean
}

export interface HintHistoryItem {
  hint: string
}

export interface GameSessionSnapshot {
  sessionId: string
  level: number
  status: 'playing' | 'ended'
  questionCount: number
  questionLimit: number
  remainingQuestions: number | null
  history: QuestionHistoryItem[]
  guesses: GuessHistoryItem[]
  hints: HintHistoryItem[]
  remainingHints: number
  revealedName?: string
}

export interface SubmitQuestionResponse {
  answer: YesNoAnswer
  status: 'playing' | 'ended'
  questionCount: number
  questionLimit: number
  remainingQuestions: number | null
  revealedName?: string
}

export interface SubmitGuessResponse extends GuessVerdict {
  status: 'ended'
}

export interface HintResponse {
  hint: string
  hints: HintHistoryItem[]
  remainingHints: number
}

interface GameSessionServiceParams {
  sessionRepository: GameSessionRepository
  eventRepository: GameEventRepository
  hostService: HostLlmService
}

const MAX_HINTS_PER_SESSION = 2

export class GameSessionService {
  constructor(private readonly deps: GameSessionServiceParams) {}

  async createSession(input: { level: number; questionLimit: number; figureScope: FigureScope }): Promise<GameSessionSnapshot> {
    if (!Number.isInteger(input.level) || input.level < 1) {
      throw badRequest('关卡必须是大于等于 1 的整数')
    }

    if (input.questionLimit < 0) {
      throw badRequest('提问次数上限不能小于 0')
    }

    const selectedFigure = selectRandomFigure(input.figureScope, input.level)
    const figure: SecretFigure = {
      name: selectedFigure.name,
      aliases: selectedFigure.aliases,
      era: selectedFigure.era,
    }
    const record = await this.deps.sessionRepository.createSession({
      id: randomUUID(),
      level: input.level,
      questionLimit: input.questionLimit,
      secretFigure: figure,
    })

    return this.buildSnapshot(record)
  }

  async getSessionSnapshot(sessionId: string): Promise<GameSessionSnapshot> {
    const record = await this.requireSession(sessionId)
    return this.buildSnapshot(record)
  }

  async submitQuestion(sessionId: string, question: string): Promise<SubmitQuestionResponse> {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      throw badRequest('问题不能为空')
    }

    const record = await this.requirePlayableSession(sessionId)
    const figure = this.getSecretFigure(record)
    const answer = answerQuestionLocally(figure, trimmedQuestion)

    const nextCount = record.questionCount + 1
    const limitReached = record.questionLimit > 0 && nextCount >= record.questionLimit
    const nextStatus = limitReached ? 'ended' : 'playing'
    const revealedName = limitReached ? record.secretFigureName : undefined

    await this.deps.eventRepository.appendQuestionEvent(sessionId, trimmedQuestion, answer)
    const updated = await this.deps.sessionRepository.updateSessionAfterQuestion(sessionId, {
      questionCount: nextCount,
      status: nextStatus,
      revealedName,
    })

    return {
      answer,
      status: updated.status,
      questionCount: updated.questionCount,
      questionLimit: updated.questionLimit,
      remainingQuestions: getRemainingQuestions(updated),
      ...(updated.revealedName ? { revealedName: updated.revealedName } : {}),
    }
  }

  async submitGuess(sessionId: string, guess: string): Promise<SubmitGuessResponse> {
    const trimmedGuess = guess.trim()
    if (!trimmedGuess) {
      throw badRequest('猜测不能为空')
    }

    const record = await this.requirePlayableSession(sessionId)
    const figure = this.getSecretFigure(record)
    const verdict = {
      isCorrect: judgeGuessLocally(figure, trimmedGuess),
      revealedName: figure.name,
    }

    await this.deps.eventRepository.appendGuessEvent(sessionId, trimmedGuess, verdict.isCorrect)
    await this.deps.sessionRepository.updateSessionAfterGuess(sessionId, {
      revealedName: verdict.revealedName,
    })

    return {
      ...verdict,
      status: 'ended',
    }
  }

  async requestHint(sessionId: string): Promise<HintResponse> {
    const record = await this.requirePlayableSession(sessionId)
    const events = await this.deps.eventRepository.listSessionEvents({ sessionId })
    const existingHints = events
      .filter(event => event.eventType === 'hint' && event.hintText)
      .map(event => ({ hint: event.hintText! }))

    if (existingHints.length >= MAX_HINTS_PER_SESSION) {
      throw badRequest('本局 AI 提示次数已用完')
    }

    const hint = buildSafeHint(record, existingHints.length)
    await this.deps.eventRepository.appendHintEvent(sessionId, hint)

    const hints = [...existingHints, { hint }]
    return {
      hint,
      hints,
      remainingHints: Math.max(MAX_HINTS_PER_SESSION - hints.length, 0),
    }
  }

  private async requireSession(sessionId: string): Promise<GameSessionRecord> {
    const record = await this.deps.sessionRepository.findSessionById(sessionId)
    if (!record) {
      throw notFound('会话不存在')
    }

    return record
  }

  private async requirePlayableSession(sessionId: string): Promise<GameSessionRecord> {
    const record = await this.requireSession(sessionId)
    if (record.status === 'ended') {
      throw badRequest('当前会话已结束')
    }

    return record
  }

  private getSecretFigure(record: GameSessionRecord): SecretFigure {
    return {
      name: record.secretFigureName,
      aliases: record.secretFigureAliases,
      era: record.secretFigureEra,
    }
  }

  private async buildSnapshot(record: GameSessionRecord): Promise<GameSessionSnapshot> {
    const events = await this.deps.eventRepository.listSessionEvents({ sessionId: record.id })

    return {
      sessionId: record.id,
      level: record.level,
      status: record.status,
      questionCount: record.questionCount,
      questionLimit: record.questionLimit,
      remainingQuestions: getRemainingQuestions(record),
      history: events
        .filter(event => event.eventType === 'question' && event.questionText && event.answerText)
        .map(event => ({
          question: event.questionText!,
          answer: event.answerText!,
        })),
      guesses: events
        .filter(event => event.eventType === 'guess' && event.guessText && typeof event.isCorrect === 'boolean')
        .map(event => ({
          guess: event.guessText!,
          isCorrect: event.isCorrect!,
        })),
      hints: events
        .filter(event => event.eventType === 'hint' && event.hintText)
        .map(event => ({
          hint: event.hintText!,
        })),
      remainingHints: getRemainingHints(events),
      ...(record.revealedName ? { revealedName: record.revealedName } : {}),
    }
  }
}

function getRemainingQuestions(record: Pick<GameSessionRecord, 'questionCount' | 'questionLimit'>): number | null {
  if (record.questionLimit <= 0) return null
  return Math.max(record.questionLimit - record.questionCount, 0)
}

function getRemainingHints(events: Array<{ eventType: string }>): number {
  const usedHints = events.filter(event => event.eventType === 'hint').length
  return Math.max(MAX_HINTS_PER_SESSION - usedHints, 0)
}

function buildSafeHint(record: GameSessionRecord, usedHints: number): string {
  const era = record.secretFigureEra || '一个明确的历史时期'

  if (usedHints === 0) {
    return `这位人物主要活跃在${era}。`
  }

  return `继续从${era}相关的身份、作品或重大事件切入，会比直接猜名字更稳。`
}
