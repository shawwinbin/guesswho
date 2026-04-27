import { figures } from '../data/figures'

export type VoiceControlCommand = 'restart' | 'repeat' | 'exit-continuous-mode'

export type VoiceIntent =
  | { type: 'control'; command: VoiceControlCommand }
  | { type: 'guess'; guess: string; matchedName: string }
  | { type: 'question'; question: string }

const CONTROL_PATTERNS: Array<{ pattern: RegExp; command: VoiceControlCommand }> = [
  { pattern: /重新开始/, command: 'restart' },
  { pattern: /再说一遍|重说一遍|重复一遍/, command: 'repeat' },
  { pattern: /退出语音模式|关闭语音模式|退出连续语音/, command: 'exit-continuous-mode' },
]

const FILLER_PATTERN = /^(那个|这个|嗯|啊|呃|诶|请问|我觉得|我想|就是)+/

interface FigureLookupEntry {
  alias: string
  canonicalName: string
}

interface FigureMatchResult {
  alias: string
  canonicalName: string
  fuzzy: boolean
}

const FIGURE_LOOKUP: FigureLookupEntry[] = figures.flatMap(figure => {
  const names = [figure.name, ...figure.aliases]
  return names.map(alias => ({
    alias: normalizeText(alias),
    canonicalName: figure.name,
  }))
})

const MIN_FUZZY_SCORE = 0.74
const MIN_SCORE_MARGIN = 0.08

export function parseVoiceIntent(input: string): VoiceIntent {
  const trimmed = input.trim()
  const normalized = normalizeText(trimmed)

  for (const item of CONTROL_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return {
        type: 'control',
        command: item.command,
      }
    }
  }

  const matchedFigure = findMatchedFigure(trimmed, normalized)
  if (matchedFigure) {
    return {
      type: 'guess',
      guess: resolveGuessText(trimmed, matchedFigure),
      matchedName: matchedFigure.canonicalName,
    }
  }

  return {
    type: 'question',
    question: trimmed,
  }
}

function normalizeText(input: string): string {
  return input
    .trim()
    .replace(/[？?！!。，,\s]/g, '')
    .replace(FILLER_PATTERN, '')
}

function findMatchedFigure(original: string, normalized: string): FigureMatchResult | null {
  if (!normalized) return null

  const guessCandidate = extractGuessCandidate(original)
  const normalizedCandidate = normalizeText(guessCandidate)
  if (!isPotentialGuessCandidate(normalizedCandidate)) {
    return null
  }

  const exact = FIGURE_LOOKUP.find(item => item.alias === normalizedCandidate)
  if (exact) {
    return {
      ...exact,
      fuzzy: false,
    }
  }

  return findFuzzyFigure(normalizedCandidate)
}

function resolveGuessText(original: string, matchedFigure: FigureMatchResult): string {
  if (matchedFigure.fuzzy) {
    return matchedFigure.canonicalName
  }

  const guessCandidate = extractGuessCandidate(original)
  const normalizedCandidate = normalizeText(guessCandidate)
  if (normalizedCandidate === matchedFigure.alias) {
    return guessCandidate || matchedFigure.canonicalName
  }

  return matchedFigure.canonicalName
}

function extractGuessCandidate(input: string): string {
  return input
    .replace(/[？?！!。，,]/g, '')
    .replace(FILLER_PATTERN, '')
    .replace(/^(我猜(?:是)?|答案是|是不是|他是|她是)/, '')
    .replace(/(对吗|吗|吧|呀|呢)$/, '')
    .trim()
}

function isPotentialGuessCandidate(input: string): boolean {
  if (input.length < 2 || input.length > 8) return false
  if (input.includes('的')) return false
  return /^[\u4e00-\u9fffA-Za-z]+$/u.test(input)
}

function findFuzzyFigure(candidate: string): FigureMatchResult | null {
  const bestByCanonical = new Map<string, { alias: string; score: number }>()

  for (const item of FIGURE_LOOKUP) {
    const score = scoreFigureCandidate(candidate, item.alias)
    if (score < MIN_FUZZY_SCORE) continue

    const currentBest = bestByCanonical.get(item.canonicalName)
    if (!currentBest || score > currentBest.score) {
      bestByCanonical.set(item.canonicalName, {
        alias: item.alias,
        score,
      })
    }
  }

  const rankedMatches = Array.from(bestByCanonical.entries())
    .map(([canonicalName, result]) => ({
      canonicalName,
      alias: result.alias,
      score: result.score,
    }))
    .sort((left, right) => right.score - left.score)

  const bestMatch = rankedMatches[0]
  const secondBest = rankedMatches[1]

  if (!bestMatch) return null
  if (secondBest && candidate.length > 2 && bestMatch.score - secondBest.score < MIN_SCORE_MARGIN) {
    return null
  }

  return {
    alias: bestMatch.alias,
    canonicalName: bestMatch.canonicalName,
    fuzzy: true,
  }
}

function scoreFigureCandidate(candidate: string, alias: string): number {
  if (!candidate || !alias) return 0
  if (candidate === alias) return 1

  if (alias.includes(candidate) || candidate.includes(alias)) {
    const lengthPenalty = Math.min(Math.abs(alias.length - candidate.length) * 0.04, 0.16)
    return Math.max(0, 0.95 - lengthPenalty)
  }

  const maxLength = Math.max(candidate.length, alias.length)
  const distance = levenshteinDistance(candidate, alias)
  let score = 1 - distance / maxLength

  if (candidate[0] === alias[0]) {
    score += 0.18
  }

  if (candidate[candidate.length - 1] === alias[alias.length - 1]) {
    score += 0.12
  }

  if (candidate.length === alias.length) {
    score += 0.08
  }

  return Math.min(score, 0.99)
}

function levenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const substitutionCost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost,
      )
    }
  }

  return matrix[rows - 1][cols - 1]
}
