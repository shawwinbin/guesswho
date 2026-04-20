import { View, Text } from '@tarojs/components'
import { Loading } from '@nutui/nutui-react-taro'
import './components.scss'

interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text = '加载中...' }: LoadingSpinnerProps) {
  return (
    <View className="loading-spinner">
      <Loading />
      <Text className="loading-text">{text}</Text>
    </View>
  )
}