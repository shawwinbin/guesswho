import { randomUUID } from 'node:crypto'
import { selectRandomFigure } from '../lib/figureCatalog.js'
import { badRequest, notFound } from '../lib/errors.js'
import { answerQuestionByRules, findHistoricalFigure, judgeGuessLocally } from '../lib/localAnswerEngine.js'
import type { SecretFigure, YesNoAnswer } from '../lib/normalization.js'
import type {
  GameEventRepository,
  GameSessionRecord,
  GameSessionRepository,
} from '../repositories/gameSessionRepository.js'
import type { FigureScope, GuessVerdict, HostLlmService, QuestionIntent } from './hostLlmService.js'

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
const NON_GUESS_TERMS = new Set([
  '中国人',
  '外国人',
  '人物',
  '历史人物',
  '男人',
  '男性',
  '女性',
  '男的',
  '女的',
  '皇帝',
  '诗人',
  '词人',
  '武将',
  '将军',
  '军事家',
  '政治家',
  '思想家',
  '哲学家',
  '科学家',
  '文学家',
  '艺术家',
  '唐朝人',
  '宋朝人',
  '明朝人',
  '清朝人',
  '古代人',
  '古代人物',
  '现代人',
  '现代人物',
  '近代人',
  '近代人物',
  '当代人物',
])

const LOCAL_GUESS_PATTERNS = [
  /^(?:他|她|ta|TA)是(.+?)[吗嘛么]?[？?]?$/i,
  /^是(?:他|她|ta|TA)(.+?)[吗嘛么]?[？?]?$/i,
  /^(?:最终答案|答案|谜底)是(?:他|她|ta|TA)(.+?)[吗嘛么]?[？?]?$/i,
  /^(?:我猜|猜)(?:是)?(?:他|她|ta|TA)(.+?)[吗嘛么]?[？?]?$/i,
]

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
    const answer = await this.answerQuestion(figure, trimmedQuestion)

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

  async classifyQuestionIntent(sessionId: string, question: string): Promise<QuestionIntent> {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      throw badRequest('问题不能为空')
    }

    await this.requirePlayableSession(sessionId)

    const localIntent = classifyQuestionIntentLocally(trimmedQuestion)
    if (localIntent) {
      return localIntent
    }

    try {
      const hostIntent = await this.deps.hostService.classifyQuestionIntent({ question: trimmedQuestion })
      return sanitizeQuestionIntent(hostIntent)
    } catch {
      return { type: 'question' }
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

    const hint = buildSafeHint(record, existingHints.length, events)
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

  private async answerQuestion(figure: SecretFigure, question: string): Promise<YesNoAnswer> {
    const localAnswer = answerQuestionByRules(figure, question)
    if (localAnswer) {
      return localAnswer
    }

    try {
      return await this.deps.hostService.answerQuestion({ question, figure })
    } catch {
      return '不是'
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

function buildSafeHint(
  record: GameSessionRecord,
  usedHints: number,
  events: Array<{ eventType: string; questionText: string | null; hintText: string | null }>,
): string {
  const era = record.secretFigureEra || '一个明确的历史时期'
  const figure = findHistoricalFigure({
    name: record.secretFigureName,
    aliases: record.secretFigureAliases,
    era: record.secretFigureEra,
  })
  const askedQuestions = events
    .filter(event => event.eventType === 'question' && event.questionText)
    .map(event => normalizeHintText(event.questionText!))
  const usedHintTexts = events
    .filter(event => event.eventType === 'hint' && event.hintText)
    .map(event => event.hintText!)
  const candidates = [
    {
      dimension: 'era',
      hint: `这位人物主要活跃在${era}。`,
    },
    ...(figure ? [
      {
        dimension: 'role',
        hint: `这位人物的主要身份更接近${figure.role}。`,
      },
      {
        dimension: 'region',
        hint: `这位人物属于${figure.isChinese ? '中国历史人物' : '外国历史人物'}。`,
      },
      {
        dimension: 'gender',
        hint: `这位人物是${figure.gender === '女' ? '女性' : '男性'}。`,
      },
      {
        dimension: 'keyword',
        hint: `可以从“${figure.keywords[0] || figure.role}”这条线索继续缩小范围。`,
      },
    ] : []),
  ]
  const available = candidates.filter(candidate => {
    return !usedHintTexts.includes(candidate.hint) && !askedQuestions.some(question => isHintDimensionAlreadyAsked(question, candidate.dimension))
  })
  const selected = available[usedHints % Math.max(available.length, 1)] ?? candidates.find(candidate => !usedHintTexts.includes(candidate.hint)) ?? candidates[0]

  return selected.hint
}

function normalizeHintText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '').replace(/[？?！!。，,、]/g, '')
}

function isHintDimensionAlreadyAsked(question: string, dimension: string): boolean {
  if (dimension === 'era') {
    return ['朝', '代', '时期', '以前', '以后', '之前', '之后', '古代', '现代', '近代', '当代', '上古', '三国', '春秋', '战国'].some(token => question.includes(token))
  }

  if (dimension === 'role') {
    return ['身份', '职业', '皇帝', '诗人', '词人', '作家', '思想家', '哲学家', '科学家', '医学家', '将军', '武将', '政治家', '画家', '僧人'].some(token => question.includes(token))
  }

  if (dimension === 'region') {
    return ['中国', '外国', '欧洲', '美国', '英国', '法国', '德国', '日本', '印度', '俄罗斯'].some(token => question.includes(token))
  }

  if (dimension === 'gender') {
    return ['男', '女', '男性', '女性', '性别'].some(token => question.includes(token))
  }

  if (dimension === 'keyword') {
    return false
  }

  return false
}

function classifyQuestionIntentLocally(question: string): QuestionIntent | null {
  const normalizedQuestion = question.trim()

  for (const pattern of LOCAL_GUESS_PATTERNS) {
    const match = normalizedQuestion.match(pattern)
    if (!match?.[1]) continue

    const candidate = normalizeCandidate(match[1])
    if (isNonGuessCandidate(candidate)) {
      return { type: 'question' }
    }

    return {
      type: 'guess',
      guess: candidate,
    }
  }

  const compactQuestion = normalizeCandidate(normalizedQuestion)
  if (Array.from(NON_GUESS_TERMS).some(term => compactQuestion.includes(term))) {
    return { type: 'question' }
  }

  return null
}

function normalizeCandidate(candidate: string): string {
  return candidate
    .replace(/[，。！？?!,.、\s]/g, '')
    .replace(/^一位/, '')
    .replace(/^一个/, '')
    .trim()
}

function isNonGuessCandidate(candidate: string): boolean {
  return (
    candidate.length < 2 ||
    candidate.includes('的') ||
    NON_GUESS_TERMS.has(candidate) ||
    candidate.endsWith('人') ||
    candidate.endsWith('人物')
  )
}

function sanitizeQuestionIntent(intent: QuestionIntent): QuestionIntent {
  if (intent.type !== 'guess') return intent

  const candidate = normalizeCandidate(intent.guess)
  if (isNonGuessCandidate(candidate)) {
    return { type: 'question' }
  }

  return {
    type: 'guess',
    guess: candidate,
  }
}
