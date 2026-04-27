import type { FigureScope, HistoricalFigure, YesNoAnswer } from './types'
import { figures } from '../data/figures'

export { type FigureScope, type HistoricalFigure, type YesNoAnswer } from './types'

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

export function selectRandomFigure(scope: FigureScope = 'all'): HistoricalFigure {
  const candidates = filterFiguresByScope(scope)
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}

export function answerQuestion(figure: HistoricalFigure, question: string): YesNoAnswer {
  const q = normalizeQuestion(question)

  // Check dynasty/era first (most specific)
  const eraMatch = checkEraMatch(q, figure.era)
  if (eraMatch !== null) return eraMatch

  // Check region (including negative foreign patterns)
  const regionMatch = checkRegionMatch(q, figure)
  if (regionMatch !== null) return regionMatch

  // Check alive/dead status
  const aliveMatch = checkAliveMatch(q, figure.isAlive)
  if (aliveMatch !== null) return aliveMatch

  // Check gender (must be explicit gender question)
  const genderMatch = checkGenderMatch(q, figure.gender)
  if (genderMatch !== null) return genderMatch

  // Check role
  if (matchesRole(q, figure.role)) {
    return '是'
  }

  // Check keywords
  for (const keyword of figure.keywords) {
    if (matchesKeyword(q, keyword)) {
      return '是'
    }
  }

  // Check boolean attributes
  const attrMatch = checkBooleanAttributes(q, figure)
  if (attrMatch !== null) return attrMatch

  // Check name/alias mention (person asking if the name appears)
  if (containsFigureName(q, figure)) {
    return '是'
  }

  // Fallback: conservative "不是" for unclear questions
  return '不是'
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/\s+/g, '').replace(/[？?！!。，,]/g, '')
}

function checkEraMatch(q: string, era: string): YesNoAnswer | null {
  const eraPatterns: Record<string, string[]> = {
    '秦朝': ['秦朝', '秦代', '秦时'],
    '汉朝': ['汉朝', '汉代', '西汉', '东汉', '汉时'],
    '三国': ['三国', '三国时期', '三国时代'],
    '唐朝': ['唐朝', '唐代', '唐时'],
    '宋朝': ['宋朝', '宋代', '北宋', '南宋', '宋时'],
    '明朝': ['明朝', '明代', '明时'],
    '清朝': ['清朝', '清代', '清时'],
    '春秋': ['春秋', '春秋时期', '春秋时代'],
    '战国': ['战国', '战国时期', '战国时代'],
    '现代': ['现代', '当代', '近代', '现在'],
    '上古': ['上古', '远古', '神话', '传说'],
    '商周': ['商周', '商朝', '周朝', '商代', '周代'],
    '秦末汉初': ['秦末汉初', '秦汉之交'],
  }

  const allEras = Object.values(eraPatterns).flat()
  for (const eraName of allEras) {
    if (q.includes(eraName.toLowerCase())) {
      const patterns = eraPatterns[era] || [era]
      return patterns.some(p => q.includes(p.toLowerCase())) ? '是' : '不是'
    }
  }
  // Check for single-character era matches (秦, 汉, 唐, etc.)
  const singleEras = ['秦', '汉', '唐', '宋', '明', '清', '周', '商']
  for (const single of singleEras) {
    if (q.includes(single.toLowerCase())) {
      const patterns = eraPatterns[era] || [era]
      return patterns.some(p => p.includes(single) && q.includes(p.toLowerCase())) ? '是' : '不是'
    }
  }
  return null
}

function checkRegionMatch(q: string, figure: HistoricalFigure): YesNoAnswer | null {
  // Check foreign patterns first (negative for Chinese figures)
  const foreignPatterns = ['日本', '韩国', '美国', '英国', '法国', '德国', '外国', '欧洲', '非洲', '美洲', '印度', '俄罗斯']
  for (const p of foreignPatterns) {
    if (q.includes(p.toLowerCase())) {
      return figure.isChinese ? '不是' : '是'
    }
  }
  // Check Chinese patterns
  if (q.includes('中国') || q.includes('中国人') || q.includes('华夏')) {
    return figure.isChinese ? '是' : '不是'
  }
  return null
}

function checkAliveMatch(q: string, isAlive: boolean): YesNoAnswer | null {
  // Questions about being alive
  if (q.includes('活着') || q.includes('还活着') || q.includes('现在还') || q.includes('现在在')) {
    return isAlive ? '是' : '不是'
  }
  // Questions about being dead
  if (q.includes('去世') || q.includes('死') || q.includes('已故') || q.includes('不在了') || q.includes('过世')) {
    return isAlive ? '不是' : '是'
  }
  return null
}

function checkGenderMatch(q: string, gender: string): YesNoAnswer | null {
  // Must be an explicit gender question
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
    '皇帝': ['皇帝', '帝王', '天子', '君主', '皇上'],
    '诗人': ['诗人', '写诗', '作词', '词人'],
    '思想家': ['思想家', '哲学家'],
    '军事家': ['军事家', '将军'],
    '谋士': ['谋士', '智囊', '军师'],
    '科学家': ['科学家', '发明'],
    '医生': ['医生', '医学', '治病'],
    '航海家': ['航海家', '航海', '出海'],
    '演员': ['演员', '演戏', '电影', '影星'],
    '运动员': ['运动员', '体育', '运动', '篮球', '足球'],
    '作家': ['作家', '写书'],
    '音乐家': ['音乐家', '作曲', '唱歌'],
    '史学家': ['史学家', '写史'],
    '官员': ['官员', '大臣'],
    '僧人': ['僧人', '和尚', '法师'],
    '旅行家': ['旅行家', '旅行'],
    '部落首领': ['部落首领', '部落', '首领'],
    '武将': ['武将', '将军', '打仗', '武'],
    '起义领袖': ['起义领袖', '起义', '领袖'],
    '美人': ['美人', '美女'],
    '革命家': ['革命家', '革命'],
  }
  const patterns = rolePatterns[role] || [role]
  for (const p of patterns) {
    if (q.includes(p.toLowerCase())) return true
  }
  return false
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

function matchesKeyword(q: string, keyword: string): boolean {
  return q.includes(keyword.toLowerCase())
}

function containsFigureName(q: string, figure: HistoricalFigure): boolean {
  const names = [figure.name, ...figure.aliases]
  for (const name of names) {
    if (q.includes(name.toLowerCase())) return true
  }
  return false
}

export function checkGuess(figure: HistoricalFigure, guess: string): boolean {
  if (!guess || guess.trim() === '') return false

  const normalizedGuess = guess.trim().toLowerCase()
  const names = [figure.name.toLowerCase(), ...figure.aliases.map(a => a.toLowerCase())]

  // Exact match
  for (const name of names) {
    if (normalizedGuess === name) return true
  }

  // Substring match (consecutive)
  for (const name of names) {
    if (name.includes(normalizedGuess) || normalizedGuess.includes(name)) return true
  }

  // Character overlap match for Chinese (at least 2 shared characters)
  // This handles cases like '秦皇' matching '秦始皇'
  const guessChars = [...normalizedGuess]
  if (guessChars.length >= 2) {
    for (const name of names) {
      const nameChars = [...name]
      const sharedCount = guessChars.filter(c => nameChars.includes(c)).length
      // If most characters from guess appear in name, consider it a match
      if (sharedCount >= guessChars.length * 0.8) return true
    }
  }

  return false
}