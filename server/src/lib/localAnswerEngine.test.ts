import { describe, expect, it } from 'vitest'
import { answerQuestionLocally, judgeGuessLocally } from './localAnswerEngine.js'
import type { SecretFigure } from './normalization.js'

describe('localAnswerEngine', () => {
  const qinShiHuang: SecretFigure = {
    name: '秦始皇',
    aliases: ['嬴政', '始皇帝'],
    era: '秦朝',
  }

  it('answers common figure attribute questions without calling an upstream model', () => {
    expect(answerQuestionLocally(qinShiHuang, '他是秦朝的人吗？')).toBe('是')
    expect(answerQuestionLocally(qinShiHuang, '他是唐朝的人吗？')).toBe('不是')
    expect(answerQuestionLocally(qinShiHuang, '他是皇帝吗？')).toBe('是')
    expect(answerQuestionLocally(qinShiHuang, '他是中国人吗？')).toBe('是')
  })

  it('answers relative era questions by dynasty order', () => {
    const liBai: SecretFigure = {
      name: '李白',
      aliases: ['李太白'],
      era: '唐朝',
    }

    expect(answerQuestionLocally(qinShiHuang, '他是唐朝以前的吗？')).toBe('是')
    expect(answerQuestionLocally(qinShiHuang, '他是汉朝之后的吗？')).toBe('不是')
    expect(answerQuestionLocally(liBai, '他是唐朝以前的吗？')).toBe('不是')
    expect(answerQuestionLocally(liBai, '他是唐朝及以前的吗？')).toBe('是')
  })

  it('answers exact name confirmation before dynasty keywords inside the name', () => {
    const guanHanqing: SecretFigure = {
      name: '关汉卿',
      aliases: ['己斋叟'],
      era: '元朝',
    }

    expect(answerQuestionLocally(guanHanqing, '他是关汉卿吗')).toBe('是')
    expect(answerQuestionLocally(guanHanqing, '他是不是关汉卿')).toBe('是')
    expect(answerQuestionLocally(guanHanqing, '答案是不是关汉卿')).toBe('是')
    expect(answerQuestionLocally(guanHanqing, '不就是关汉卿吗')).toBe('是')
    expect(answerQuestionLocally(guanHanqing, '他是关汉清吗')).toBe('是')
    expect(answerQuestionLocally(guanHanqing, '他是李白吗')).toBe('不是')
  })

  it('answers specific ruler period questions before broad dynasty matching', () => {
    const weiQing: SecretFigure = {
      name: '卫青',
      aliases: ['长平侯'],
      era: '汉朝',
    }

    expect(answerQuestionLocally(weiQing, '他是汉武帝时期的吗')).toBe('是')
    expect(answerQuestionLocally(weiQing, '他是刘邦在位时期的吗')).toBe('不是')
    expect(answerQuestionLocally(weiQing, '他是东汉的吗')).toBe('不是')
    expect(answerQuestionLocally(weiQing, '他是西汉的吗')).toBe('是')
  })

  it('distinguishes eastern and western Han figures by active years', () => {
    const banGu: SecretFigure = {
      name: '班固',
      aliases: ['兰台令史'],
      era: '汉朝',
    }

    expect(answerQuestionLocally(banGu, '他是东汉的吗')).toBe('是')
    expect(answerQuestionLocally(banGu, '他是西汉的吗')).toBe('不是')
    expect(answerQuestionLocally(banGu, '他是汉武帝时期的吗')).toBe('不是')
  })

  it('still answers broad Han dynasty questions for Han figures', () => {
    const weiQing: SecretFigure = {
      name: '卫青',
      aliases: ['长平侯'],
      era: '汉朝',
    }

    expect(answerQuestionLocally(weiQing, '他是汉朝的吗')).toBe('是')
  })

  it('judges guesses locally using names and aliases', () => {
    expect(judgeGuessLocally(qinShiHuang, '秦始皇')).toBe(true)
    expect(judgeGuessLocally(qinShiHuang, '嬴政')).toBe(true)
    expect(judgeGuessLocally(qinShiHuang, '李白')).toBe(false)
  })
})
