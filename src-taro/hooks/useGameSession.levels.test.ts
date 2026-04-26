// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEVEL_PROGRESS_KEY } from '../lib/levelProgress'
import type { GameSessionSnapshot, GameSettings, LevelProgress } from '../lib/types'

const SESSION_KEY = 'history-figure-guess-session'

const {
  createSessionMock,
  fetchSessionMock,
  submitGuessMock,
  submitQuestionMock,
  storageGetMock,
  storageRemoveMock,
  storageSetMock,
} = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  fetchSessionMock: vi.fn(),
  submitGuessMock: vi.fn(),
  submitQuestionMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  storageSetMock: vi.fn(),
}))

vi.mock('../lib/gameApi', () => ({
  createSession: createSessionMock,
  fetchSession: fetchSessionMock,
  submitGuess: submitGuessMock,
  submitQuestion: submitQuestionMock,
}))

vi.mock('../lib/storage', () => ({
  storage: {
    get: storageGetMock,
    remove: storageRemoveMock,
    set: storageSetMock,
  },
}))

import { useGameSession } from './useGameSession'

const settings: GameSettings = {
  questionLimit: 20,
  figureScope: 'all',
  voiceMode: false,
  continuousVoiceMode: false,
  autoStartContinuousVoice: false,
}

function createProgress(overrides: Partial<LevelProgress> = {}): LevelProgress {
  return {
    currentLevel: 1,
    highestUnlockedLevel: 1,
    highestClearedLevel: 0,
    levelStreak: 0,
    lastResult: null,
    ...overrides,
  }
}

function createSnapshot(overrides: Partial<GameSessionSnapshot> = {}): GameSessionSnapshot {
  return {
    sessionId: 'session-1',
    level: 1,
    status: 'playing',
    questionCount: 0,
    questionLimit: 20,
    remainingQuestions: 20,
    history: [],
    guesses: [],
    ...overrides,
  }
}

function createLegacySnapshot(overrides: Record<string, unknown> = {}): GameSessionSnapshot {
  const snapshot: Record<string, unknown> = {
    ...createSnapshot(),
    ...overrides,
  }

  delete snapshot.level

  return snapshot as unknown as GameSessionSnapshot
}

describe('useGameSession level wiring', () => {
  beforeEach(() => {
    createSessionMock.mockReset()
    fetchSessionMock.mockReset()
    submitGuessMock.mockReset()
    submitQuestionMock.mockReset()
    storageGetMock.mockReset()
    storageRemoveMock.mockReset()
    storageSetMock.mockReset()
    storageGetMock.mockReturnValue(null)
  })

  it('passes the selected level into createSession when starting a game', async () => {
    createSessionMock.mockResolvedValue(createSnapshot({ level: 7 }))

    const { result } = renderHook(() => useGameSession(settings))

    await act(async () => {
      await result.current.startGame(7)
    })

    expect(createSessionMock).toHaveBeenCalledWith({
      questionLimit: 20,
      figureScope: 'all',
      level: 7,
    })
    expect(result.current.state.level).toBe(7)
  })

  it('restores legacy sessions with the locally selected current level when snapshot.level is missing', async () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === SESSION_KEY) return 'legacy-session'
      if (key === LEVEL_PROGRESS_KEY) return createProgress({
        currentLevel: 5,
        highestUnlockedLevel: 6,
        highestClearedLevel: 4,
      })
      return null
    })
    fetchSessionMock.mockResolvedValue(createLegacySnapshot())

    const { result } = renderHook(() => useGameSession(settings))

    await waitFor(() => {
      expect(fetchSessionMock).toHaveBeenCalledWith('legacy-session')
    })

    expect(result.current.state.level).toBe(5)
  })

  it('falls back to level 1 when restoring a legacy session and local progress is unavailable', async () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === SESSION_KEY) return 'legacy-session'
      if (key === LEVEL_PROGRESS_KEY) return null
      return null
    })
    fetchSessionMock.mockResolvedValue(createLegacySnapshot())

    const { result } = renderHook(() => useGameSession(settings))

    await waitFor(() => {
      expect(fetchSessionMock).toHaveBeenCalledWith('legacy-session')
    })

    expect(result.current.state.level).toBe(1)
  })

  it('reports restore completion only after an in-flight restore finishes', async () => {
    let resolveFetch: ((snapshot: GameSessionSnapshot) => void) | null = null

    storageGetMock.mockImplementation((key: string) => {
      if (key === SESSION_KEY) return 'saved-session'
      return null
    })
    fetchSessionMock.mockImplementation(() => new Promise<GameSessionSnapshot>((resolve) => {
      resolveFetch = resolve
    }))

    const { result } = renderHook(() => useGameSession(settings))

    expect(result.current.isRestoreComplete).toBe(false)

    await act(async () => {
      resolveFetch?.(createSnapshot({ sessionId: 'saved-session', level: 3 }))
    })

    await waitFor(() => {
      expect(result.current.isRestoreComplete).toBe(true)
    })
  })

  it('restart preserves the current active level when no override is provided', async () => {
    createSessionMock
      .mockResolvedValueOnce(createSnapshot({ sessionId: 'session-1', level: 4 }))
      .mockResolvedValueOnce(createSnapshot({ sessionId: 'session-2', level: 4 }))

    const { result } = renderHook(() => useGameSession(settings))

    await act(async () => {
      await result.current.startGame(4)
    })

    await act(async () => {
      await result.current.restart()
    })

    expect(createSessionMock).toHaveBeenNthCalledWith(1, {
      questionLimit: 20,
      figureScope: 'all',
      level: 4,
    })
    expect(createSessionMock).toHaveBeenNthCalledWith(2, {
      questionLimit: 20,
      figureScope: 'all',
      level: 4,
    })
    expect(result.current.state.level).toBe(4)
  })

  it('restart uses the override level when one is provided', async () => {
    createSessionMock
      .mockResolvedValueOnce(createSnapshot({ sessionId: 'session-1', level: 4 }))
      .mockResolvedValueOnce(createSnapshot({ sessionId: 'session-2', level: 9 }))

    const { result } = renderHook(() => useGameSession(settings))

    await act(async () => {
      await result.current.startGame(4)
    })

    await act(async () => {
      await result.current.restart(9)
    })

    expect(createSessionMock).toHaveBeenNthCalledWith(2, {
      questionLimit: 20,
      figureScope: 'all',
      level: 9,
    })
    expect(result.current.state.level).toBe(9)
  })
})
