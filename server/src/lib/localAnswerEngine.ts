import { figures } from './figureCatalog.js'
import { matchesFigureName, type SecretFigure, type YesNoAnswer } from './normalization.js'
import type { HistoricalFigure } from '../types/figure.js'

export function findHistoricalFigure(secret: SecretFigure): HistoricalFigure | null {
  const names = [secret.name, ...secret.aliases].map(normalizeText).filter(Boolean)

  return figures.find(figure => {
    const figureNames = [figure.name, ...figure.aliases].map(normalizeText).filter(Boolean)
    return names.some(name => figureNames.includes(name))
  }) ?? null
}

export function answerQuestionLocally(secret: SecretFigure, question: string): YesNoAnswer {
  return answerQuestionByRules(secret, question) ?? '不是'
}

export function answerQuestionByRules(secret: SecretFigure, question: string): YesNoAnswer | null {
  const figure = findHistoricalFigure(secret)
  if (!figure) {
    return matchesFigureName(question, secret) ? '是' : null
  }

  const q = normalizeQuestion(question)

  const eraMatch = checkEraMatch(q, figure.era)
  if (eraMatch !== null) return eraMatch

  const regionMatch = checkRegionMatch(q, figure)
  if (regionMatch !== null) return regionMatch

  const aliveMatch = checkAliveMatch(q, figure.isAlive)
  if (aliveMatch !== null) return aliveMatch

  const genderMatch = checkGenderMatch(q, figure.gender)
  if (genderMatch !== null) return genderMatch

  if (matchesRole(q, figure.role)) {
    return '是'
  }

  for (const keyword of figure.keywords) {
    if (q.includes(normalizeText(keyword))) {
      return '是'
    }
  }

  const attrMatch = checkBooleanAttributes(q, figure)
  if (attrMatch !== null) return attrMatch

  return containsFigureName(q, figure) ? '是' : null
}

export function judgeGuessLocally(secret: SecretFigure, guess: string): boolean {
  const figure = findHistoricalFigure(secret)
  if (!figure) {
    return matchesFigureName(guess, secret)
  }

  const normalizedGuess = normalizeText(guess)
  if (!normalizedGuess) return false

  const names = [figure.name, ...figure.aliases].map(normalizeText).filter(Boolean)

  if (names.includes(normalizedGuess)) return true

  if (names.some(name => name.includes(normalizedGuess) || normalizedGuess.includes(name))) {
    return true
  }

  const guessChars = [...normalizedGuess]
  if (guessChars.length < 2) return false

  return names.some(name => {
    const nameChars = [...name]
    const sharedCount = guessChars.filter(char => nameChars.includes(char)).length
    return sharedCount >= guessChars.length * 0.8
  })
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase()
}

function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/\s+/g, '').replace(/[？?！!。，,]/g, '')
}

function checkEraMatch(q: string, era: string): YesNoAnswer | null {
  const eraPatterns: Record<string, string[]> = {
    上古: ['上古', '远古', '神话', '传说'],
    商周: ['商周', '商朝', '周朝', '商代', '周代'],
    春秋: ['春秋', '春秋时期', '春秋时代'],
    战国: ['战国', '战国时期', '战国时代'],
    秦朝: ['秦朝', '秦代', '秦时'],
    秦末汉初: ['秦末汉初', '秦汉之交'],
    汉朝: ['汉朝', '汉代', '西汉', '东汉', '汉时'],
    三国: ['三国', '三国时期', '三国时代'],
    南北朝: ['南北朝', '魏晋南北朝', '北魏'],
    隋朝: ['隋朝', '隋代', '隋时'],
    唐朝: ['唐朝', '唐代', '唐时'],
    五代十国: ['五代十国', '五代'],
    宋朝: ['宋朝', '宋代', '北宋', '南宋', '宋时'],
    元朝: ['元朝', '元代', '元时'],
    明朝: ['明朝', '明代', '明时'],
    清朝: ['清朝', '清代', '清时'],
    近代: ['近代'],
    现代: ['现代', '当代', '近代', '现在'],
  }

  const relativeEraMatch = checkRelativeEraMatch(q, era)
  if (relativeEraMatch !== null) return relativeEraMatch

  const allEras = Object.values(eraPatterns).flat()
  for (const eraName of allEras) {
    if (q.includes(normalizeText(eraName))) {
      const patterns = eraPatterns[era] || [era]
      return patterns.some(pattern => q.includes(normalizeText(pattern))) ? '是' : '不是'
    }
  }

  const singleEras = ['秦', '汉', '唐', '宋', '明', '清', '周', '商']
  for (const single of singleEras) {
    if (q.includes(single)) {
      const patterns = eraPatterns[era] || [era]
      return patterns.some(pattern => pattern.includes(single) && q.includes(normalizeText(pattern))) ? '是' : '不是'
    }
  }

  return null
}

const ERA_ORDER: Record<string, number> = {
  上古: 0,
  商周: 1,
  春秋: 2,
  战国: 3,
  秦朝: 4,
  秦末汉初: 4.5,
  汉朝: 5,
  三国: 6,
  南北朝: 7,
  隋朝: 8,
  唐朝: 9,
  五代十国: 10,
  宋朝: 11,
  元朝: 12,
  明朝: 13,
  清朝: 14,
  近代: 15,
  现代: 16,
}

const RELATIVE_ERA_ALIASES: Array<{ era: string; aliases: string[] }> = [
  { era: '上古', aliases: ['上古', '远古'] },
  { era: '商周', aliases: ['商周', '商朝', '周朝', '商代', '周代', '商', '周'] },
  { era: '春秋', aliases: ['春秋'] },
  { era: '战国', aliases: ['战国'] },
  { era: '秦朝', aliases: ['秦朝', '秦代', '秦'] },
  { era: '秦末汉初', aliases: ['秦末汉初', '秦汉之交'] },
  { era: '汉朝', aliases: ['汉朝', '汉代', '西汉', '东汉', '汉'] },
  { era: '三国', aliases: ['三国'] },
  { era: '南北朝', aliases: ['南北朝', '魏晋南北朝', '北魏'] },
  { era: '隋朝', aliases: ['隋朝', '隋代', '隋'] },
  { era: '唐朝', aliases: ['唐朝', '唐代', '唐'] },
  { era: '五代十国', aliases: ['五代十国', '五代'] },
  { era: '宋朝', aliases: ['宋朝', '宋代', '北宋', '南宋', '宋'] },
  { era: '元朝', aliases: ['元朝', '元代', '元'] },
  { era: '明朝', aliases: ['明朝', '明代', '明'] },
  { era: '清朝', aliases: ['清朝', '清代', '清'] },
  { era: '近代', aliases: ['近代'] },
  { era: '现代', aliases: ['现代', '当代', '现在'] },
]

function checkRelativeEraMatch(q: string, era: string): YesNoAnswer | null {
  const direction = getRelativeEraDirection(q)
  if (!direction) return null

  const figureOrder = ERA_ORDER[era]
  const targetEra = findRelativeEraInQuestion(q)
  if (figureOrder === undefined || !targetEra) return null

  const targetOrder = ERA_ORDER[targetEra]
  if (targetOrder === undefined) return null

  if (direction === 'before') {
    return figureOrder < targetOrder || (isInclusiveRelativeQuestion(q) && figureOrder === targetOrder) ? '是' : '不是'
  }

  return figureOrder > targetOrder || (isInclusiveRelativeQuestion(q) && figureOrder === targetOrder) ? '是' : '不是'
}

function getRelativeEraDirection(q: string): 'before' | 'after' | null {
  if (q.includes('以前') || q.includes('之前') || q.includes('前')) return 'before'
  if (q.includes('以后') || q.includes('之后') || q.includes('后')) return 'after'
  return null
}

function isInclusiveRelativeQuestion(q: string): boolean {
  return q.includes('及以前') || q.includes('以及以前') || q.includes('或以前')
    || q.includes('及以后') || q.includes('以及以后') || q.includes('或以后')
}

function findRelativeEraInQuestion(q: string): string | null {
  const matches = RELATIVE_ERA_ALIASES
    .flatMap(entry => entry.aliases.map(alias => ({ era: entry.era, alias: normalizeText(alias) })))
    .filter(entry => q.includes(entry.alias))
    .sort((left, right) => right.alias.length - left.alias.length)

  return matches[0]?.era ?? null
}

function checkRegionMatch(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  const foreignPatterns = ['日本', '韩国', '美国', '英国', '法国', '德国', '外国', '欧洲', '非洲', '美洲', '印度', '俄罗斯']
  for (const pattern of foreignPatterns) {
    if (q.includes(pattern)) {
      return figure.isChinese ? '不是' : '是'
    }
  }

  if (q.includes('中国') || q.includes('中国人') || q.includes('华夏')) {
    return figure.isChinese ? '是' : '不是'
  }

  return null
}

function checkAliveMatch(q: string, isAlive: boolean): YesNoAnswer | null {
  if (q.includes('活着') || q.includes('还活着') || q.includes('现在还') || q.includes('现在在')) {
    return isAlive ? '是' : '不是'
  }

  if (q.includes('去世') || q.includes('死') || q.includes('已故') || q.includes('不在了') || q.includes('过世')) {
    return isAlive ? '不是' : '是'
  }

  return null
}

function checkGenderMatch(q: string, gender: string): YesNoAnswer | null {
  const isGenderQuestion = q.includes('男的') || q.includes('女的') || q.includes('男性') || q.includes('女性') || q.includes('性别') || q.includes('是男') || q.includes('是女')
  if (!isGenderQuestion) return null

  if (gender === '男') {
    if (q.includes('女') || q.includes('女性')) return '不是'
    if (q.includes('男') || q.includes('男性')) return '是'
  }

  if (gender === '女') {
    if (q.includes('男') || q.includes('男性')) return '不是'
    if (q.includes('女') || q.includes('女性')) return '是'
  }

  return null
}

function matchesRole(q: string, role: string): boolean {
  const rolePatterns: Record<string, string[]> = {
    皇帝: ['皇帝', '帝王', '天子', '君主', '皇上'],
    诗人: ['诗人', '写诗', '作词', '词人'],
    思想家: ['思想家', '哲学家'],
    军事家: ['军事家', '将军'],
    谋士: ['谋士', '智囊', '军师'],
    科学家: ['科学家', '发明'],
    医生: ['医生', '医学', '治病'],
    医学家: ['医生', '医学', '治病', '医学家'],
    航海家: ['航海家', '航海', '出海'],
    演员: ['演员', '演戏', '电影', '影星'],
    运动员: ['运动员', '体育', '运动', '篮球', '足球'],
    作家: ['作家', '写书'],
    音乐家: ['音乐家', '作曲', '唱歌'],
    史学家: ['史学家', '写史'],
    官员: ['官员', '大臣'],
    僧人: ['僧人', '和尚', '法师'],
    旅行家: ['旅行家', '旅行'],
    部落首领: ['部落首领', '部落', '首领'],
    武将: ['武将', '将军', '打仗', '武'],
    起义领袖: ['起义领袖', '起义', '领袖'],
    美人: ['美人', '美女'],
    革命家: ['革命家', '革命'],
  }

  const patterns = rolePatterns[role] || [role]
  return patterns.some(pattern => q.includes(normalizeText(pattern)))
}

function checkBooleanAttributes(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  if (q.includes('军事') || q.includes('武')) {
    return figure.isMilitaryLeader ? '是' : '不是'
  }

  if (q.includes('思想家') || q.includes('哲学')) {
    return figure.isPhilosopher ? '是' : '不是'
  }

  if (q.includes('艺术') || q.includes('文学') || q.includes('诗')) {
    return figure.isArtist ? '是' : '不是'
  }

  if (q.includes('科学') || q.includes('发明')) {
    return figure.isScientist ? '是' : '不是'
  }

  if (q.includes('政治') || q.includes('政')) {
    return figure.isPolitician ? '是' : '不是'
  }

  return null
}

function containsFigureName(q: string, figure: HistoricalFigure): boolean {
  return [figure.name, ...figure.aliases].some(name => q.includes(normalizeText(name)))
}
