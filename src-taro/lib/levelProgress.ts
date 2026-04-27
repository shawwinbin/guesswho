import { storage } from './storage'
import type { LevelProgress } from './types'

export const LEVEL_PROGRESS_KEY = 'history-figure-guess-level-progress'

const LEVEL_TITLES = [
  { minLevel: 25, title: '传奇', hint: '传奇阶段：冷门与跨地域人物为主，仍固定 20 次提问。' },
  { minLevel: 17, title: '高手', hint: '高手阶段：人物更冷门，身份相近，需要用时代、地域、作品或事件排除。' },
  { minLevel: 11, title: '进阶', hint: '进阶阶段：常见人物减少，同类型人物增多，提问要更精准。' },
  { minLevel: 5, title: '常识', hint: '常识阶段：仍以常见人物为主，开始出现更多朝代和职业。' },
  { minLevel: 1, title: '入门', hint: '入门阶段：高知名度人物，先熟悉 20 次提问节奏。' },
] as const

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isLevelProgress(value: unknown): value is LevelProgress {
  if (!value || typeof value !== 'object') {
    return false
  }

  const progress = value as Partial<LevelProgress>

  return (
    isPositiveInteger(progress.currentLevel) &&
    isPositiveInteger(progress.highestUnlockedLevel) &&
    isNonNegativeInteger(progress.highestClearedLevel) &&
    isNonNegativeInteger(progress.levelStreak) &&
    (progress.lastResult === 'win' || progress.lastResult === 'lose' || progress.lastResult === null)
  )
}

function normalizeLevel(level: number): number {
  return Number.isInteger(level) && level >= 1 ? level : 1
}

export function createDefaultLevelProgress(): LevelProgress {
  return {
    currentLevel: 1,
    highestUnlockedLevel: 1,
    highestClearedLevel: 0,
    levelStreak: 0,
    lastResult: null,
  }
}

export function readLevelProgress(): LevelProgress {
  const progress = storage.get<LevelProgress>(LEVEL_PROGRESS_KEY)

  if (!isLevelProgress(progress)) {
    return createDefaultLevelProgress()
  }

  const currentLevel = Math.min(progress.currentLevel, progress.highestUnlockedLevel)
  const highestUnlockedLevel = Math.max(progress.highestUnlockedLevel, currentLevel)
  const highestClearedLevel = Math.min(progress.highestClearedLevel, highestUnlockedLevel - 1)

  return {
    currentLevel,
    highestUnlockedLevel,
    highestClearedLevel: Math.max(0, highestClearedLevel),
    levelStreak: progress.levelStreak,
    lastResult: progress.lastResult,
  }
}

export function writeLevelProgress(progress: LevelProgress): void {
  storage.set(LEVEL_PROGRESS_KEY, progress)
}

export function clearLevelProgress(): void {
  storage.remove(LEVEL_PROGRESS_KEY)
}

export function setCurrentLevel(level: number): LevelProgress {
  const current = readLevelProgress()
  const nextLevel = Math.min(normalizeLevel(level), current.highestUnlockedLevel)
  const nextProgress: LevelProgress = {
    ...current,
    currentLevel: nextLevel,
  }

  writeLevelProgress(nextProgress)

  return nextProgress
}

export function applyLevelResult(progress: LevelProgress, result: 'win' | 'lose'): LevelProgress {
  if (result === 'win') {
    const clearedLevel = progress.currentLevel
    const nextLevel = clearedLevel + 1

    return {
      currentLevel: nextLevel,
      highestUnlockedLevel: Math.max(progress.highestUnlockedLevel, nextLevel),
      highestClearedLevel: Math.max(progress.highestClearedLevel, clearedLevel),
      levelStreak: progress.levelStreak + 1,
      lastResult: 'win',
    }
  }

  return {
    ...progress,
    levelStreak: 0,
    lastResult: 'lose',
  }
}

export function getLevelTitle(level: number): string {
  const normalizedLevel = normalizeLevel(level)

  return LEVEL_TITLES.find(entry => normalizedLevel >= entry.minLevel)?.title ?? '入门'
}

export function getLevelHint(level: number): string {
  const normalizedLevel = normalizeLevel(level)

  return LEVEL_TITLES.find(entry => normalizedLevel >= entry.minLevel)?.hint ?? LEVEL_TITLES[LEVEL_TITLES.length - 1].hint
}

export function buildVisibleLevels(progress: LevelProgress, radius = 3): number[] {
  const safeRadius = Math.max(0, Math.floor(radius))
  const maxLevel = Math.max(1, progress.highestUnlockedLevel)
  const currentLevel = Math.min(Math.max(1, progress.currentLevel), maxLevel)
  const windowSize = safeRadius * 2 + 1

  let start = Math.max(1, currentLevel - safeRadius)
  let end = Math.min(maxLevel, currentLevel + safeRadius)

  while (end - start + 1 < windowSize && start > 1) {
    start -= 1
  }

  while (end - start + 1 < windowSize && end < maxLevel) {
    end += 1
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
