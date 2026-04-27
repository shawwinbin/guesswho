import { beforeEach, describe, expect, it, vi } from 'vitest'

const { storageGetMock, storageSetMock } = vi.hoisted(() => ({
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
}))

vi.mock('./storage', () => ({
  storage: {
    get: storageGetMock,
    set: storageSetMock,
  },
}))

import {
  LEVEL_PROGRESS_KEY,
  applyLevelResult,
  buildVisibleLevels,
  createDefaultLevelProgress,
  getLevelHint,
  getLevelTitle,
  readLevelProgress,
  setCurrentLevel,
  writeLevelProgress,
} from './levelProgress'
import type { LevelProgress } from './types'

describe('levelProgress', () => {
  beforeEach(() => {
    storageGetMock.mockReset()
    storageSetMock.mockReset()
  })

  it('provides sane default progress values', () => {
    expect(createDefaultLevelProgress()).toEqual<LevelProgress>({
      currentLevel: 1,
      highestUnlockedLevel: 1,
      highestClearedLevel: 0,
      levelStreak: 0,
      lastResult: null,
    })
  })

  it('falls back to defaults when stored progress is missing or malformed', () => {
    storageGetMock.mockReturnValueOnce(null).mockReturnValueOnce({
      currentLevel: 'bad',
    })

    expect(readLevelProgress()).toEqual(createDefaultLevelProgress())
    expect(readLevelProgress()).toEqual(createDefaultLevelProgress())
  })

  it('normalizes shape-valid but inconsistent stored progress', () => {
    storageGetMock.mockReturnValueOnce({
      currentLevel: 7,
      highestUnlockedLevel: 5,
      highestClearedLevel: 8,
      levelStreak: 2,
      lastResult: 'win',
    })

    expect(readLevelProgress()).toEqual<LevelProgress>({
      currentLevel: 5,
      highestUnlockedLevel: 5,
      highestClearedLevel: 4,
      levelStreak: 2,
      lastResult: 'win',
    })
  })

  it('preserves highest cleared progress when replaying an older unlocked level', () => {
    storageGetMock.mockReturnValueOnce({
      currentLevel: 3,
      highestUnlockedLevel: 6,
      highestClearedLevel: 5,
      levelStreak: 0,
      lastResult: 'lose',
    })

    expect(readLevelProgress()).toEqual<LevelProgress>({
      currentLevel: 3,
      highestUnlockedLevel: 6,
      highestClearedLevel: 5,
      levelStreak: 0,
      lastResult: 'lose',
    })
  })

  it('writes and clamps the current level through storage helpers', () => {
    storageGetMock.mockReturnValueOnce({
      currentLevel: 2,
      highestUnlockedLevel: 3,
      highestClearedLevel: 2,
      levelStreak: 1,
      lastResult: 'win',
    })

    const updated = setCurrentLevel(4)

    expect(updated).toEqual({
      currentLevel: 3,
      highestUnlockedLevel: 3,
      highestClearedLevel: 2,
      levelStreak: 1,
      lastResult: 'win',
    })
    expect(storageSetMock).toHaveBeenCalledWith(LEVEL_PROGRESS_KEY, updated)

    writeLevelProgress(updated)

    expect(storageSetMock).toHaveBeenLastCalledWith(LEVEL_PROGRESS_KEY, updated)
  })

  it('winning advances current, unlocked, cleared, streak, and last result', () => {
    const next = applyLevelResult(
      {
        currentLevel: 4,
        highestUnlockedLevel: 4,
        highestClearedLevel: 3,
        levelStreak: 1,
        lastResult: 'lose',
      },
      'win',
    )

    expect(next).toEqual<LevelProgress>({
      currentLevel: 5,
      highestUnlockedLevel: 5,
      highestClearedLevel: 4,
      levelStreak: 2,
      lastResult: 'win',
    })
  })

  it('losing keeps highest unlocked level and resets the streak', () => {
    const next = applyLevelResult(
      {
        currentLevel: 5,
        highestUnlockedLevel: 7,
        highestClearedLevel: 4,
        levelStreak: 3,
        lastResult: 'win',
      },
      'lose',
    )

    expect(next).toEqual<LevelProgress>({
      currentLevel: 5,
      highestUnlockedLevel: 7,
      highestClearedLevel: 4,
      levelStreak: 0,
      lastResult: 'lose',
    })
  })

  it('maps level titles at the expected milestones', () => {
    expect(getLevelTitle(1)).toBe('入门')
    expect(getLevelTitle(5)).toBe('常识')
    expect(getLevelTitle(11)).toBe('进阶')
    expect(getLevelTitle(17)).toBe('高手')
    expect(getLevelTitle(25)).toBe('传奇')
  })

  it('returns a readable hint for each title bucket', () => {
    expect(getLevelHint(1)).toContain('20 次提问')
    expect(getLevelHint(7)).toContain('常见人物')
    expect(getLevelHint(13)).toContain('同类型人物')
    expect(getLevelHint(20)).toContain('冷门')
    expect(getLevelHint(25)).toContain('跨地域人物')
  })

  it('builds a centered visible level window within unlocked bounds', () => {
    const levels = buildVisibleLevels(
      {
        currentLevel: 8,
        highestUnlockedLevel: 12,
        highestClearedLevel: 7,
        levelStreak: 2,
        lastResult: 'win',
      },
      2,
    )

    expect(levels).toEqual([6, 7, 8, 9, 10])
  })

  it('builds visible levels near the left edge without going below one', () => {
    const levels = buildVisibleLevels(
      {
        currentLevel: 1,
        highestUnlockedLevel: 4,
        highestClearedLevel: 0,
        levelStreak: 0,
        lastResult: null,
      },
      2,
    )

    expect(levels).toEqual([1, 2, 3, 4])
  })

  it('builds visible levels near the right edge without exceeding unlocked bounds', () => {
    const levels = buildVisibleLevels(
      {
        currentLevel: 11,
        highestUnlockedLevel: 12,
        highestClearedLevel: 10,
        levelStreak: 2,
        lastResult: 'win',
      },
      2,
    )

    expect(levels).toEqual([8, 9, 10, 11, 12])
  })
})
