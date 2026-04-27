import { View, Text, Input } from '@tarojs/components'
import { useState } from 'react'
import './components.scss'

interface GuessFormProps {
  onSubmit: (guess: string) => void
  disabled?: boolean
  loading?: boolean
}

export function GuessForm({ onSubmit, disabled = false, loading = false }: GuessFormProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (disabled || loading || !value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <View className="guess-form">
      <Text className="guess-form__label">直接猜答案</Text>
      <Text className="guess-form__sub">Final Guess</Text>
      <View className="input-row">
        <Input
          className="guess-input"
          value={value}
          placeholder="输入你猜测的人物名字"
          disabled={disabled || loading}
          onInput={(e) => setValue(e.detail.value)}
          onConfirm={handleSubmit}
        />
        <View className={`guess-submit ${disabled || loading || !value.trim() ? 'is-disabled' : ''}`} onClick={handleSubmit}>
          <Text className="guess-submit__text">{loading ? '...' : 'Final Guess'}</Text>
        </View>
      </View>
    </View>
  )
}
