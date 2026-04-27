import { View, Text } from '@tarojs/components'
import './components.scss'

interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text = '加载中...' }: LoadingSpinnerProps) {
  return (
    <View className="loading-spinner">
      <View className="loading-spinner__icon" />
      <Text className="loading-text">{text}</Text>
    </View>
  )
}
