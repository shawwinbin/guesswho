import type { GameSettings } from './types'

const STORAGE_KEY = 'history-figure-guess-settings'

const DEFAULT_SETTINGS: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
}

function normalizeSettings(settings: Partial<GameSettings>): GameSettings {
  const merged = { ...DEFAULT_SETTINGS, ...settings }

  if (!merged.voiceMode) {
    return {
      ...merged,
      continuousVoiceMode: false,
    }
  }

  return merged
}

export function loadSettings(): GameSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return normalizeSettings(parsed)
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_SETTINGS
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
  } catch {
    // Ignore storage errors
  }
}
