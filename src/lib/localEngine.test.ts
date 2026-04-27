import { describe, it, expect, beforeEach } from 'vitest'
import { filterFiguresByScope, selectRandomFigure, answerQuestion, checkGuess, type HistoricalFigure } from './localEngine'

describe('localEngine', () => {
  describe('selectRandomFigure', () => {
    it('filters poets when poet scope is selected', () => {
      const figures = filterFiguresByScope('poet')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => figure.role === '诗人')).toBe(true)
    })

    it('filters emperors when emperor scope is selected', () => {
      const figures = filterFiguresByScope('emperor')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => figure.role === '皇帝')).toBe(true)
    })

    it('filters military figures when military scope is selected', () => {
      const figures = filterFiguresByScope('military')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => figure.isMilitaryLeader)).toBe(true)
    })

    it('filters philosophers when philosopher scope is selected', () => {
      const figures = filterFiguresByScope('philosopher')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => figure.isPhilosopher)).toBe(true)
    })

    it('filters female figures when female scope is selected', () => {
      const figures = filterFiguresByScope('female')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => figure.gender === '女')).toBe(true)
    })

    it('filters Tang/Song figures when tang-song scope is selected', () => {
      const figures = filterFiguresByScope('tang-song')
      expect(figures.length).toBeGreaterThan(0)
      expect(figures.every(figure => ['唐朝', '宋朝'].includes(figure.era))).toBe(true)
    })

    it('returns a valid figure from the dataset', () => {
      const figure = selectRandomFigure()
      expect(figure).toBeDefined()
      expect(figure.id).toBeDefined()
      expect(figure.name).toBeDefined()
      expect(figure.aliases).toBeInstanceOf(Array)
    })

    it('returns different figures on multiple calls (randomness check)', () => {
      const results = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const figure = selectRandomFigure()
        results.add(figure.id)
      }
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('answerQuestion', () => {
    let figure: HistoricalFigure

    beforeEach(() => {
      figure = {
        id: 'qinshihuang',
        name: '秦始皇',
        aliases: ['嬴政', '秦始皇帝', 'Zheng'],
        era: '秦朝',
        role: '皇帝',
        gender: '男',
        region: '中国',
        keywords: ['统一', '焚书坑儒', '兵马俑', '长城', '郡县制'],
        isAlive: false,
        isChinese: true,
        isMilitaryLeader: false,
        isPhilosopher: false,
        isArtist: false,
        isScientist: false,
        isPolitician: true,
        bornYear: -259,
        diedYear: -210,
      }
    })

    it('answers 是 for matching dynasty/era', () => {
      const answer = answerQuestion(figure, '他是秦朝的人吗？')
      expect(answer).toBe('是')
    })

    it('answers 不是 for non-matching dynasty/era', () => {
      const answer = answerQuestion(figure, '他是唐朝的人吗？')
      expect(answer).toBe('不是')
    })

    it('answers 是 for matching role', () => {
      const answer = answerQuestion(figure, '他是皇帝吗？')
      expect(answer).toBe('是')
    })

    it('answers 是 for matching gender', () => {
      const answer = answerQuestion(figure, '他是男的吗？')
      expect(answer).toBe('是')
    })

    it('answers 不是 for non-matching gender', () => {
      const answer = answerQuestion(figure, '她是女的吗？')
      expect(answer).toBe('不是')
    })

    it('answers 是 for matching keyword', () => {
      const answer = answerQuestion(figure, '他统一过六国吗？')
      expect(answer).toBe('是')
    })

    it('answers 是 for matching isAlive false', () => {
      const answer = answerQuestion(figure, '他已经去世了吗？')
      expect(answer).toBe('是')
    })

    it('answers 不是 for matching isAlive true question', () => {
      const answer = answerQuestion(figure, '他还活着吗？')
      expect(answer).toBe('不是')
    })

    it('answers 是 for matching region', () => {
      const answer = answerQuestion(figure, '他是中国人吗？')
      expect(answer).toBe('是')
    })

    it('answers 不是 for non-matching region', () => {
      const answer = answerQuestion(figure, '他是日本人吗？')
      expect(answer).toBe('不是')
    })

    it('always returns 是 or 不是', () => {
      const questions = [
        '他是谁？',
        '这是什么？',
        '随便一个问题',
        '他喜欢吃什么？',
      ]
      for (const q of questions) {
        const answer = answerQuestion(figure, q)
        expect(answer).toBeOneOf(['是', '不是'])
      }
    })
  })

  describe('checkGuess', () => {
    let figure: HistoricalFigure

    beforeEach(() => {
      figure = {
        id: 'qinshihuang',
        name: '秦始皇',
        aliases: ['嬴政', '秦始皇帝', 'Zheng'],
        era: '秦朝',
        role: '皇帝',
        gender: '男',
        region: '中国',
        keywords: ['统一', '焚书坑儒', '兵马俑', '长城', '郡县制'],
        isAlive: false,
        isChinese: true,
        isMilitaryLeader: false,
        isPhilosopher: false,
        isArtist: false,
        isScientist: false,
        isPolitician: true,
        bornYear: -259,
        diedYear: -210,
      }
    })

    it('returns true for exact name match', () => {
      expect(checkGuess(figure, '秦始皇')).toBe(true)
    })

    it('returns true for alias match', () => {
      expect(checkGuess(figure, '嬴政')).toBe(true)
    })

    it('returns true for alternative alias', () => {
      expect(checkGuess(figure, '秦始皇帝')).toBe(true)
    })

    it('returns true for case-insensitive match', () => {
      expect(checkGuess(figure, '秦始皇')).toBe(true)
      expect(checkGuess(figure, 'zheng')).toBe(true)
    })

    it('returns true for partial name match', () => {
      expect(checkGuess(figure, '秦皇')).toBe(true)
    })

    it('returns false for wrong guess', () => {
      expect(checkGuess(figure, '李白')).toBe(false)
    })

    it('returns false for empty guess', () => {
      expect(checkGuess(figure, '')).toBe(false)
    })
  })
})