import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FigureScope } from '../types/figure.js'
import {
  figures,
  filterFiguresByScope,
  filterFiguresByScopeAndLevel,
  getDifficultyForLevel,
  selectRandomFigure,
} from './figureCatalog.js'

describe('figureCatalog', () => {
  const publicScopes: FigureScope[] = ['all', 'poet', 'emperor', 'military', 'philosopher', 'female', 'tang-song']
  const representativeLevels = [1, 5, 11, 17, 25]

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('filters figures by the requested scope', () => {
    const poets = filterFiguresByScope('poet')
    const tangSongFigures = filterFiguresByScope('tang-song')

    expect(poets.length).toBeGreaterThan(0)
    expect(poets.every(figure => figure.role === '诗人')).toBe(true)
    expect(tangSongFigures.length).toBeGreaterThan(0)
    expect(tangSongFigures.every(figure => ['唐朝', '宋朝'].includes(figure.era))).toBe(true)
  })

  it('keeps the game catalog large with roughly 80 percent Chinese figures', () => {
    const nonChineseFigures = figures.filter(figure => !figure.isChinese)
    const chineseFigures = figures.filter(figure => figure.isChinese)
    const ids = new Set(figures.map(figure => figure.id))
    const chineseRatio = chineseFigures.length / figures.length

    expect(figures.length).toBeGreaterThanOrEqual(200)
    expect(figures.length).toBeLessThanOrEqual(300)
    expect(chineseRatio).toBeGreaterThanOrEqual(0.75)
    expect(chineseRatio).toBeLessThanOrEqual(0.85)
    expect(nonChineseFigures.length).toBeGreaterThanOrEqual(40)
    expect(nonChineseFigures.every(figure => figure.region !== '中国')).toBe(true)
    expect(chineseFigures.every(figure => figure.region === '中国')).toBe(true)
    expect(ids.size).toBe(figures.length)
  })

  it('maps levels to progressive figure difficulty pools while keeping 20 questions fixed elsewhere', () => {
    expect(getDifficultyForLevel(1)).toBe(1)
    expect(getDifficultyForLevel(4)).toBe(1)
    expect(getDifficultyForLevel(5)).toBe(2)
    expect(getDifficultyForLevel(10)).toBe(2)
    expect(getDifficultyForLevel(11)).toBe(3)
    expect(getDifficultyForLevel(16)).toBe(3)
    expect(getDifficultyForLevel(17)).toBe(4)
    expect(getDifficultyForLevel(24)).toBe(4)
    expect(getDifficultyForLevel(25)).toBe(5)

    const easyFigures = filterFiguresByScopeAndLevel('all', 2)

    expect(easyFigures.length).toBeGreaterThan(0)
    expect(easyFigures.every(figure => figure.difficulty === 1)).toBe(true)
  })

  it('uses higher difficulty pools for higher levels', () => {
    const advancedPoets = filterFiguresByScopeAndLevel('poet', 17)

    expect(advancedPoets.length).toBeGreaterThan(0)
    expect(advancedPoets.every(figure => figure.role === '诗人')).toBe(true)
    expect(advancedPoets.every(figure => figure.difficulty === 4)).toBe(true)
  })

  it('falls back to the nearest lower difficulty in the same scope when needed', () => {
    const fallbackEmperors = filterFiguresByScopeAndLevel('emperor', 25)

    expect(fallbackEmperors.length).toBeGreaterThan(0)
    expect(fallbackEmperors.every(figure => figure.role === '皇帝')).toBe(true)
    expect(fallbackEmperors.every(figure => figure.difficulty === 4)).toBe(true)
  })

  it('returns a non-empty level pool for every public scope at representative levels', () => {
    for (const scope of publicScopes) {
      for (const level of representativeLevels) {
        const figures = filterFiguresByScopeAndLevel(scope, level)

        expect(figures, `scope=${scope} level=${level}`).not.toHaveLength(0)
      }
    }
  })

  it('selects different figures when random values point at different indices', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)

    const first = selectRandomFigure('all')
    const second = selectRandomFigure('all')

    expect(first.name).not.toBe(second.name)
  })

  it('selects from the fallback pool when the target difficulty pool is empty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const figure = selectRandomFigure('emperor', 25)

    expect(figure.role).toBe('皇帝')
    expect(figure.difficulty).toBe(4)
  })

  it('keeps level-aware selection non-empty for every public scope at representative levels', () => {
    for (const scope of publicScopes) {
      for (const level of representativeLevels) {
        expect(() => selectRandomFigure(scope, level), `scope=${scope} level=${level}`).not.toThrow()
      }
    }
  })

  it('treats an omitted level as level 1 selection', () => {
    const expectedPool = filterFiguresByScopeAndLevel('all', 1)
    const fullScopeFigures = filterFiguresByScope('all')
    const randomValue = Array.from({ length: expectedPool.length }, (_, index) => (index + 0.5) / expectedPool.length)
      .find(value => {
        const levelIndex = Math.floor(value * expectedPool.length)
        const fullCatalogIndex = Math.floor(value * fullScopeFigures.length)

        return expectedPool[levelIndex].id !== fullScopeFigures[fullCatalogIndex].id
      })

    expect(randomValue).toBeDefined()

    vi.spyOn(Math, 'random').mockReturnValue(randomValue!)

    const expectedIndex = Math.floor(randomValue! * expectedPool.length)
    const fullCatalogIndex = Math.floor(randomValue! * fullScopeFigures.length)
    const selectedFigure = selectRandomFigure('all')

    expect(selectedFigure).toEqual(expectedPool[expectedIndex])
    expect(selectedFigure).not.toEqual(fullScopeFigures[fullCatalogIndex])
    expect(selectedFigure.difficulty).toBe(1)
  })
})
