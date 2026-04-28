import { figures } from './figureCatalog.js'
import { matchesFigureName, type SecretFigure, type YesNoAnswer } from './normalization.js'
import type { HistoricalFigure } from '../types/figure.js'

export interface LocalAnswerDecision {
  answer: YesNoAnswer
  confidence: number
  reason: string
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.8

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
  return answerQuestionByRulesDetailed(secret, question)?.answer ?? null
}

export function answerQuestionByRulesDetailed(secret: SecretFigure, question: string): LocalAnswerDecision | null {
  const figure = findHistoricalFigure(secret)
  if (!figure) {
    return matchesFigureName(question, secret) ? localDecision('是', 0.95, 'identity') : null
  }

  const q = normalizeQuestion(question)
  const identityMatch = checkIdentityConfirmation(q, secret)
  if (identityMatch !== null) return localDecision(identityMatch, 0.99, 'identity')

  const specificPeriodMatch = checkSpecificPeriodMatch(q, figure)
  if (specificPeriodMatch !== null) return localDecision(specificPeriodMatch, 0.9, 'specific-period')

  const eraMatch = checkEraMatch(q, figure)
  if (eraMatch !== null) return eraMatch

  const regionMatch = checkRegionMatch(q, figure)
  if (regionMatch !== null) return localDecision(regionMatch, 0.95, 'region')

  const aliveMatch = checkAliveMatch(q, figure.isAlive)
  if (aliveMatch !== null) return localDecision(aliveMatch, 0.95, 'alive')

  const genderMatch = checkGenderMatch(q, figure.gender)
  if (genderMatch !== null) return localDecision(genderMatch, 0.95, 'gender')

  if (matchesRole(q, figure.role)) {
    return localDecision('是', 0.95, 'role')
  }

  for (const keyword of figure.keywords) {
    if (q.includes(normalizeText(keyword))) {
      return localDecision('是', 0.9, 'keyword')
    }
  }

  const attrMatch = checkBooleanAttributes(q, figure)
  if (attrMatch !== null) return localDecision(attrMatch, 0.9, 'attribute')

  return containsFigureName(q, figure) ? localDecision('是', 0.95, 'identity') : null
}

function localDecision(answer: YesNoAnswer, confidence: number, reason: string): LocalAnswerDecision {
  return { answer, confidence, reason }
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

function checkIdentityConfirmation(q: string, secret: SecretFigure): YesNoAnswer | null {
  const candidate = extractIdentityCandidate(q)
  const resolvedCandidate = candidate ? resolveKnownFigureName(candidate) : null
  if (!resolvedCandidate) return null

  return judgeGuessLocally(secret, resolvedCandidate) ? '是' : '不是'
}

function extractIdentityCandidate(q: string): string | null {
  const patterns = [
    /^(?:他|她|ta)是不是(.+?)[吗嘛么]?$/i,
    /^(?:他|她|ta)是(.+?)[吗嘛么]?$/i,
    /^是(?:他|她|ta)(.+?)[吗嘛么]?$/i,
    /^是不是(.+?)[吗嘛么]?$/i,
    /^(?:答案|最终答案|谜底)是不是(.+?)[吗嘛么]?$/i,
    /^(?:答案|最终答案|谜底)是(.+?)[吗嘛么]?$/i,
    /^不就是(.+?)[吗嘛么]?$/i,
  ]

  for (const pattern of patterns) {
    const match = q.match(pattern)
    const candidate = cleanIdentityCandidate(match?.[1] ?? '')
    if (candidate && !looksLikeRelationshipQuestion(candidate)) return candidate
  }

  return null
}

function cleanIdentityCandidate(candidate: string): string {
  return candidate
    .replace(/^(?:这个人|这位人物|这位|那位|那个人)/, '')
    .replace(/(?:吧|呢)$/g, '')
    .trim()
}

function looksLikeRelationshipQuestion(candidate: string): boolean {
  return ['的朋友', '的老师', '的学生', '的弟子', '的父亲', '的母亲', '的儿子', '的女儿', '的妻子', '的丈夫'].some(token => candidate.includes(token))
}

function resolveKnownFigureName(candidate: string): string | null {
  const normalizedCandidate = normalizeText(candidate)
  if (!normalizedCandidate) return null

  const knownNames = figures.flatMap(figure => [figure.name, ...figure.aliases]).filter(Boolean)
  const exact = knownNames.find(name => normalizeText(name) === normalizedCandidate)
  if (exact) return exact

  const fuzzy = knownNames.find(name => isLikelyNameTypo(normalizedCandidate, normalizeText(name)))
  return fuzzy ?? null
}

function isLikelyNameTypo(candidate: string, knownName: string): boolean {
  if (candidate.length < 3 || knownName.length < 3) return false
  if (Math.abs(candidate.length - knownName.length) > 1) return false

  return levenshteinDistance(candidate, knownName) <= 1
}

function levenshteinDistance(left: string, right: string): number {
  const rows = [...left]
  const columns = [...right]
  const distances = Array.from({ length: rows.length + 1 }, () => Array<number>(columns.length + 1).fill(0))

  for (let row = 0; row <= rows.length; row += 1) distances[row][0] = row
  for (let column = 0; column <= columns.length; column += 1) distances[0][column] = column

  for (let row = 1; row <= rows.length; row += 1) {
    for (let column = 1; column <= columns.length; column += 1) {
      const substitutionCost = rows[row - 1] === columns[column - 1] ? 0 : 1
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost,
      )
    }
  }

  return distances[rows.length][columns.length]
}

function checkEraMatch(q: string, figure: HistoricalFigure): LocalAnswerDecision | null {
  const era = figure.era
  const hanSubEraMatch = checkHanSubEraMatch(q, figure)
  if (hanSubEraMatch !== null) return hanSubEraMatch

  const eraPatterns: Record<string, string[]> = {
    上古: ['上古', '远古', '神话', '传说'],
    商周: ['商周', '商朝', '周朝', '商代', '周代'],
    春秋: ['春秋', '春秋时期', '春秋时代'],
    战国: ['战国', '战国时期', '战国时代'],
    秦朝: ['秦朝', '秦代', '秦时'],
    秦末汉初: ['秦末汉初', '秦汉之交'],
    汉朝: ['汉朝', '汉代', '汉时'],
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
  if (relativeEraMatch !== null) return localDecision(relativeEraMatch, 0.9, 'relative-era')

  const allEras = Object.values(eraPatterns).flat()
  for (const eraName of allEras) {
    if (q.includes(normalizeText(eraName))) {
      const patterns = eraPatterns[era] || [era]
      return localDecision(
        patterns.some(pattern => q.includes(normalizeText(pattern))) ? '是' : '不是',
        0.9,
        'era',
      )
    }
  }

  const singleEras = ['秦', '汉', '唐', '宋', '明', '清', '周', '商']
  for (const single of singleEras) {
    if (q.includes(single)) {
      const patterns = eraPatterns[era] || [era]
      return localDecision(
        patterns.some(pattern => pattern.includes(single) && q.includes(normalizeText(pattern))) ? '是' : '不是',
        0.45,
        'single-character-era',
      )
    }
  }

  return null
}

function checkSpecificPeriodMatch(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  const period = findNamedHistoricalPeriod(q)
  if (!period) return null

  if (figure.keywords.some(keyword => q.includes(normalizeText(keyword)))) {
    return '是'
  }

  return overlapsSpecificPeriod(figure, period.startYear, period.endYear) ? '是' : '不是'
}

const NAMED_HISTORICAL_PERIODS: Array<{ names: string[]; startYear: number; endYear: number }> = [
  { names: ['刘邦', '汉高祖', '高祖'], startYear: -202, endYear: -195 },
  { names: ['汉文帝', '刘恒'], startYear: -180, endYear: -157 },
  { names: ['汉景帝', '刘启'], startYear: -157, endYear: -141 },
  { names: ['汉武帝', '刘彻'], startYear: -141, endYear: -87 },
  { names: ['汉宣帝', '刘询'], startYear: -74, endYear: -49 },
  { names: ['光武帝', '刘秀', '汉光武帝'], startYear: 25, endYear: 57 },
]

function findNamedHistoricalPeriod(q: string): { startYear: number; endYear: number } | null {
  const isPeriodQuestion = ['时期', '时代', '年间', '在位', '当政', '统治'].some(token => q.includes(token))
  if (!isPeriodQuestion) return null

  return NAMED_HISTORICAL_PERIODS.find(period => period.names.some(name => q.includes(normalizeText(name)))) ?? null
}

function checkHanSubEraMatch(q: string, figure: HistoricalFigure): LocalAnswerDecision | null {
  if (q.includes('西汉') || q.includes('前汉')) {
    return localDecision(answerByKnownYearsOrHanKeyword(figure, -202, 8, ['西汉', '前汉']), 0.9, 'han-sub-era')
  }

  if (q.includes('东汉') || q.includes('后汉')) {
    return localDecision(answerByKnownYearsOrHanKeyword(figure, 25, 220, ['东汉', '后汉']), 0.9, 'han-sub-era')
  }

  return null
}

function answerByKnownYearsOrHanKeyword(figure: HistoricalFigure, startYear: number, endYear: number, keywords: string[]): YesNoAnswer {
  if (figure.bornYear !== undefined || figure.diedYear !== undefined) {
    return overlapsFigureYears(figure, startYear, endYear) ? '是' : '不是'
  }

  return figure.keywords.some(keyword => keywords.includes(normalizeText(keyword))) ? '是' : '不是'
}

function overlapsFigureYears(figure: HistoricalFigure, startYear: number, endYear: number): boolean {
  const bornYear = figure.bornYear ?? Number.NEGATIVE_INFINITY
  const diedYear = figure.diedYear ?? Number.POSITIVE_INFINITY

  return bornYear <= endYear && diedYear >= startYear
}

function overlapsSpecificPeriod(figure: HistoricalFigure, startYear: number, endYear: number): boolean {
  if (figure.bornYear !== undefined && figure.diedYear !== undefined) {
    return overlapsFigureYears(figure, startYear, endYear)
  }

  if (figure.bornYear !== undefined) {
    return figure.bornYear >= startYear && figure.bornYear <= endYear
  }

  if (figure.diedYear !== undefined) {
    return figure.diedYear >= startYear && figure.diedYear <= endYear
  }

  return false
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
  if (q.includes('中国') || q.includes('中国人') || q.includes('华夏')) {
    return figure.isChinese ? '是' : '不是'
  }

  const specificCountryMatch = checkSpecificCountryRegionMatch(q, figure)
  if (specificCountryMatch !== null) return specificCountryMatch

  if (q.includes('外国') || q.includes('外国人')) {
    return figure.isChinese ? '不是' : '是'
  }

  const broadRegionMatch = checkBroadRegionMatch(q, figure)
  if (broadRegionMatch !== null) {
    return broadRegionMatch
  }

  return null
}

const SPECIFIC_COUNTRY_REGION_ALIASES: Record<string, string[]> = {
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
}

function checkSpecificCountryRegionMatch(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  const figureRegion = normalizeText(figure.region)

  for (const [country, aliases] of Object.entries(SPECIFIC_COUNTRY_REGION_ALIASES)) {
    if (!q.includes(country)) continue

    return aliases.some(alias => figureRegion.includes(normalizeText(alias))) ? '是' : '不是'
  }

  return null
}

const BROAD_REGION_ALIASES: Record<string, string[]> = {
  欧洲: ['欧洲', '希腊', '雅典', '斯巴达', '马其顿', '罗马', '法国', '法兰西', '英国', '英格兰', '德国', '意大利', '奥地利', '俄罗斯', '苏联', '法兰克', '诺曼底', '色雷斯'],
  非洲: ['非洲', '埃及', '南非'],
  美洲: ['美洲', '美国'],
}

function checkBroadRegionMatch(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  const figureRegion = normalizeText(figure.region)

  for (const [region, aliases] of Object.entries(BROAD_REGION_ALIASES)) {
    if (!q.includes(region)) continue

    return aliases.some(alias => figureRegion.includes(normalizeText(alias))) ? '是' : '不是'
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
