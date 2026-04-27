const NON_GUESS_TERMS = new Set([
  '中国人',
  '外国人',
  '男人',
  '女性',
  '男的',
  '女的',
  '皇帝',
  '诗人',
  '词人',
  '武将',
  '将军',
  '军事家',
  '政治家',
  '思想家',
  '哲学家',
  '科学家',
  '文学家',
  '艺术家',
  '唐朝人',
  '宋朝人',
  '明朝人',
  '清朝人',
  '古代人',
  '现代人',
  '近代人',
])

const GUESS_PATTERNS = [
  /^(?:他|她|ta|TA|这位人物|这个人)是(.+?)[吗嘛么]?[？?]?$/i,
  /^是不是(.+?)[？?]?$/,
  /^(?:答案|谜底)是(.+?)[吗嘛么]?[？?]?$/,
  /^(?:我猜是|我猜|猜)(.+?)[？?]?$/,
]

function normalizeCandidate(candidate: string): string {
  return candidate
    .replace(/[，。！？?!,.、\s]/g, '')
    .replace(/^一位/, '')
    .replace(/^一个/, '')
    .trim()
}

export function extractGuessFromQuestion(question: string): string | null {
  const normalizedQuestion = question.trim()

  for (const pattern of GUESS_PATTERNS) {
    const match = normalizedQuestion.match(pattern)
    if (!match?.[1]) continue

    const candidate = normalizeCandidate(match[1])

    if (candidate.length < 2) {
      return null
    }

    if (NON_GUESS_TERMS.has(candidate) || candidate.endsWith('人')) {
      return null
    }

    return candidate
  }

  return null
}
