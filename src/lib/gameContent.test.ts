import { describe, expect, it } from 'vitest'
import { FIGURE_SCOPE_OPTIONS, SUGGESTED_QUESTIONS, getFigureScopeLabel } from './gameContent'

describe('gameContent', () => {
  it('returns the expected label for each figure scope', () => {
    expect(getFigureScopeLabel('all')).toBe('全部历史人物')
    expect(getFigureScopeLabel('poet')).toBe('仅诗人')
    expect(getFigureScopeLabel('emperor')).toBe('仅皇帝')
    expect(getFigureScopeLabel('military')).toBe('仅军事人物')
    expect(getFigureScopeLabel('philosopher')).toBe('仅思想家')
    expect(getFigureScopeLabel('female')).toBe('仅女性人物')
    expect(getFigureScopeLabel('tang-song')).toBe('仅唐宋人物')
  })

  it('defines the expected figure scope options for the settings panel', () => {
    expect(FIGURE_SCOPE_OPTIONS).toEqual([
      { value: 'all', label: '全部历史人物' },
      { value: 'poet', label: '仅诗人' },
      { value: 'emperor', label: '仅皇帝' },
      { value: 'military', label: '仅军事人物' },
      { value: 'philosopher', label: '仅思想家' },
      { value: 'female', label: '仅女性人物' },
      { value: 'tang-song', label: '仅唐宋人物' },
    ])
  })

  it('keeps the default suggested question set stable', () => {
    expect(SUGGESTED_QUESTIONS).toEqual([
      '他是中国人吗？',
      '他是古代人物吗？',
      '他是男性吗？',
      '他是皇帝吗？',
      '他是诗人吗？',
      '他是军事人物吗？',
    ])
  })
})
