import { badRequest } from '../lib/errors.js'
import type { FigureScope } from '../services/hostLlmService.js'

const ALLOWED_SCOPES = new Set<FigureScope>([
  'all',
  'poet',
  'emperor',
  'military',
  'philosopher',
  'female',
  'tang-song',
])

export function parseCreateSessionBody(input: unknown): {
  level: number
  questionLimit: number
  figureScope: FigureScope
} {
  const body = asObject(input)
  const level = body.level
  const questionLimit = body.questionLimit
  const figureScope = body.figureScope

  if (!Number.isInteger(level) || level < 1) {
    throw badRequest('level 必须是大于等于 1 的整数')
  }

  if (!Number.isInteger(questionLimit) || questionLimit < 0) {
    throw badRequest('questionLimit 必须是大于等于 0 的整数')
  }

  if (typeof figureScope !== 'string' || !ALLOWED_SCOPES.has(figureScope as FigureScope)) {
    throw badRequest('figureScope 非法')
  }

  return {
    level,
    questionLimit,
    figureScope: figureScope as FigureScope,
  }
}

export function parseQuestionBody(input: unknown): { question: string } {
  const body = asObject(input)
  if (typeof body.question !== 'string' || !body.question.trim()) {
    throw badRequest('question 不能为空')
  }

  return {
    question: body.question.trim(),
  }
}

export function parseGuessBody(input: unknown): { guess: string } {
  const body = asObject(input)
  if (typeof body.guess !== 'string' || !body.guess.trim()) {
    throw badRequest('guess 不能为空')
  }

  return {
    guess: body.guess.trim(),
  }
}

function asObject(input: unknown): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('请求体必须是对象')
  }

  return input as Record<string, any>
}
