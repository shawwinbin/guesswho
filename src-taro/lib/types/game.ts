import { FigureScope } from './figure'

export type YesNoAnswer = '是' | '不是'

export interface GameSettings {
  questionLimit: number
  figureScope: FigureScope
  voiceMode: boolean
  continuousVoiceMode: boolean
  autoStartContinuousVoice?: boolean
}

export interface QuestionAnswer {
  question: string
  answer: YesNoAnswer
}

export interface GuessRecord {
  guess: string
  isCorrect: boolean
}

export interface GameSessionSnapshot {
  sessionId: string
  status: 'playing' | 'ended'
  questionCount: number
  questionLimit: number
  remainingQuestions: number | null
  history: QuestionAnswer[]
  guesses: GuessRecord[]
  revealedName?: string
}

export interface CreateSessionRequest {
  questionLimit: number
  figureScope: FigureScope
}

export interface QuestionResponse {
  answer: YesNoAnswer
  status: 'playing' | 'ended'
  questionCount: number
  questionLimit: number
  remainingQuestions: number | null
  revealedName?: string
}

export interface GuessResponse {
  isCorrect: boolean
  revealedName: string
  status: 'ended'
}