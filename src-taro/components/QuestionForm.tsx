import { View } from '@tarojs/components'
import { Input, Button } from '@nutui/nutui-react-taro'
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
    if (value.trim()) { onSubmit(value.trim()); setValue('') }
  }
  return (
    <View className="question-form">
      {suggestions.length > 0 && (
        <View className="suggestions">
          {suggestions.map(s => (
            <View key={s} className="suggestion-chip" onClick={() => onSuggestionClick?.(s)}>
              <text>{s}</text>
            </View>
          ))}
        </View>
      )}
      <View className="input-row">
        <Input className="question-input" value={value} placeholder="输入你的问题..." disabled={disabled || loading} onChange={(val) => setValue(val)} />
        <Button type="primary" size="small" disabled={disabled || loading || !value.trim()} onClick={handleSubmit}>{loading ? '...' : '提问'}</Button>
      </View>
    </View>
  )
}