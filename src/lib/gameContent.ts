import type { FigureScope } from './types'

export const SUGGESTED_QUESTIONS = [
  '他是中国人吗？',
  '他是古代人物吗？',
  '他是男性吗？',
  '他是皇帝吗？',
  '他是诗人吗？',
  '他是军事人物吗？',
] as const

export const FIGURE_SCOPE_OPTIONS: Array<{ value: FigureScope; label: string }> = [
  { value: 'all', label: '全部历史人物' },
  { value: 'poet', label: '仅诗人' },
  { value: 'emperor', label: '仅皇帝' },
  { value: 'military', label: '仅军事人物' },
  { value: 'philosopher', label: '仅思想家' },
  { value: 'female', label: '仅女性人物' },
  { value: 'tang-song', label: '仅唐宋人物' },
]

const FIGURE_SCOPE_LABELS: Record<FigureScope, string> = {
  all: '全部历史人物',
  poet: '仅诗人',
  emperor: '仅皇帝',
  military: '仅军事人物',
  philosopher: '仅思想家',
  female: '仅女性人物',
  'tang-song': '仅唐宋人物',
}

export function getFigureScopeLabel(scope: FigureScope): string {
  return FIGURE_SCOPE_LABELS[scope]
}
