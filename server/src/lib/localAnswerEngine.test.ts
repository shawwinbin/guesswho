import { describe, expect, it } from 'vitest'
import { answerQuestionLocally, judgeGuessLocally } from './localAnswerEngine.js'
import { figures } from './figureCatalog.js'
import type { SecretFigure } from './normalization.js'
import type { HistoricalFigure } from '../types/figure.js'

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

  it('distinguishes specific foreign countries from broad foreign regions', () => {
    const homer: SecretFigure = {
      name: '荷马',
      aliases: ['Homer'],
      era: '古希腊',
    }
    const caesar: SecretFigure = {
      name: '尤利乌斯·凯撒',
      aliases: ['Julius Caesar', '凯撒'],
      era: '古罗马',
    }
    const peter: SecretFigure = {
      name: '彼得大帝',
      aliases: ['Peter the Great'],
      era: '近代欧洲',
    }

    expect(answerQuestionLocally(homer, '他是法国的吗')).toBe('不是')
    expect(answerQuestionLocally(caesar, '他是美国人吗')).toBe('不是')
    expect(answerQuestionLocally(peter, '英国人')).toBe('不是')
    expect(answerQuestionLocally(homer, '他是欧洲的吗')).toBe('是')
    expect(answerQuestionLocally(caesar, '他是外国人吗')).toBe('是')
  })

  it('keeps region answers consistent across the full active catalog', () => {
    const specificRegions: Record<string, string[]> = {
      日本: ['日本'],
      韩国: ['韩国', '朝鲜'],
      美国: ['美国'],
      英国: ['英国', '英格兰', '苏格兰', '威尔士'],
      法国: ['法国', '法兰西'],
      德国: ['德国'],
      印度: ['印度'],
      俄罗斯: ['俄罗斯', '苏联'],
      希腊: ['希腊', '雅典', '斯巴达', '马其顿'],
      罗马: ['罗马'],
      埃及: ['埃及'],
      意大利: ['意大利'],
      奥地利: ['奥地利'],
      南非: ['南非'],
      波斯: ['波斯'],
      奥斯曼: ['奥斯曼'],
      迦太基: ['迦太基'],
      法兰克: ['法兰克'],
      色雷斯: ['色雷斯'],
    }
    const broadRegions: Record<string, string[]> = {
      欧洲: ['欧洲', '希腊', '雅典', '斯巴达', '马其顿', '罗马', '法国', '法兰西', '英国', '英格兰', '德国', '意大利', '奥地利', '俄罗斯', '苏联', '法兰克', '诺曼底', '色雷斯'],
      非洲: ['非洲', '埃及', '南非'],
      美洲: ['美洲', '美国'],
    }
    const regionMatches = (figure: HistoricalFigure, aliases: string[]) => {
      const region = figure.region.toLowerCase()
      return aliases.some(alias => region.includes(alias.toLowerCase()))
    }

    for (const figure of figures) {
      const secret: SecretFigure = { name: figure.name, aliases: figure.aliases, era: figure.era }

      expect(answerQuestionLocally(secret, '他是中国人吗')).toBe(figure.isChinese ? '是' : '不是')
      expect(answerQuestionLocally(secret, '他是外国人吗')).toBe(figure.isChinese ? '不是' : '是')

      for (const [region, aliases] of Object.entries(specificRegions)) {
        expect(answerQuestionLocally(secret, `他是${region}人吗`)).toBe(regionMatches(figure, aliases) ? '是' : '不是')
      }

      for (const [region, aliases] of Object.entries(broadRegions)) {
        expect(answerQuestionLocally(secret, `他是${region}人吗`)).toBe(regionMatches(figure, aliases) ? '是' : '不是')
      }
    }
  })

  it('judges guesses locally using names and aliases', () => {
    expect(judgeGuessLocally(qinShiHuang, '秦始皇')).toBe(true)
    expect(judgeGuessLocally(qinShiHuang, '嬴政')).toBe(true)
    expect(judgeGuessLocally(qinShiHuang, '李白')).toBe(false)
  })
})
