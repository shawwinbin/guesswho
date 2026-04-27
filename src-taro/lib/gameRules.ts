import type { GameSettings } from './types'

export const FIXED_QUESTION_LIMIT = 20

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  questionLimit: FIXED_QUESTION_LIMIT,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false,
}

export function normalizeGameSettings(settings?: Partial<GameSettings> | null): GameSettings {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...settings,
    questionLimit: FIXED_QUESTION_LIMIT,
  }
}
