import { additionalChineseFigures } from '../data/additionalChineseFigures.js'
import { additionalFigures } from '../data/additionalFigures.js'
import { figures as baseFigures } from '../data/figures.js'
import type { FigureScope, HistoricalFigure } from '../types/figure.js'

const ACTIVE_FOREIGN_FIGURE_LIMIT = 50

export const figures: HistoricalFigure[] = [
  ...baseFigures,
  ...additionalChineseFigures,
  ...additionalFigures.slice(0, ACTIVE_FOREIGN_FIGURE_LIMIT),
]

export function filterFiguresByScope(scope: FigureScope): HistoricalFigure[] {
  switch (scope) {
    case 'poet':
      return figures.filter(figure => figure.role === '诗人')
    case 'emperor':
      return figures.filter(figure => figure.role === '皇帝')
    case 'military':
      return figures.filter(figure => figure.isMilitaryLeader)
    case 'philosopher':
      return figures.filter(figure => figure.isPhilosopher)
    case 'female':
      return figures.filter(figure => figure.gender === '女')
    case 'tang-song':
      return figures.filter(figure => ['唐朝', '宋朝'].includes(figure.era))
    case 'all':
    default:
      return figures
  }
}

export function getDifficultyForLevel(level: number): HistoricalFigure['difficulty'] {
  if (level <= 4) {
    return 1
  }

  if (level <= 10) {
    return 2
  }

  if (level <= 16) {
    return 3
  }

  if (level <= 24) {
    return 4
  }

  return 5
}

export function filterFiguresByScopeAndLevel(scope: FigureScope, level: number): HistoricalFigure[] {
  const scopedFigures = filterFiguresByScope(scope)
  const targetDifficulty = getDifficultyForLevel(level)

  for (let difficulty = targetDifficulty; difficulty >= 1; difficulty -= 1) {
    const candidates = scopedFigures.filter(figure => figure.difficulty === difficulty)

    if (candidates.length > 0) {
      return candidates
    }
  }

  return []
}

export function selectRandomFigure(scope: FigureScope, level = 1): HistoricalFigure {
  const candidates = filterFiguresByScopeAndLevel(scope, level)

  if (candidates.length === 0) {
    throw new Error(`No figures available for scope: ${scope}`)
  }

  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}
