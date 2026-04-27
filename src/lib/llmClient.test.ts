import { beforeEach, describe, expect, it } from 'vitest'
import { loadSettings, saveSettings } from './llmClient'

describe('llmClient settings persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads default backend settings when storage is empty', () => {
    expect(loadSettings()).toEqual({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: false,
      continuousVoiceMode: false,
    })
  })

  it('saves and reloads backend settings from localStorage', () => {
    const settings = {
      questionLimit: 12,
      figureScope: 'poet' as const,
      voiceMode: true,
      continuousVoiceMode: true,
    }

    saveSettings(settings)

    expect(loadSettings()).toEqual(settings)
  })

  it('falls back to defaults when storage contains invalid json', () => {
    localStorage.setItem('history-figure-guess-settings', '{invalid-json')

    expect(loadSettings()).toEqual({
      questionLimit: 20,
      figureScope: 'all',
      voiceMode: false,
      continuousVoiceMode: false,
    })
  })
})
