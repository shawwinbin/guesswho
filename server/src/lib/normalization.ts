export type YesNoAnswer = '是' | '不是'

export interface SecretFigure {
  name: string
  aliases: string[]
  era: string
}

export function extractFirstJsonObject(input: string): string | null {
  const start = input.indexOf('{')
  if (start === -1) return null

  let depth = 0

  for (let index = start; index < input.length; index += 1) {
    const char = input[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return input.slice(start, index + 1)
      }
    }
  }

  return null
}

export function parseJsonObject(input: string): Record<string, unknown> | null {
  const jsonSegment = extractFirstJsonObject(input)
  if (!jsonSegment) return null

  try {
    const parsed = JSON.parse(jsonSegment) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

export function normalizeYesNoAnswer(input: string): YesNoAnswer {
  const normalized = input.trim().toLowerCase()

  if (!normalized) return '不是'
  if (normalized === '是' || normalized === 'yes' || normalized === 'y' || normalized === 'true') return '是'
  if (normalized === '不是' || normalized === '否' || normalized === 'no' || normalized === 'n' || normalized === 'false') return '不是'
  if (normalized.includes('不是') || normalized.includes(' no') || normalized.includes('false')) return '不是'
  if (normalized.includes('是') || normalized.includes('yes') || normalized.includes('true') || normalized.includes('对')) return '是'

  return '不是'
}

export function normalizeSecretFigure(input: Record<string, unknown>): SecretFigure | null {
  if (typeof input.name !== 'string' || !input.name.trim()) {
    return null
  }

  const aliases = Array.isArray(input.aliases)
    ? input.aliases.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  return {
    name: input.name.trim(),
    aliases,
    era: typeof input.era === 'string' ? input.era.trim() : '',
  }
}

export function matchesFigureName(guess: string, figure: SecretFigure): boolean {
  const normalizedGuess = guess.trim().toLowerCase()
  if (!normalizedGuess) return false

  const candidates = [figure.name, ...figure.aliases]
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

  return candidates.includes(normalizedGuess)
}
