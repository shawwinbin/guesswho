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

export interface HintRecord {
  hint: string
}

export interface LevelProgress {
  currentLevel: number
  highestUnlockedLevel: number
  highestClearedLevel: number
  levelStreak: number
  lastResult: 'win' | 'lose' | null
}

export interface GameSessionSnapshot {
  sessionId: string
  level: number
  status: 'playing' | 'ended'
  questionCount: number
  questionLimit: number
  remainingQuestions: number | null
  history: QuestionAnswer[]
  guesses: GuessRecord[]
  hints?: HintRecord[]
  remainingHints?: number
  revealedName?: string
}

export interface CreateSessionRequest {
  level: number
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

export type QuestionIntent =
  | { type: 'question' }
  | { type: 'guess'; guess: string }

export interface HintResponse {
  hint: string
  hints: HintRecord[]
  remainingHints: number
}
