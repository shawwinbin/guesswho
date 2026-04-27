import { View, Text, Input } from '@tarojs/components'
import { useState } from 'react'
import './components.scss'

interface QuestionFormProps {
  onSubmit: (question: string) => void
  disabled?: boolean
  loading?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
  onAiHintClick?: () => void
  aiHintDisabled?: boolean
  remainingHints?: number
  onVoiceClick?: () => void
  voiceDisabled?: boolean
  voiceActive?: boolean
}

export function QuestionForm({
  onSubmit,
  disabled = false,
  loading = false,
  suggestions = [],
  onSuggestionClick,
  onAiHintClick,
  aiHintDisabled = false,
  remainingHints = 0,
  onVoiceClick,
  voiceDisabled = false,
  voiceActive = false,
}: QuestionFormProps) {
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
        <View
          className={`question-side-action question-side-action--hint ${aiHintDisabled ? 'is-disabled' : ''}`}
          onClick={() => {
            if (aiHintDisabled) return
            onAiHintClick?.()
          }}
        >
          <Text className="question-side-action__main">AI</Text>
          <Text className="question-side-action__sub">提示{remainingHints}</Text>
        </View>
        <View
          className={`question-side-action question-side-action--voice ${voiceActive ? 'is-active' : ''} ${voiceDisabled ? 'is-disabled' : ''}`}
          onClick={() => {
            if (voiceDisabled) return
            onVoiceClick?.()
          }}
        >
          <Text className="question-side-action__main">{voiceActive ? '■' : '🎤'}</Text>
        </View>
        <View className={`question-submit ${disabled || loading || !value.trim() ? 'is-disabled' : ''}`} onClick={handleSubmit}>
          <Text className="question-submit__icon">{loading ? '…' : '➤'}</Text>
        </View>
      </View>
    </View>
  )
}
