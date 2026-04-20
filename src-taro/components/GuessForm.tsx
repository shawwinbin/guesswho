import { View } from '@tarojs/components'
import { Input, Button } from '@nutui/nutui-react-taro'
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
    if (value.trim()) { onSubmit(value.trim()); setValue('') }
  }
  return (
    <View className="guess-form">
      <View className="input-row">
        <Input className="guess-input" value={value} placeholder="输入你猜测的人物名字..." disabled={disabled || loading} onChange={(val) => setValue(val)} />
        <Button type="success" size="small" disabled={disabled || loading || !value.trim()} onClick={handleSubmit}>{loading ? '...' : '最终猜测'}</Button>
      </View>
    </View>
  )
}