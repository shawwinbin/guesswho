import { View, Text, Input } from '@tarojs/components'
import { useState } from 'react'
import './components.scss'

interface QuestionFormProps {
  onSubmit: (question: string) => void
  disabled?: boolean
  loading?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

export function QuestionForm({ onSubmit, disabled = false, loading = false, suggestions = [], onSuggestionClick }: QuestionFormProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (disabled || loading || !value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <View className="question-form">
      <Text className="question-form__label">快捷提问</Text>
      {suggestions.length > 0 && (
        <View className="suggestions">
          {suggestions.map(suggestion => (
            <View key={suggestion} className="suggestion-chip" onClick={() => onSuggestionClick?.(suggestion)}>
              <Text className="suggestion-chip__spark">✦</Text>
              <Text>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="input-row">
        <Input
          className="question-input"
          value={value}
          placeholder="输入问题，也可问：他是李白吗？"
          disabled={disabled || loading}
          confirmType="send"
          onInput={(e) => setValue(e.detail.value)}
          onConfirm={handleSubmit}
        />
        <View className={`question-submit ${disabled || loading || !value.trim() ? 'is-disabled' : ''}`} onClick={handleSubmit}>
          <Text className="question-submit__icon">{loading ? '…' : '➤'}</Text>
        </View>
      </View>
    </View>
  )
}
