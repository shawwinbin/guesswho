import { describe, expect, it } from 'vitest'
import { extractGuessFromQuestion } from './questionGuess'

describe('extractGuessFromQuestion', () => {
  it('extracts direct person guesses from question-like input', () => {
    expect(extractGuessFromQuestion('他是李白吗？')).toBe('李白')
    expect(extractGuessFromQuestion('是不是秦始皇?')).toBe('秦始皇')
    expect(extractGuessFromQuestion('答案是武则天吗')).toBe('武则天')
    expect(extractGuessFromQuestion('我猜是苏轼')).toBe('苏轼')
  })

  it('does not treat category questions as final guesses', () => {
    expect(extractGuessFromQuestion('他是诗人吗？')).toBeNull()
    expect(extractGuessFromQuestion('他是中国人吗？')).toBeNull()
    expect(extractGuessFromQuestion('他是唐朝人吗？')).toBeNull()
    expect(extractGuessFromQuestion('他生活在唐朝吗？')).toBeNull()
  })
})
